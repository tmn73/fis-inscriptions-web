"use client";

import React, {useState, useEffect} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Inscription, Competition, CompetitionItem} from "@/app/types";
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

// Fonction utilitaire pour filtrer les compétitions et catégories 'TRA'
const filterOutTRA = (eventData: Competition): Competition => {
  return {
    ...eventData,
    competitions: Array.isArray(eventData.competitions)
      ? eventData.competitions.filter((comp) => comp.categoryCode !== "TRA")
      : [],
    categoryCodes: Array.isArray(eventData.categoryCodes)
      ? eventData.categoryCodes.filter((code) => code !== "TRA")
      : [],
  };
};

export const UpdateEventDataModal = ({
  isOpen,
  onClose,
  inscription,
}: UpdateEventDataModalProps) => {
  const t = useTranslations("modals.updateEvent");
  const tCommon = useTranslations("common");

  const queryClient = useQueryClient();
  const [differences, setDifferences] = useState<
    {
      field: string;
      oldValue: string;
      newValue: string;
    }[]
  >([]);
  const [updatedEventData, setUpdatedEventData] = useState<Competition | null>(
    null
  );

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

  // Function to compare two values and format them for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return t("notDefined");
    if (typeof value === "boolean") return value ? t("yes") : t("no");
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  // Function to check if two values are different
  const isDifferent = (oldVal: unknown, newVal: unknown): boolean => {
    if (oldVal === newVal) return false;
    if (typeof oldVal !== typeof newVal) return true;
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      return JSON.stringify(oldVal) !== JSON.stringify(newVal);
    }
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

  useEffect(() => {
    if (fetchedEventData && inscription.eventData) {
      const diffs: {field: string; oldValue: string; newValue: string}[] = [];

      // Liste complète des champs à comparer
      const fieldsToCompare: (keyof Competition)[] = [
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

      // Comparer les champs principaux
      fieldsToCompare.forEach((field) => {
        const oldValue = inscription.eventData[field];
        const newValue = fetchedEventData[field];

        if (isDifferent(oldValue, newValue)) {
          diffs.push({
            field: String(field),
            oldValue: formatValue(oldValue),
            newValue: formatValue(newValue),
          });
        }
      });

      // Comparer les informations de contact si elles existent
      if (
        inscription.eventData.contactInformation ||
        fetchedEventData.contactInformation
      ) {
        const contactFields = [
          "line1",
          "line2",
          "line4",
          "phone",
          "emailGeneral",
          "emailEntries",
          "website",
        ] as const;

        contactFields.forEach((field) => {
          const oldValue = inscription.eventData.contactInformation?.[field];
          const newValue = fetchedEventData.contactInformation?.[field];

          if (isDifferent(oldValue, newValue)) {
            diffs.push({
              field: `Contact - ${field}`,
              oldValue: formatValue(oldValue),
              newValue: formatValue(newValue),
            });
          }
        });
      }

      // Comparer les compétitions
      if (inscription.eventData.competitions && fetchedEventData.competitions) {
        // On crée un Map des compétitions par ID pour faciliter la comparaison
        const oldCompsMap = new Map(
          inscription.eventData.competitions.map((comp) => [comp.id, comp])
        );
        const newCompsMap = new Map(
          fetchedEventData.competitions.map((comp) => [comp.id, comp])
        );

        // Comparer les compétitions qui existent dans les deux versions
        oldCompsMap.forEach((oldComp, compId) => {
          const newComp = newCompsMap.get(compId);
          if (newComp) {
            const competitionFields: (keyof CompetitionItem)[] = [
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

            competitionFields.forEach((field) => {
              if (isDifferent(oldComp[field], newComp[field])) {
                diffs.push({
                  field: `Competition ${compId} (${
                    oldComp.eventDescription
                  }) - ${String(field)}`,
                  oldValue: formatValue(oldComp[field]),
                  newValue: formatValue(newComp[field]),
                });
              }
            });

            // Comparer le jury
            if (oldComp.jury || newComp.jury) {
              const oldJuryMap = new Map(
                oldComp.jury?.map((j) => [
                  j.function + j.lastName + j.firstName,
                  j,
                ]) || []
              );
              const newJuryMap = new Map(
                newComp.jury?.map((j) => [
                  j.function + j.lastName + j.firstName,
                  j,
                ]) || []
              );

              oldJuryMap.forEach((oldJury, juryKey) => {
                const newJury = newJuryMap.get(juryKey);
                if (newJury) {
                  [
                    "function",
                    "displayFunction",
                    "lastName",
                    "firstName",
                    "nationCode",
                    "id",
                  ].forEach((field) => {
                    const typedField = field as keyof typeof oldJury;
                    if (isDifferent(oldJury[typedField], newJury[typedField])) {
                      diffs.push({
                        field: `Competition ${compId} - Jury ${oldJury.function} - ${field}`,
                        oldValue: formatValue(oldJury[typedField]),
                        newValue: formatValue(newJury[typedField]),
                      });
                    }
                  });
                }
              });
            }

            // Comparer le schedule
            if (oldComp.schedule || newComp.schedule) {
              oldComp.schedule?.forEach((oldSchedule, scheduleIndex) => {
                const newSchedule = newComp.schedule?.[scheduleIndex];
                if (newSchedule) {
                  ["displayOrder", "startTime", "unitName", "status"].forEach(
                    (field) => {
                      const typedField = field as keyof typeof oldSchedule;
                      if (
                        isDifferent(
                          oldSchedule[typedField],
                          newSchedule[typedField]
                        )
                      ) {
                        diffs.push({
                          field: `Competition ${compId} - Schedule ${oldSchedule.unitName} - ${field}`,
                          oldValue: formatValue(oldSchedule[typedField]),
                          newValue: formatValue(newSchedule[typedField]),
                        });
                      }
                    }
                  );
                }
              });
            }
          }
        });

        // Vérifier s'il y a des nouvelles compétitions
        newCompsMap.forEach((newComp, compId) => {
          if (!oldCompsMap.has(compId)) {
            diffs.push({
              field: t("newCompetition"),
              oldValue: t("na"),
              newValue: `${newComp.eventDescription} (ID: ${compId})`,
            });
          }
        });

        // Vérifier s'il y a des compétitions supprimées
        oldCompsMap.forEach((oldComp, compId) => {
          if (!newCompsMap.has(compId)) {
            diffs.push({
              field: t("deletedCompetition"),
              oldValue: `${oldComp.eventDescription} (ID: ${compId})`,
              newValue: t("na"),
            });
          }
        });
      }

      setDifferences(diffs);
      if (diffs.length > 0) {
        setUpdatedEventData(fetchedEventData);
      } else {
        setUpdatedEventData(null);
      }
    }
  }, [fetchedEventData, inscription.eventData]);

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
            <h3 className="font-semibold mb-4">{t("changesDetected")}</h3>
            <div className="space-y-4">
              {differences.map((diff, index) => (
                <div key={index} className="bg-white p-3 rounded shadow-sm">
                  <div className="font-medium text-gray-700">{diff.field}</div>
                  <div className="mt-1 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-red-500 font-medium">
                        {t("old")}{" "}
                      </span>
                      <span className="text-red-700">{diff.oldValue}</span>
                    </div>
                    <div>
                      <span className="text-green-500 font-medium">
                        {t("new")}{" "}
                      </span>
                      <span className="text-green-700">{diff.newValue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
