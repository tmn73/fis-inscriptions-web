import {describe, it, expect} from "vitest";
import {compareRacesChronologically, sortRacesChronologically} from "@/app/lib/raceOrder";

describe("sortRacesChronologically", () => {
  // Situation seen after a FIS update: dates moved, so the codex order is no longer the date order.
  const afterUpdate = [
    {codex: 5446, date: "2026-11-19"},
    {codex: 5449, date: "2026-11-18"},
    {codex: 5455, date: "2026-11-21"},
    {codex: 5459, date: "2026-11-20"},
  ];

  it("orders by date even when the codex order says otherwise", () => {
    expect(sortRacesChronologically(afterUpdate).map((r) => r.codex)).toEqual([5449, 5446, 5459, 5455]);
  });

  it("breaks ties on the same day by codex", () => {
    const sameDay = [
      {codex: 462, date: "2026-11-21"},
      {codex: 5455, date: "2026-11-21"},
      {codex: 459, date: "2026-11-21"},
    ];
    expect(sortRacesChronologically(sameDay).map((r) => r.codex)).toEqual([459, 462, 5455]);
  });

  it("puts races without a valid date last, in codex order", () => {
    const mixed = [
      {codex: 3, date: null},
      {codex: 2, date: "2026-11-20"},
      {codex: 1, date: "not a date"},
      {codex: 4, date: undefined},
      {codex: 5, date: "2026-11-18T10:00:00"},
    ];
    expect(sortRacesChronologically(mixed).map((r) => r.codex)).toEqual([5, 2, 1, 3, 4]);
  });

  it("returns a sorted copy and never changes the list it receives", () => {
    const original = [...afterUpdate];
    const sorted = sortRacesChronologically(original);
    expect(original).toEqual(afterUpdate);
    expect(sorted).not.toBe(original);
  });

  it("compares two races consistently", () => {
    expect(compareRacesChronologically({codex: 2, date: "2026-11-18"}, {codex: 1, date: "2026-11-19"})).toBeLessThan(0);
    expect(compareRacesChronologically({codex: 1, date: "2026-11-19"}, {codex: 1, date: "2026-11-19"})).toBe(0);
  });
});
