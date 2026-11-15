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
    expect(screen.getByText("startDate")).toBeTruthy();
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

  it("lists at most 5 changes and counts the others", () => {
    state.fisData = eventData({
      name: "X",
      place: "X",
      startDate: "2099-01-02",
      endDate: "2099-01-03",
      comment: "x",
      isCancelled: true,
      categoryCodes: ["NJR", "FIS"],
    });
    renderBanner(eventData());
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText(/\+ 2 autres modifications/)).toBeTruthy();
  });
});
