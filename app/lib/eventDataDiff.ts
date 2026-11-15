import type {Competition, CompetitionItem} from "@/app/types";

export type EventDataDifference = {
  field: string;
  oldValue: string;
  newValue: string;
  // true when the change matters for registrations (dates, place, cancellation, races, entry email...).
  important: boolean;
};

export type EventDataDiffLabels = {
  notDefined: string;
  yes: string;
  no: string;
  na: string;
  newCompetition: string;
  deletedCompetition: string;
};

// Fields whose change should alert the user. Everything else (live results, published results, PDF flags,
// jury...) is still listed in the update modal but never triggers the automatic warning.
const IMPORTANT_EVENT_FIELDS = new Set<string>([
  "name",
  "place",
  "placeNationCode",
  "disciplineCode",
  "startDate",
  "endDate",
  "comment",
  "categoryCodes",
  "eventCodes",
  "genderCodes",
  "isCancelled",
]);
const IMPORTANT_CONTACT_FIELDS = new Set<string>(["emailEntries", "emailGeneral"]);
const IMPORTANT_COMPETITION_FIELDS = new Set<string>([
  "date",
  "times",
  "timeZone",
  "codex",
  "status",
  "categoryCode",
  "genderCode",
  "eventCode",
  "place",
  "comment",
  "isCancelled",
]);
const IMPORTANT_SCHEDULE_FIELDS = new Set<string>(["startTime", "status"]);

// Training ("TRA") races are never stored on an inscription.
export const filterOutTRA = (eventData: Competition): Competition => ({
  ...eventData,
  competitions: Array.isArray(eventData.competitions)
    ? eventData.competitions.filter((comp) => comp.categoryCode !== "TRA")
    : [],
  categoryCodes: Array.isArray(eventData.categoryCodes)
    ? eventData.categoryCodes.filter((code) => code !== "TRA")
    : [],
});

const isDifferent = (oldVal: unknown, newVal: unknown): boolean => {
  if (oldVal === newVal) return false;
  if (typeof oldVal !== typeof newVal) return true;
  if (
    typeof oldVal === "object" &&
    oldVal !== null &&
    typeof newVal === "object" &&
    newVal !== null
  ) {
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  }
  return oldVal !== newVal;
};

const EVENT_FIELDS: (keyof Competition)[] = [
  "id",
  "name",
  "organiserNationCode",
  "place",
  "placeNationCode",
  "disciplineCode",
  "seasonCode",
  "startDate",
  "endDate",
  "timeZone",
  "comment",
  "categoryCodes",
  "eventCodes",
  "genderCodes",
  "hasResultsOrStartList",
  "hasPdfs",
  "isCancelled",
  "hasMedals",
  "hasChanges",
  "hasPastLiveResults",
  "hasLiveResults",
  "hasLiveVideo",
  "hasLiveGps",
  "hasActiveLiveResults",
  "hasActiveLiveVideo",
  "hasActiveLiveGps",
  "hasActivePreLiveResults",
];

const CONTACT_FIELDS = [
  "line1",
  "line2",
  "line4",
  "phone",
  "emailGeneral",
  "emailEntries",
  "website",
] as const;

const COMPETITION_FIELDS: (keyof CompetitionItem)[] = [
  "id",
  "eventId",
  "place",
  "placeNationCode",
  "seasonCode",
  "date",
  "times",
  "timeZone",
  "codex",
  "displayCodex",
  "status",
  "categoryCode",
  "categoryDescription",
  "eventCode",
  "eventDescription",
  "eventDescriptionWithGender",
  "genderCode",
  "comment",
  "hasResults",
  "hasStartList",
  "resultsOrStartListModifiedAt",
  "hasPdfs",
  "hasChanges",
  "isCancelled",
  "unitName",
  "isValidForFisPoints",
  "appliedPenalty",
  "isOfficial",
  "hasMedals",
  "hasPastLiveResults",
  "hasLiveResults",
  "hasLiveVideo",
  "hasLiveGps",
  "hasActiveLiveResults",
  "hasActiveLiveVideo",
  "hasActiveLiveGps",
  "hasActivePreLiveResults",
  "liveResultsStatus",
  "liveResultsInformation",
  "liveResultsUrl",
];

const JURY_FIELDS = [
  "function",
  "displayFunction",
  "lastName",
  "firstName",
  "nationCode",
  "id",
] as const;

