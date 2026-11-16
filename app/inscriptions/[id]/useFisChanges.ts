import {useMemo} from "react";
import {useTranslations} from "next-intl";
import {useCompetitionByCodex} from "@/app/fisApi";
import type {Competition, Inscription} from "@/app/types";
import {
  getImportantEventDataChanges,
  type EventDataDifference,
} from "@/app/lib/eventDataDiff";

// A finished event is no longer worth checking against the FIS calendar.
export const hasEventEnded = (endDate: string | undefined, now: Date = new Date()): boolean => {
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return end.getTime() < startOfToday.getTime();
};

// Compares an inscription with the live FIS calendar as soon as it is opened. Read-only: nothing is saved.
// A FIS error just means "no warning": the manual update button stays available.
// "off": no check (no right to update, no codex, event over). "checked": FIS answered, `changes` may be empty.
export type FisCheckStatus = "off" | "loading" | "error" | "checked";

export const useFisChanges = (
  inscription: Inscription | undefined,
  enabled: boolean
): {changes: EventDataDifference[]; isLoading: boolean; status: FisCheckStatus} => {
  const t = useTranslations("modals.updateEvent");
  const codex = inscription?.eventData?.competitions?.[0]?.codex;
  const shouldCheck =
    enabled && !!inscription && !!codex && !hasEventEnded(inscription.eventData?.endDate);

  const {data, isLoading, isError} = useCompetitionByCodex(codex ?? 0, shouldCheck);
  const fetched = data as Competition | null | undefined;

  const changes = useMemo(() => {
    if (!shouldCheck || !fetched || !inscription?.eventData) return [];
    return getImportantEventDataChanges(inscription.eventData, fetched, {
      notDefined: t("notDefined"),
      yes: t("yes"),
      no: t("no"),
      na: t("na"),
      newCompetition: t("newCompetition"),
      deletedCompetition: t("deletedCompetition"),
    });
  }, [shouldCheck, fetched, inscription, t]);

  const status: FisCheckStatus = !shouldCheck
    ? "off"
    : isLoading
      ? "loading"
      : isError || !fetched
        ? "error"
        : "checked";

  return {changes, isLoading: shouldCheck && isLoading, status};
};
