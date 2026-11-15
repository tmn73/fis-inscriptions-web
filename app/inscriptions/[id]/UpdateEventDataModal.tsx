"use client";

import React, {useEffect} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Inscription, Competition} from "@/app/types";
import {
  computeEventDataDifferences,
  filterOutTRA,
  type EventDataDifference,
} from "@/app/lib/eventDataDiff";
import {groupByImportance} from "@/app/lib/eventDataDiffPresentation";
import {ChangeGroupList} from "./ChangeGroupList";
import {useDiffPresentationLabels} from "./useDiffPresentationLabels";
import {useCompetitionByCodex} from "@/app/fisApi"; // Assuming this hook exists and works as in InscriptionForm
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Loader2} from "lucide-react";
import {useTranslations} from "next-intl";

interface UpdateEventDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  inscription: Inscription;
}

// // Placeholder for a deep diff function - REMOVED FOR LINTER
// // You might want to use a library like 'deep-object-diff' or write a custom one
// const getAddedDiff = (_original: any, _updated: any) : any => ({});
// const getDeletedDiff = (_original: any, _updated: any) : any => ({});
// const getUpdatedDiff = (_original: any, _updated: any) : any => ({});

export const UpdateEventDataModal = ({
  isOpen,
  onClose,
  inscription,
}: UpdateEventDataModalProps) => {
  const t = useTranslations("modals.updateEvent");
  const tCommon = useTranslations("common");

  const queryClient = useQueryClient();

  // Get the first codex from the competitions array
  const codex = inscription.eventData.competitions?.[0]?.codex;

  const {
    data: fetchedEventDataUntyped,
    isLoading: isLoadingFisData,
    error: fisError,
    refetch: refetchFisData,
  } = useCompetitionByCodex(isOpen && codex ? codex : 0);

  const fetchedEventData = fetchedEventDataUntyped as
    | Competition
    | null
    | undefined;

  useEffect(() => {
    if (isOpen && codex) {
      refetchFisData();
    }
  }, [isOpen, codex, refetchFisData]);

  const differences: EventDataDifference[] =
    fetchedEventData && inscription.eventData
      ? computeEventDataDifferences(inscription.eventData, fetchedEventData, {
          notDefined: t("notDefined"),
          yes: t("yes"),
          no: t("no"),
          na: t("na"),
          newCompetition: t("newCompetition"),
          deletedCompetition: t("deletedCompetition"),
        })
      : [];
  const presentationLabels = useDiffPresentationLabels();
  const {important, other, otherCount} = groupByImportance(differences, presentationLabels);
  const updatedEventData =
    differences.length > 0 ? (fetchedEventData ?? null) : null;

  const updateMutation = useMutation({
    mutationFn: async (newEventData: Competition) => {
      const res = await fetch(
        `/api/inscriptions/${inscription.id}/event-data`,
        {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({eventData: newEventData}),
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || t("updateError")
        );
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate inscription detail
      queryClient.invalidateQueries({
        queryKey: ["inscriptions", inscription.id.toString()],
      });
      // Invalidate all competitors list (displays event data)
      queryClient.invalidateQueries({
        queryKey: ["inscription-competitors-all", inscription.id],
      });
      // Invalidate competitors by codex (partial match)
      queryClient.invalidateQueries({
        queryKey: ["inscription-competitors", inscription.id.toString()],
      });
      onClose();
    },
    onError: (error: Error) => {
      // Handle error (e.g., show a toast notification)
      console.error("Update error:", error);
      alert(`${t("errorPrefix")} ${error.message}`);
    },
  });

  const handleUpdate = () => {
    if (updatedEventData) {
      updateMutation.mutate(filterOutTRA(updatedEventData));
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", {codex})}
          </DialogDescription>
        </DialogHeader>

        {isLoadingFisData && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="ml-2">{t("loading")}</p>
          </div>
        )}

        {fisError && (
          <div className="text-red-500 p-4 bg-red-50 rounded border border-red-200">
            {t("error")}{" "}
            {"message" in fisError ? fisError.message : t("unknownError")}
          </div>
        )}

        {!isLoadingFisData && !fisError && differences.length > 0 && (
          <div className="my-4 p-4 border rounded-md bg-gray-50 max-h-[400px] overflow-y-auto">
            <h3 className="font-semibold mb-3">{t("changesDetected")}</h3>
            {important.length > 0 ? (
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-yellow-700">
                  {t("groups.important")}
                </div>
                <ChangeGroupList groups={important} linkLabel={t("groups.viewOnFis")} />
              </div>
            ) : (
              <p className="text-sm text-slate-600">{t("groups.noImportant")}</p>
            )}
            {otherCount > 0 && (
              <details className="mt-3 bg-white p-3 rounded shadow-sm">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">
                  {t("groups.other", {count: otherCount})}
                </summary>
                <div className="mt-3">
                  <ChangeGroupList groups={other} linkLabel={t("groups.viewOnFis")} />
                </div>
              </details>
            )}
          </div>
        )}

        {!isLoadingFisData &&
          !fisError &&
          differences.length === 0 &&
          fetchedEventData && (
            <p className="my-4 text-green-600">
              {t("noDifferences")}
            </p>
          )}

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={
              isLoadingFisData ||
              updateMutation.isPending ||
              !updatedEventData ||
              differences.length === 0
            }
            className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t("applyChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
