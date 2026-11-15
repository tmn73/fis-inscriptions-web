"use client";

import React, {useState} from "react";
import {AlertTriangle} from "lucide-react";
import {useTranslations} from "next-intl";
import {Button} from "@/components/ui/button";
import type {Inscription} from "@/app/types";
import {usePermissionToEdit} from "./usePermissionToEdit";
import {useFisChanges} from "./useFisChanges";
import {UpdateEventDataModal} from "./UpdateEventDataModal";

const MAX_LISTED_CHANGES = 5;

interface FisChangesBannerProps {
  inscription: Inscription;
}

// Warns administrators, as soon as an inscription is opened, that the FIS calendar differs from the stored data.
export const FisChangesBanner = ({inscription}: FisChangesBannerProps) => {
  const t = useTranslations("inscriptionDetail.fisChanges");
  const canUpdate = usePermissionToEdit(inscription, "actionsBtn", null);
  const {changes} = useFisChanges(inscription, canUpdate);
  const [modalOpen, setModalOpen] = useState(false);

  if (!canUpdate || changes.length === 0) return null;

  const listed = changes.slice(0, MAX_LISTED_CHANGES);
  const hidden = changes.length - listed.length;

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
            <ul className="mt-2 space-y-1 text-sm text-yellow-800">
              {listed.map((change) => (
                <li key={`${change.field}-${change.oldValue}-${change.newValue}`}>
                  <span className="font-medium">{change.field}</span> :{" "}
                  <span className="line-through">{change.oldValue}</span>
                  {" → "}
                  <span className="font-semibold">{change.newValue}</span>
                </li>
              ))}
            </ul>
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
