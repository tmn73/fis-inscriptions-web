"use client";

import React, {useState, useEffect, useMemo} from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Loader2, Settings} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Badge} from "@/components/ui/badge";
import {colorBadgePerDiscipline} from "@/app/lib/colorMappers";
import {usePermissionToEdit} from "./usePermissionToEdit";
import {InscriptionCompetitor} from "@/app/types";
import {format} from "date-fns";
import {CompetitionItem} from "@/app/types";
import {CompetitorCodexCard} from "./CompetitorCodexCard";
import {useTranslations} from "next-intl";

export const useInscriptionCompetitors = (
  inscriptionId: string,
  codexNumber: number,
  discipline: string
) => {
  return useQuery<InscriptionCompetitor[]>({
    queryKey: [
      "inscription-competitors",
      inscriptionId,
      codexNumber,
      discipline,
    ],
    queryFn: async () => {
      const res = await fetch(
        `/api/inscriptions/${inscriptionId}/competitors?codexNumber=${codexNumber}&discipline=${discipline}`
      );
      if (!res.ok) throw new Error("Erreur lors du chargement des coureurs");
      return res.json();
    },
  });
};

function useUpdateCompetitorRegistrations(inscriptionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      competitorId,
      codexNumbers,
    }: {
      competitorId: number;
      codexNumbers: number[];
    }) => {
      const res = await fetch(
        `/api/inscriptions/${inscriptionId}/competitors`,
        {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({competitorId, codexNumbers}),
        }
      );
      if (!res.ok)
        throw new Error(
          "Erreur lors de la mise à jour des inscriptions du compétiteur"
        );
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inscription-competitors-all", inscriptionId],
      });
      if (variables && variables.competitorId) {
        queryClient.invalidateQueries({
          queryKey: ["competitor-inscriptions", variables.competitorId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["inscription-competitors", inscriptionId],
      });
    },
  });
}

