import {Competition} from "@/app/types";

export const CONTINENTAL_CUP_CODES = ["EC", "FEC", "SAC", "NAC", "ANC"];

/**
 * Returns the number of days before the race that the inscription deadline falls.
 * - Continental cups (EC, FEC, SAC, NAC, ANC): J-8
 * - All other events: J-3
 */
export function getDeadlineDays(eventData: Competition): number {
  const codes = eventData.categoryCodes ?? [];
  return getDeadlineDaysFromCodes(codes);
}

export function getDeadlineDaysFromCodes(categoryCodes: string[]): number {
  const isContinentalCup = categoryCodes.some((code) =>
    CONTINENTAL_CUP_CODES.includes(code)
  );
  return isContinentalCup ? 8 : 3;
}
