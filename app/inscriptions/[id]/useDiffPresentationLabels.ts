import {useMemo} from "react";
import {useTranslations} from "next-intl";
import type {PresentationLabels} from "@/app/lib/eventDataDiffPresentation";

// Readable names for the FIS fields, shared by the warning banner and the update modal.
export const useDiffPresentationLabels = (): PresentationLabels => {
  const t = useTranslations("modals.updateEvent");
  return useMemo(
    () => ({
      // A field without a translation is shown under its raw name rather than hidden.
      fieldLabel: (key: string) => {
        const path = `fields.${key}` as Parameters<typeof t>[0];
        return t.has(path) ? t(path) : key;
      },
      eventTitle: t("groups.event"),
      contactTitle: t("groups.contact"),
      codexLabel: (codex: string) => t("groups.codex", {codex}),
    }),
    [t]
  );
};