export const Competitors = ({
  inscriptionId,
  codexNumber,
  discipline,
  genderFilter,
}: {
  inscriptionId: string;
  codexNumber: number;
  discipline: string;
  genderFilter: "both" | "M" | "W";
}) => {
  const t = useTranslations("inscriptionDetail.competitors");
  const {
    data: competitorsData = [],
    isPending,
    error,
  } = useInscriptionCompetitors(inscriptionId, codexNumber, discipline);

  // Filter competitors based on genderFilter prop
  const competitors = React.useMemo(() => {
    if (genderFilter === "both") {
      return competitorsData;
    }
    // Assuming competitor objects have a 'gender' property (e.g., 'M' or 'W')
    // This matches the assumption in RecapEvent.tsx and CodexTabs.tsx (for TotalInscriptionsInfo)
    return competitorsData.filter(
      (c: InscriptionCompetitor) => c.gender === genderFilter
    );
  }, [competitorsData, genderFilter]);

  const {data: inscription} = useQuery({
    queryKey: ["inscriptions", inscriptionId],
    queryFn: () =>
      fetch(`/api/inscriptions/${inscriptionId}`).then((r) => r.json()),
  });

  // Dialog state
  const [openDialog, setOpenDialog] = useState<null | number>(null); // competitorId
  const [selectedCodex, setSelectedCodex] = useState<number[]>([]);
  const {mutate: updateCompetitor, isPending: updating} =
    useUpdateCompetitorRegistrations(inscriptionId);

  const permissionToEdit = usePermissionToEdit(
    inscription,
    "manageCompetitorInscriptions",
    genderFilter === "both" ? null : genderFilter
  );

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <p>{t("loading")}</p>
      </div>
    );
  }
  if (error) {
    return <div>{t("loadError")}</div>;
  }

  if (!competitors?.length && !isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        {inscription?.status !== "open" && (
          <div className="text-xs text-slate-400 italic select-none" dangerouslySetInnerHTML={{__html: t("editRestriction")}} />
        )}
        <p>{t("noCompetitors")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {inscription?.status !== "open" && (
        <div className="text-xs text-slate-400 italic select-none" dangerouslySetInnerHTML={{__html: t("editRestriction")}} />
      )}

      {/* Vue desktop - table */}
      <div className="hidden md:block">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.lastName")}</TableHead>
            <TableHead>{t("table.firstName")}</TableHead>
            <TableHead>{t("table.club")}</TableHead>
            <TableHead>{t("table.birthYear")}</TableHead>
            <TableHead>{t("table.points", {discipline})}</TableHead>
            <TableHead>{t("table.addedBy")}</TableHead>
            {permissionToEdit && <TableHead>{t("table.action")}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(competitors || [])
            .sort((a, b) => {
              const aPoints = a.points;
              const bPoints = b.points;
              const aNoPoints =
                aPoints === null ||
                aPoints === undefined ||
                String(aPoints) === "" ||
                String(aPoints) === "-";
              const bNoPoints =
                bPoints === null ||
                bPoints === undefined ||
                String(bPoints) === "" ||
                String(bPoints) === "-";
              if (aNoPoints && bNoPoints) return 0;
              if (aNoPoints) return 1;
              if (bNoPoints) return -1;
              return Number(aPoints) - Number(bPoints);
            })
            .map((c) => (
              <TableRow key={c.competitorid}>
                <TableCell>{c.lastname}</TableCell>
                <TableCell>{c.firstname}</TableCell>
                <TableCell>{c.skiclub}</TableCell>
                <TableCell>
                  {c.birthdate ? format(new Date(c.birthdate), "yyyy") : ""}
                </TableCell>
                <TableCell>
                  {c.points === null ||
                  c.points === undefined ||
                  String(c.points) === "" ||
                  String(c.points) === "-"
                    ? "999"
                    : c.points}
                </TableCell>
                <TableCell>{c.addedByEmail || "-"}</TableCell>
                {permissionToEdit && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("manage.title")}
                      className="cursor-pointer"
                      disabled={inscription?.status !== "open"}
                      onClick={() => setOpenDialog(c.competitorid)}
                    >
                      <Settings className="w-5 h-5 text-slate-500" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
        </TableBody>
        </Table>
      </div>

      {/* Vue mobile - cartes */}
      <div className="md:hidden space-y-3">
        {(competitors || [])
          .sort((a, b) => {
            const aPoints = a.points;
            const bPoints = b.points;
            if (aPoints === null && bPoints === null) return 0;
            if (aPoints === null) return 1;
            if (bPoints === null) return -1;
            return aPoints - bPoints;
          })
          .map((competitor) => (
            <CompetitorCodexCard
              key={competitor.competitorid}
              competitor={competitor}
              permissionToEdit={permissionToEdit}
              inscriptionStatus={inscription?.status || ""}
              onManageRegistrations={(competitorId) => setOpenDialog(competitorId)}
            />
          ))}
      </div>

      {/* Dialog partagé pour la gestion des inscriptions - mobile et desktop */}
      {openDialog && (
        <Dialog
          open={true}
          onOpenChange={(open) => setOpenDialog(open ? openDialog : null)}
        >
          <DialogContent className="w-[95vw] md:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("manage.modalTitle", {
                  firstName: competitors?.find(c => c.competitorid === openDialog)?.firstname || "",
                  lastName: competitors?.find(c => c.competitorid === openDialog)?.lastname || ""
                })}
              </DialogTitle>
              <DialogDescription className="mt-2">
                {t("manage.description")}
              </DialogDescription>
            </DialogHeader>
            <DesinscriptionCodexList
              inscriptionId={inscriptionId}
              competitorId={openDialog}
              selectedCodex={selectedCodex}
              setSelectedCodex={setSelectedCodex}
              allEventCodexes={inscription?.eventData?.competitions || []}
              genderFilterOfCompetitor={
                competitors?.find(c => c.competitorid === openDialog)?.gender || undefined
              }
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" className="cursor-pointer">
                  {t("manage.cancel")}
                </Button>
              </DialogClose>
              <Button
                onClick={() => {
                  updateCompetitor({
                    competitorId: openDialog,
                    codexNumbers: selectedCodex,
                  });
                  setOpenDialog(null);
                }}
                disabled={updating}
                variant="default"
                className="cursor-pointer"
              >
                {updating
                  ? t("manage.updating")
                  : t("manage.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Composant pour afficher la liste des codex où le compétiteur est inscrit
function DesinscriptionCodexList({
  inscriptionId,
  competitorId,
  selectedCodex,
  setSelectedCodex,
  allEventCodexes,
  genderFilterOfCompetitor,
}: {
  inscriptionId: string;
  competitorId: number;
  selectedCodex: number[];
  setSelectedCodex: (v: number[]) => void;
  allEventCodexes: CompetitionItem[];
  genderFilterOfCompetitor?: string;
}) {
  const t = useTranslations("inscriptionDetail.competitors.manage");
  const [loading, setLoading] = useState(true);

  // Filter allEventCodexes
  const relevantEventCodexes = useMemo(() => {
    const competitorGenderUpper = genderFilterOfCompetitor?.toUpperCase();

    return allEventCodexes.filter((eventCodex) => {
      const eventGenderUpper = eventCodex.genderCode?.toUpperCase();

      // If competitor's gender is not M or W, general filtering applies:
      // an event is excluded only if it's for a specific gender different from the competitor's (if known and specific)
      if (
        !competitorGenderUpper ||
        !["M", "W"].includes(competitorGenderUpper)
      ) {
        if (competitorGenderUpper === "M" && eventGenderUpper === "W")
          return false;
        if (competitorGenderUpper === "W" && eventGenderUpper === "M")
          return false;
        return true; // Otherwise, it's relevant (e.g. competitor gender unknown, or event is X/undefined)
      }

      // If competitor's gender is M or W:
      // Event is relevant if it's open (no gender or 'X') OR matches competitor's gender.
      if (!eventGenderUpper || eventGenderUpper === "X") {
        return true; // Open or mixed gender events are always relevant
      }
      return eventGenderUpper === competitorGenderUpper; // Event gender must match competitor's gender
    });
  }, [allEventCodexes, genderFilterOfCompetitor]);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/inscriptions/${inscriptionId}/competitors?competitorId=${competitorId}`
    )
      .then((r) => r.json())
      .then((data: CompetitionItem[]) => {
        setSelectedCodex(data.map((item: CompetitionItem) => item.codex));
      })
      .finally(() => setLoading(false));
  }, [inscriptionId, competitorId, setSelectedCodex]);

  if (loading)
    return <div>{t("loadingInfo")}</div>;

  if (relevantEventCodexes.length === 0 && !loading) {
    return (
      <div>
        {t("noCompatibleCodex")}
      </div>
    );
  }

  const allCodexNumbers = relevantEventCodexes.map((e) => e.codex);
  const allSelected = allCodexNumbers.length > 0 && allCodexNumbers.every((c) => selectedCodex.includes(c));
  const noneSelected = selectedCodex.length === 0;

  return (
    <div className="space-y-4">
      <div className="font-medium">
        {t("selectCodex")}
      </div>
      <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto p-2 border rounded-md bg-slate-50/50">
        {relevantEventCodexes.map((eventCodexItem) => (
          <label
            key={eventCodexItem.id || eventCodexItem.codex}
            className="flex items-center gap-2 cursor-pointer p-2 bg-white border rounded-md hover:bg-slate-50 min-w-[120px]"
          >
            <Checkbox
              checked={selectedCodex.includes(eventCodexItem.codex)}
              onCheckedChange={(checked) => {
                setSelectedCodex(
                  checked
                    ? [...selectedCodex, eventCodexItem.codex]
                    : selectedCodex.filter(
                        (n: number) => n !== eventCodexItem.codex
                      )
                );
              }}
              className="cursor-pointer"
            />
            <span className="font-mono text-sm">
              {eventCodexItem.displayCodex ||
                String(eventCodexItem.codex).padStart(4, "0")}
            </span>
            <Badge
              className={`ml-auto text-xs px-1.5 py-0.5 ${
                colorBadgePerDiscipline[eventCodexItem.eventCode] ||
                "bg-gray-200"
              }`}
            >
              {eventCodexItem.eventCode}
            </Badge>
            {eventCodexItem.genderCode &&
              eventCodexItem.genderCode.toUpperCase() !== "X" && (
                <Badge
                  className={`ml-1 text-xs px-1.5 py-0.5 ${
                    eventCodexItem.genderCode.toUpperCase() === "M"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-pink-100 text-pink-700"
                  }`}
                >
                  {eventCodexItem.genderCode.toUpperCase()}
                </Badge>
              )}
          </label>
        ))}
      </div>
      {/* Quick actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs cursor-pointer"
          onClick={() => setSelectedCodex(allCodexNumbers)}
          disabled={allSelected}
        >
          {t("selectAll")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setSelectedCodex([])}
          disabled={noneSelected}
        >
          {t("deselectAll")}
        </Button>
      </div>
    </div>
  );
}
