import {describe, it, expect} from "vitest";
import {
  getDeadlineDays,
  getDeadlineDaysFromCodes,
  CONTINENTAL_CUP_CODES,
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

  describe("continental cups (J-8)", () => {
    it.each(CONTINENTAL_CUP_CODES)(
      "should return 8 for %s (continental cup)",
      (code) => {
        expect(getDeadlineDays(makeEventData([code]))).toBe(8);
      }
    );

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

  describe("CONTINENTAL_CUP_CODES constant", () => {
    it("should contain all 5 continental cup codes", () => {
      expect(CONTINENTAL_CUP_CODES).toEqual(
        expect.arrayContaining(["EC", "FEC", "SAC", "NAC", "ANC"])
      );
      expect(CONTINENTAL_CUP_CODES).toHaveLength(5);
    });
  });
});