const SCHEDULE_FIELDS = ["displayOrder", "startTime", "unitName", "status"] as const;

// Differences between the event data stored on an inscription and the latest data from the FIS.
export const computeEventDataDifferences = (
  stored: Competition,
  fetched: Competition,
  labels: EventDataDiffLabels
): EventDataDifference[] => {
  const diffs: EventDataDifference[] = [];

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return labels.notDefined;
    if (typeof value === "boolean") return value ? labels.yes : labels.no;
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const push = (
    field: string,
    oldValue: unknown,
    newValue: unknown,
    important: boolean
  ) => {
    diffs.push({
      field,
      oldValue: formatValue(oldValue),
      newValue: formatValue(newValue),
      important,
    });
  };

  EVENT_FIELDS.forEach((field) => {
    if (isDifferent(stored[field], fetched[field])) {
      push(String(field), stored[field], fetched[field], IMPORTANT_EVENT_FIELDS.has(String(field)));
    }
  });

  if (stored.contactInformation || fetched.contactInformation) {
    CONTACT_FIELDS.forEach((field) => {
      const oldValue = stored.contactInformation?.[field];
      const newValue = fetched.contactInformation?.[field];
      if (isDifferent(oldValue, newValue)) {
        push(`Contact - ${field}`, oldValue, newValue, IMPORTANT_CONTACT_FIELDS.has(field));
      }
    });
  }

  if (stored.competitions && fetched.competitions) {
    const oldComps = new Map(stored.competitions.map((comp) => [comp.id, comp]));
    const newComps = new Map(fetched.competitions.map((comp) => [comp.id, comp]));

    oldComps.forEach((oldComp, compId) => {
      const newComp = newComps.get(compId);
      if (!newComp) return;

      COMPETITION_FIELDS.forEach((field) => {
        if (isDifferent(oldComp[field], newComp[field])) {
          push(
            `Competition ${compId} (${oldComp.eventDescription}) - ${String(field)}`,
            oldComp[field],
            newComp[field],
            IMPORTANT_COMPETITION_FIELDS.has(String(field))
          );
        }
      });

      if (oldComp.jury || newComp.jury) {
        const juryKey = (j: {function: string; lastName: string; firstName: string}) =>
          j.function + j.lastName + j.firstName;
        const oldJury = new Map(oldComp.jury?.map((j) => [juryKey(j), j]) || []);
        const newJury = new Map(newComp.jury?.map((j) => [juryKey(j), j]) || []);
        oldJury.forEach((oldMember, key) => {
          const newMember = newJury.get(key);
          if (!newMember) return;
          JURY_FIELDS.forEach((field) => {
            if (isDifferent(oldMember[field], newMember[field])) {
              push(
                `Competition ${compId} - Jury ${oldMember.function} - ${field}`,
                oldMember[field],
                newMember[field],
                false
              );
            }
          });
        });
      }

      if (oldComp.schedule || newComp.schedule) {
        oldComp.schedule?.forEach((oldSchedule, index) => {
          const newSchedule = newComp.schedule?.[index];
          if (!newSchedule) return;
          SCHEDULE_FIELDS.forEach((field) => {
            if (isDifferent(oldSchedule[field], newSchedule[field])) {
              push(
                `Competition ${compId} - Schedule ${oldSchedule.unitName} - ${field}`,
                oldSchedule[field],
                newSchedule[field],
                IMPORTANT_SCHEDULE_FIELDS.has(field)
              );
            }
          });
        });
      }
    });

    newComps.forEach((newComp, compId) => {
      if (!oldComps.has(compId)) {
        push(labels.newCompetition, labels.na, `${newComp.eventDescription} (ID: ${compId})`, true);
      }
    });

    oldComps.forEach((oldComp, compId) => {
      if (!newComps.has(compId)) {
        push(labels.deletedCompetition, `${oldComp.eventDescription} (ID: ${compId})`, labels.na, true);
      }
    });
  }

  return diffs;
};

// Changes worth warning about, with training races ignored on both sides.
export const getImportantEventDataChanges = (
  stored: Competition,
  fetched: Competition,
  labels: EventDataDiffLabels
): EventDataDifference[] =>
  computeEventDataDifferences(filterOutTRA(stored), filterOutTRA(fetched), labels).filter(
    (diff) => diff.important
  );
