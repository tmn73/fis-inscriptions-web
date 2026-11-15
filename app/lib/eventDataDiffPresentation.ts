import type {EventDataDifference} from "@/app/lib/eventDataDiff";

export type PresentedChange = {
  key: string;
  label: string;
  oldValue: string;
  newValue: string;
};

export type ChangeGroup = {
  id: string;
  title: string;
  subtitle?: string;
  // Matching page on the official FIS site, to check the change at the source.
  href?: string;
  changes: PresentedChange[];
};

export type PresentationLabels = {
  // Readable name of a raw field; must fall back to the raw key when there is no translation.
  fieldLabel: (key: string) => string;
  eventTitle: string;
  contactTitle: string;
  codexLabel: (codex: string) => string;
};

const DATE_KEYS = new Set(["startDate", "endDate", "date"]);
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

// Dates arrive from the FIS as yyyy-MM-dd; they are shown as dd/MM/yyyy.
export const formatChangeValue = (key: string, value: string): string => {
  if (!DATE_KEYS.has(key)) return value;
  const match = value.match(ISO_DATE);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

// Groups flat differences by origin: the event first, then its contact, then each race with its name and codex.
export const groupDifferences = (
  diffs: EventDataDifference[],
  labels: PresentationLabels
): ChangeGroup[] => {
  const groups = new Map<string, ChangeGroup>();

  const groupFor = (diff: EventDataDifference): ChangeGroup => {
    const {scope} = diff;
    const id = scope.kind === "competition" ? `competition-${scope.id}` : scope.kind;
    let group = groups.get(id);
    if (!group) {
      group =
        scope.kind === "competition"
          ? {id, title: scope.label, subtitle: labels.codexLabel(scope.codex), href: scope.url, changes: []}
          : {
              id,
              title: scope.kind === "contact" ? labels.contactTitle : labels.eventTitle,
              href: scope.kind === "event" ? scope.url : undefined,
              changes: [],
            };
      groups.set(id, group);
    }
    return group;
  };

  diffs.forEach((diff) => {
    groupFor(diff).changes.push({
      key: diff.key,
      label: labels.fieldLabel(diff.key),
      oldValue: formatChangeValue(diff.key, diff.oldValue),
      newValue: formatChangeValue(diff.key, diff.newValue),
    });
  });

  const rank = (group: ChangeGroup) =>
    group.id === "event" ? 0 : group.id === "contact" ? 1 : 2;
  return [...groups.values()].sort((a, b) => rank(a) - rank(b));
};

// Important changes and secondary ones (live results, PDF flags, jury...) are listed apart.
export const groupByImportance = (
  diffs: EventDataDifference[],
  labels: PresentationLabels
): {important: ChangeGroup[]; other: ChangeGroup[]; otherCount: number} => {
  const other = diffs.filter((diff) => !diff.important);
  return {
    important: groupDifferences(
      diffs.filter((diff) => diff.important),
      labels
    ),
    other: groupDifferences(other, labels),
    otherCount: other.length,
  };
};
