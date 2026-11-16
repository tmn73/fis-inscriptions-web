"use client";

import React, {useState} from "react";
import {AlertTriangle, CheckCircle2, Loader2, CircleAlert} from "lucide-react";
import {useTranslations} from "next-intl";
import {Button} from "@/components/ui/button";
import type {Inscription} from "@/app/types";
import {usePermissionToEdit} from "./usePermissionToEdit";
import {useFisChanges} from "./useFisChanges";
import {UpdateEventDataModal} from "./UpdateEventDataModal";
import {ChangeGroupList} from "./ChangeGroupList";
import {useDiffPresentationLabels} from "./useDiffPresentationLabels";
import {groupDifferences} from "@/app/lib/eventDataDiffPresentation";

// The banner stays short: the full list is one click away in the update modal.
const MAX_LISTED_GROUPS = 4;

interface FisChangesBannerProps {
  inscription: Inscription;
}

// Warns administrators, as soon as an inscription is opened, that the FIS calendar differs from the stored data.
export const FisChangesBanner = ({inscription}: FisChangesBannerProps) => {
  const t = useTranslations("inscriptionDetail.fisChanges");
  const tModal = useTranslations("modals.updateEvent");
  const canUpdate = usePermissionToEdit(inscription, "actionsBtn", null);
  const {changes, status} = useFisChanges(inscription, canUpdate);
  const presentationLabels = useDiffPresentationLabels();
  const [modalOpen, setModalOpen] = useState(false);

  if (!canUpdate || status === "off") return null;

  // A discreet line so that "up to date" can be told apart from "check failed".
  if (status !== "checked" || changes.length === 0) {
    const line = {
      loading: {icon: <Loader2 className="h-4 w-4 animate-spin" />, text: t("checking"), color: "text-gray-500"},
      error: {icon: <CircleAlert className="h-4 w-4" />, text: t("checkFailed"), color: "text-orange-700"},
      checked: {icon: <CheckCircle2 className="h-4 w-4" />, text: t("upToDate"), color: "text-green-700"},
    }[status];
    return (
      <p role="status" className={`mt-3 flex items-center gap-2 text-sm ${line.color}`}>
        {line.icon}
        <span>{line.text}</span>
      </p>
    );
  }

  const groups = groupDifferences(changes, presentationLabels);
  const listed = groups.slice(0, MAX_LISTED_GROUPS);
  const hidden = groups
    .slice(MAX_LISTED_GROUPS)
    .reduce((total, group) => total + group.changes.length, 0);

  return (
    <>
      <div
        role="alert"
        className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
      >
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">{t("title")}</h3>
            <p className="text-sm text-yellow-700 mt-1">
              {t("description", {count: changes.length})}
            </p>
            <div className="mt-3">
              <ChangeGroupList groups={listed} linkLabel={tModal("groups.viewOnFis")} />
            </div>
            {hidden > 0 && (
              <p className="mt-1 text-sm text-yellow-700">
                {t("andMore", {count: hidden})}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 cursor-pointer"
              onClick={() => setModalOpen(true)}
            >
              {t("review")}
            </Button>
          </div>
        </div>
      </div>
      <UpdateEventDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        inscription={inscription}
      />
    </>
  );
};
