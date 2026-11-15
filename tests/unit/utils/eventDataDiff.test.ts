import {describe, it, expect} from "vitest";
import {
  computeEventDataDifferences,
  getImportantEventDataChanges,
  filterOutTRA,
} from "@/app/lib/eventDataDiff";
import {hasEventEnded} from "@/app/inscriptions/[id]/useFisChanges";

const labels = {
  notDefined: "Non défini",
  yes: "Oui",
  no: "Non",
  na: "N/A",
  newCompetition: "Nouvelle competition",
  deletedCompetition: "Competition supprimée",
};

const race = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  codex: 457,
  eventDescription: "Giant Slalom",
  categoryCode: "NJR",
  genderCode: "M",
  date: "2026-11-19",
  isCancelled: false,
  ...overrides,
});

const event = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 10,
    name: "Suomu",
    place: "Suomu",
    startDate: "2026-11-19",
    endDate: "2026-11-20",
    categoryCodes: ["NJR"],
    genderCodes: ["M"],
    isCancelled: false,
    hasLiveResults: false,
    contactInformation: {emailEntries: "entries@example.com"},
    competitions: [race()],
    ...overrides,
  }) as any;

describe("computeEventDataDifferences", () => {
  it("finds nothing when the data is identical", () => {
    expect(computeEventDataDifferences(event(), event(), labels)).toEqual([]);
  });

  it("flags a date change as important and a live-results flag as not important", () => {
    const diffs = computeEventDataDifferences(
      event(),
      event({startDate: "2026-11-21", hasLiveResults: true}),
      labels
    );
    expect(diffs.find((d) => d.field === "startDate")).toMatchObject({
      oldValue: "2026-11-19",
      newValue: "2026-11-21",
      important: true,
    });
    expect(diffs.find((d) => d.field === "hasLiveResults")).toMatchObject({
      oldValue: "Non",
      newValue: "Oui",
      important: false,
    });
  });

  it("reports added and removed races as important", () => {
    const added = computeEventDataDifferences(
      event(),
      event({competitions: [race(), race({id: 2, eventDescription: "Slalom"})]}),
      labels
    );
    expect(added).toContainEqual({
      field: "Nouvelle competition",
      oldValue: "N/A",
      newValue: "Slalom (ID: 2)",
      important: true,
    });
    const removed = computeEventDataDifferences(event(), event({competitions: []}), labels);
    expect(removed).toContainEqual({
      field: "Competition supprimée",
      oldValue: "Giant Slalom (ID: 1)",
      newValue: "N/A",
      important: true,
    });
  });
});

describe("getImportantEventDataChanges", () => {
  it("ignores everything that is not important", () => {
    const changes = getImportantEventDataChanges(
      event(),
      event({
        hasLiveResults: true,
        competitions: [
          race({
            jury: [{function: "TD", lastName: "A", firstName: "B", nationCode: "FRA", id: 1}],
            hasResults: true,
          }),
        ],
      }),
      labels
    );
    expect(changes).toEqual([]);
  });

  it("warns when a race is cancelled, moved, or the entry email changes", () => {
    const changes = getImportantEventDataChanges(
      event(),
      event({
        contactInformation: {emailEntries: "new@example.com"},
        competitions: [race({isCancelled: true, date: "2026-11-22"})],
      }),
      labels
    );
    const fields = changes.map((c) => c.field);
    expect(fields).toContain("Contact - emailEntries");
    expect(fields).toContain("Competition 1 (Giant Slalom) - isCancelled");
    expect(fields).toContain("Competition 1 (Giant Slalom) - date");
  });

  it("does not warn about training (TRA) races that are never stored", () => {
    const withTra = event({
      categoryCodes: ["NJR", "TRA"],
      competitions: [race(), race({id: 3, categoryCode: "TRA", eventDescription: "Training"})],
    });
    expect(getImportantEventDataChanges(event(), withTra, labels)).toEqual([]);
    expect(getImportantEventDataChanges(withTra, event(), labels)).toEqual([]);
  });
});

describe("filterOutTRA", () => {
  it("removes TRA races and categories", () => {
    const filtered = filterOutTRA(
      event({categoryCodes: ["NJR", "TRA"], competitions: [race(), race({id: 3, categoryCode: "TRA"})]})
    );
    expect(filtered.categoryCodes).toEqual(["NJR"]);
    expect(filtered.competitions.map((c) => c.id)).toEqual([1]);
  });
});

describe("hasEventEnded", () => {
  const now = new Date("2026-11-20T10:00:00");
  it("is false while the event is running or upcoming, or when there is no date", () => {
    expect(hasEventEnded("2026-11-20", now)).toBe(false);
    expect(hasEventEnded("2026-11-25", now)).toBe(false);
    expect(hasEventEnded(undefined, now)).toBe(false);
    expect(hasEventEnded("not a date", now)).toBe(false);
  });
  it("is true once the last day has passed", () => {
    expect(hasEventEnded("2026-11-19", now)).toBe(true);
  });
});
