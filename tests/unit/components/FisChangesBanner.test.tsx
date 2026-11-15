import React from "react";
import {render, screen, fireEvent} from "@testing-library/react";
import {vi, describe, it, expect, beforeEach} from "vitest";
import {NextIntlClientProvider} from "next-intl";
import messages from "@/messages/fr.json";
import {FisChangesBanner} from "@/app/inscriptions/[id]/FisChangesBanner";

const state = vi.hoisted(() => ({canUpdate: true, fisData: undefined as any, lastEnabled: undefined as any}));

vi.mock("@/app/inscriptions/[id]/usePermissionToEdit", () => ({
  usePermissionToEdit: () => state.canUpdate,
}));

vi.mock("@/app/fisApi", () => ({
  useCompetitionByCodex: (_codex: number, enabled = true) => {
    state.lastEnabled = enabled;
    return {data: enabled ? state.fisData : undefined, isLoading: false};
  },
}));

vi.mock("@/app/inscriptions/[id]/UpdateEventDataModal", () => ({
  UpdateEventDataModal: ({isOpen}: {isOpen: boolean}) =>
    isOpen ? <div>modal-ouvert</div> : null,
}));

const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
const past = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);

const eventData = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  name: "Suomu",
  place: "Suomu",
  startDate: future,
  endDate: future,
  categoryCodes: ["NJR"],
  genderCodes: ["M"],
  competitions: [{id: 1, codex: 457, eventDescription: "GS", categoryCode: "NJR", date: future}],
  ...overrides,
});

const renderBanner = (inscriptionEventData: any) =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages as any}>
      <FisChangesBanner inscription={{id: 1, eventData: inscriptionEventData} as any} />
    </NextIntlClientProvider>
  );

describe("FisChangesBanner", () => {
  beforeEach(() => {
    state.canUpdate = true;
    state.fisData = undefined;
    state.lastEnabled = undefined;
  });

  it("warns an administrator when the FIS data changed, then opens the update modal", () => {
    state.fisData = eventData({startDate: "2099-01-02"});
    renderBanner(eventData());
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Attention : modifications FIS détectées")).toBeTruthy();
    expect(screen.getByText("Date de début")).toBeTruthy();
    expect(screen.getByText("02/01/2099")).toBeTruthy();
    expect(screen.queryByText("startDate")).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Voir et mettre à jour"}));
    expect(screen.getByText("modal-ouvert")).toBeTruthy();
  });

  it("shows nothing when the FIS data is identical", () => {
    state.fisData = eventData();
    renderBanner(eventData());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not even query the FIS for someone who cannot update", () => {
    state.canUpdate = false;
    state.fisData = eventData({startDate: "2099-01-02"});
    renderBanner(eventData());
    expect(state.lastEnabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not query the FIS once the event is over", () => {
    state.fisData = eventData({startDate: "2099-01-02"});
    renderBanner(eventData({startDate: past, endDate: past}));
    expect(state.lastEnabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("groups changes by race and counts what the short banner leaves out", () => {
    const races = [1, 2, 3, 4, 5, 6].map((id) => ({
      id,
      codex: 400 + id,
      displayCodex: String(400 + id),
      eventDescription: "Slalom",
      eventDescriptionWithGender: `Slalom ${id}`,
      categoryCode: "NJR",
      date: future,
    }));
    state.fisData = eventData({
      competitions: races.map((r) => ({...r, date: "2099-01-01"})),
    });
    renderBanner(eventData({competitions: races}));
    // 6 races changed, but only 4 groups are listed; the other 2 changes are counted.
    expect(screen.getAllByText("Date de la course")).toHaveLength(4);
    expect(screen.getByText("Slalom 1")).toBeTruthy();
    expect(screen.getByText("codex 401")).toBeTruthy();
    expect(screen.getByText(/\+ 2 autres modifications/)).toBeTruthy();
  });
});
