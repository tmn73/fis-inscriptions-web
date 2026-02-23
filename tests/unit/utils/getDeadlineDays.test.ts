import {describe, it, expect} from "vitest";
import {
  getDeadlineDays,
  getDeadlineDaysFromCodes,
  J8_DEADLINE_CODES,
} from "@/app/lib/getDeadlineDays";
import {Competition} from "@/app/types";

const makeEventData = (categoryCodes: string[]): Competition =>
  ({categoryCodes} as unknown as Competition);

describe("getDeadlineDays", () => {
  describe("standard events (J-3)", () => {
    it("should return 3 for World Cup (WC)", () => {
      expect(getDeadlineDays(makeEventData(["WC"]))).toBe(3);
    });

    it("should return 3 for Olympic Winter Games (OWG)", () => {
      expect(getDeadlineDays(makeEventData(["OWG"]))).toBe(3);
    });

    it("should return 3 for empty categoryCodes", () => {
      expect(getDeadlineDays(makeEventData([]))).toBe(3);
    });

    it("should return 3 when categoryCodes is undefined", () => {
      expect(getDeadlineDays({} as unknown as Competition)).toBe(3);
    });
  });

  describe("continental cups and NC (J-8)", () => {
    it.each(J8_DEADLINE_CODES)(
      "should return 8 for %s",
      (code) => {
        expect(getDeadlineDays(makeEventData([code]))).toBe(8);
      }
    );

    it("should return 8 for NC (national championship)", () => {
      expect(getDeadlineDays(makeEventData(["NC"]))).toBe(8);
    });

    it("should return 8 when event has mixed codes including a continental cup", () => {
      expect(getDeadlineDays(makeEventData(["WC", "EC"]))).toBe(8);
    });

    it("should return 8 when event has multiple continental cup codes", () => {
      expect(getDeadlineDays(makeEventData(["FEC", "NAC"]))).toBe(8);
    });
  });

  describe("getDeadlineDaysFromCodes", () => {
    it("should return 3 for non-continental codes", () => {
      expect(getDeadlineDaysFromCodes(["WC", "WSC"])).toBe(3);
    });

    it("should return 8 for continental codes", () => {
      expect(getDeadlineDaysFromCodes(["SAC"])).toBe(8);
    });

    it("should return 3 for empty array", () => {
      expect(getDeadlineDaysFromCodes([])).toBe(3);
    });
  });

  describe("J8_DEADLINE_CODES constant", () => {
    it("should contain all 6 J-8 deadline codes", () => {
      expect(J8_DEADLINE_CODES).toEqual(
        expect.arrayContaining(["EC", "FEC", "SAC", "NAC", "ANC", "NC"])
      );
      expect(J8_DEADLINE_CODES).toHaveLength(6);
    });
  });
});
