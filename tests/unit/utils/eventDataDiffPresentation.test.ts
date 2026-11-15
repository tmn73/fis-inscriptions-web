import {describe, it, expect} from "vitest";
import {computeEventDataDifferences} from "@/app/lib/eventDataDiff";
import {
  formatChangeValue,
  groupByImportance,
  groupDifferences,
} from "@/app/lib/eventDataDiffPresentation";
import messages from "@/messages/fr.json";

const diffLabels = {
  notDefined: "Non défini",
  yes: "Oui",
  no: "Non",
  na: "N/A",
  newCompetition: "Nouvelle competition",
  deletedCompetition: "Competition supprimée",
};

const fields = messages.modals.updateEvent.fields as Record<string, unknown>;
const labels = {
  fieldLabel: (key: string) => (typeof fields[key] === "string" ? (fields[key] as string) : key),
  eventTitle: "Événement",
  contactTitle: "Contact de l'événement",
  codexLabel: (codex: string) => `codex ${codex}`,
};

const race = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  codex: 100 + id,
  displayCodex: String(5000 + id),
  eventDescription: "Giant Slalom",
  eventDescriptionWithGender: "Giant Slalom Women",
  categoryCode: "NJR",
  genderCode: "W",
  date: "2026-11-20",
  hasLiveResults: false,
  liveResultsUrl: null,
  comment: null,
  ...overrides,
});

// Shape of the change that was hard to read: dates moved by 1-2 days and a live-results link on every race.
const stored = {
  id: 1,
  startDate: "2026-11-19",
  endDate: "2026-11-22",
  comment: null,
  hasPdfs: false,
  hasChanges: false,
  hasLiveResults: false,
  categoryCodes: ["NJR"],
  competitions: [race(1), race(2)],
} as any;
const fetched = {
  ...stored,
  startDate: "2026-11-18",
  endDate: "2026-11-21",
  comment: "Check changes",
  hasPdfs: true,
  hasChanges: true,
  hasLiveResults: true,
  competitions: [
    race(1, {hasLiveResults: true, liveResultsUrl: "https://live.fis-ski.com/lv-al0456.htm"}),
    race(2, {
      date: "2026-11-18",
      comment: "Replaces: 20.11.2026",
      hasLiveResults: true,
      liveResultsUrl: "https://live.fis-ski.com/lv-al0459.htm",
    }),
  ],
} as any;

describe("formatChangeValue", () => {
  it("shows dates as dd/MM/yyyy and leaves other values alone", () => {
    expect(formatChangeValue("startDate", "2026-11-19")).toBe("19/11/2026");
    expect(formatChangeValue("date", "2026-11-18T00:00:00")).toBe("18/11/2026");
    expect(formatChangeValue("startDate", "Non défini")).toBe("Non défini");
    expect(formatChangeValue("comment", "2026-11-19")).toBe("2026-11-19");
  });
});

describe("groupByImportance", () => {
  const diffs = computeEventDataDifferences(stored, fetched, diffLabels);
  const {important, other, otherCount} = groupByImportance(diffs, labels);

  it("keeps only the changes that matter in the main list, grouped event first then by race", () => {
    expect(important.map((g) => g.title)).toEqual(["Événement", "Giant Slalom Women"]);
    expect(important[0].changes).toEqual([
      {key: "startDate", label: "Date de début", oldValue: "19/11/2026", newValue: "18/11/2026"},
      {key: "endDate", label: "Date de fin", oldValue: "22/11/2026", newValue: "21/11/2026"},
      {key: "comment", label: "Commentaire FIS", oldValue: "Non défini", newValue: "Check changes"},
    ]);
    expect(important[1]).toMatchObject({subtitle: "codex 5002"});
    expect(important[1].changes.map((c) => [c.label, c.oldValue, c.newValue])).toEqual([
      ["Date de la course", "20/11/2026", "18/11/2026"],
      ["Commentaire FIS", "Non défini", "Replaces: 20.11.2026"],
    ]);
  });

  it("puts live-results and PDF noise apart, under readable names", () => {
    const labelsOfOthers = other.flatMap((g) => g.changes.map((c) => c.label));
    expect(otherCount).toBe(labelsOfOthers.length);
    expect(labelsOfOthers).toContain("Documents PDF publiés");
    expect(labelsOfOthers).toContain("Résultats en direct");
    expect(labelsOfOthers).toContain("Lien des résultats en direct");
    // None of the raw technical names leaks into the screen.
    expect(labelsOfOthers.some((l) => /^has[A-Z]|Url$/.test(l))).toBe(false);
  });
});

describe("groupDifferences", () => {
  it("falls back to the raw name for a field without a translation", () => {
    const groups = groupDifferences(
      [
        {
          field: "x",
          key: "someNewFisField",
          scope: {kind: "event"},
          oldValue: "a",
          newValue: "b",
          important: true,
        },
      ],
      labels
    );
    expect(groups[0].changes[0].label).toBe("someNewFisField");
  });
});
