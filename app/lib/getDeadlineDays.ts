import {Competition} from "@/app/types";

export const J8_DEADLINE_CODES = ["EC", "FEC", "SAC", "NAC", "ANC", "NC"];

/**
 * Returns the number of days before the race that the inscription deadline falls.
 * - Continental cups (EC, FEC, SAC, NAC, ANC) and NC: J-8
 * - All other events: J-3
 */
export function getDeadlineDays(eventData: Competition): number {
  const codes = eventData.categoryCodes ?? [];
  return getDeadlineDaysFromCodes(codes);
}

export function getDeadlineDaysFromCodes(categoryCodes: string[]): number {
  const hasJ8Code = categoryCodes.some((code) =>
    J8_DEADLINE_CODES.includes(code)
  );
  return hasJ8Code ? 8 : 3;
}
