"use client";

import React, {useMemo, useState, useEffect, useCallback} from "react";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {useInscription} from "../form/api";
import {Loader2, Settings} from "lucide-react";
import type {InscriptionCompetitor, CompetitionItem} from "@/app/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {Badge} from "@/components/ui/badge";
import {colorBadgePerDiscipline} from "@/app/lib/colorMappers";
import AddCompetitorModal from "./AddCompetitorModal";
import {usePermissionToEdit} from "./usePermissionToEdit";
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
import {CompetitorCard} from "./CompetitorCard";
import {useTranslations} from "next-intl";
import {format} from "date-fns";

type InscriptionCompetitorWithCodex = InscriptionCompetitor & {
  codexNumbers: string[];
  addedByEmail?: string;
  createdAt?: Date | string | null;
};

// Hook pour récupérer tous les compétiteurs de l'inscription (nouvelle structure)
const useAllInscriptionCompetitors = (inscriptionId: string, t: (key: string) => string) => {
  return useQuery<InscriptionCompetitor[]>({
    queryKey: ["inscription-competitors-all", inscriptionId],
    queryFn: async () => {
      const res = await fetch(
        `/api/inscriptions/${inscriptionId}/competitors/all`
      );
      if (!res.ok)
        throw new Error(t("errors.loadCompetitors"));
      // Nouvelle structure: retourne un tableau plat
      const data = await res.json();
      return data || [];
    },
  });
};

interface RecapEventProps {
  inscriptionId: string;
  genderFilter: "both" | "M" | "W";
}

// Define a type for the competitor data used in the table
// (pointsByCodex devient points)
type CompetitorRow = {
  competitorid: number;
  lastname: string;
  firstname: string;
  gender: string;
  birthdate?: string | null;
  points: Record<string, string | number | null>;
  codexNumbers: string[];
  skiclub: string;
  addedByEmail?: string;
  createdAt?: Date | string | null;
};

// Copied from Competitors.tsx
function useUpdateCompetitorRegistrations(inscriptionId: string, t: (key: string) => string) {
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
        throw new Error(t("errors.updateRegistrations"));
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
      // Also invalidate the specific codex-based query if it's used elsewhere,
      // though RecapEvent primarily uses 'inscription-competitors-all'
      queryClient.invalidateQueries({
        queryKey: ["inscription-competitors", inscriptionId],
      });
    },
  });
}

// Copied and adapted from Competitors.tsx
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
  genderFilterOfCompetitor?: string; // 'M', 'W', or undefined if unknown/not applicable
}) {
  const tManage = useTranslations("inscriptionDetail.recap.manage");
  const [loading, setLoading] = useState(true);

  // Filter allEventCodexes to show only those relevant to the competitor's gender
  const relevantEventCodexes = useMemo(() => {
    const competitorGenderUpper = genderFilterOfCompetitor?.toUpperCase();

    return allEventCodexes.filter((eventCodex) => {
      const eventGenderUpper = eventCodex.genderCode?.toUpperCase();

      // If competitor's gender is not M or W (e.g. undefined, or some other value if data changes),
      // or if the event is 'X' (mixed) or has no gender specified, it's generally relevant.
      // We only filter out if event is explicitly for the *other* gender.
      if (
        !competitorGenderUpper ||
        !["M", "W"].includes(competitorGenderUpper)
      ) {
        if (competitorGenderUpper === "M" && eventGenderUpper === "W")
          return false;
        if (competitorGenderUpper === "W" && eventGenderUpper === "M")
          return false;
        return true;
      }

      // If competitor's gender is M or W:
      // Event is relevant if it's open (no gender or 'X') OR matches competitor's gender.
      if (!eventGenderUpper || eventGenderUpper === "X") {
        return true;
      }
      return eventGenderUpper === competitorGenderUpper;
    });
  }, [allEventCodexes, genderFilterOfCompetitor]);

  useEffect(() => {
    setLoading(true);
    // Fetch current inscriptions for this competitor
    fetch(
      `/api/inscriptions/${inscriptionId}/competitors?competitorId=${competitorId}`
    )
      .then((r) => r.json())
      .then((data: CompetitionItem[]) => {
        // Assuming API returns CompetitionItem[] with codex
        setSelectedCodex(data.map((item: CompetitionItem) => item.codex));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscriptionId, competitorId]); // setSelectedCodex removed as it's a stable state setter

  if (loading)
    return <div>{tManage("loadingInfo")}</div>;

  if (relevantEventCodexes.length === 0 && !loading) {
    return (
      <div>
        {tManage("noCompatibleCodex")}
      </div>
    );
  }

  const allCodexNumbers = relevantEventCodexes.map((e) => e.codex);
  const allSelected = allCodexNumbers.length > 0 && allCodexNumbers.every((c) => selectedCodex.includes(c));
  const noneSelected = selectedCodex.length === 0;

  return (
    <div className="space-y-4">
      <div className="font-medium">
        {tManage("selectCodex")}
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
          {tManage("selectAll")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setSelectedCodex([])}
          disabled={noneSelected}
        >
          {tManage("deselectAll")}
        </Button>
      </div>
    </div>
  );
}

// Extract the dialog to a separate memoized component (without trigger - trigger is separate)
const CompetitorRegistrationDialog = React.memo(
  ({
    competitor,
    isOpen,
    onOpenChange,
    inscriptionId,
    allEventCodexes,
    onUpdate,
  }: {
    competitor: CompetitorRow;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    inscriptionId: string;
    allEventCodexes: CompetitionItem[];
    onUpdate: (competitorId: number, codexNumbers: number[]) => void;
  }) => {
    const tManage = useTranslations("inscriptionDetail.recap.manage");
    const [selectedCodex, setSelectedCodex] = useState<number[]>([]);
    const [updating, setUpdating] = useState(false);

    // Create a stable onUpdateClick callback
    const handleUpdate = useCallback(() => {
      setUpdating(true);
      onUpdate(competitor.competitorid, selectedCodex);
      onOpenChange(false); // Close dialog
      setUpdating(false);
    }, [competitor.competitorid, onUpdate, onOpenChange, selectedCodex]);

    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] md:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">
              {tManage("modalTitle", {firstName: competitor.firstname, lastName: competitor.lastname})}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm">
              {tManage("description")}
            </DialogDescription>
          </DialogHeader>
          <DesinscriptionCodexList
            inscriptionId={inscriptionId}
            competitorId={competitor.competitorid}
            selectedCodex={selectedCodex}
            setSelectedCodex={setSelectedCodex}
            allEventCodexes={allEventCodexes}
            genderFilterOfCompetitor={
              competitor.gender as "M" | "W" | undefined
            }
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="cursor-pointer">
                {tManage("cancel")}
              </Button>
            </DialogClose>
            <Button
              onClick={handleUpdate}
              disabled={updating}
              variant="default"
              className="cursor-pointer"
            >
              {updating ? tManage("updating") : tManage("update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
      prevProps.isOpen === nextProps.isOpen &&
      prevProps.competitor.competitorid === nextProps.competitor.competitorid
    );
  }
);

// Set display name for the memoized component to satisfy linter
CompetitorRegistrationDialog.displayName = "CompetitorRegistrationDialog";

export const RecapEvent: React.FC<RecapEventProps> = ({
  inscriptionId,
  genderFilter,
}) => {
  const t = useTranslations("inscriptionDetail.recap");
  const tTable = useTranslations("inscriptionDetail.recap.table");
  const tAdd = useTranslations("inscriptionDetail.recap.addCompetitor");
  const tGenderButtons = useTranslations("inscriptionDetail.recap.genderButtons");
  const tPermissions = useTranslations("inscriptionDetail.recap.permissions");
  const tGroups = useTranslations("inscriptionDetail.recap.groups");

  const {
    data: inscription,
    isLoading: isLoadingInscription,
    error: errorInscription,
  } = useInscription(inscriptionId);

  const {
    data: competitorsData = [],
    isPending,
    error,
  } = useAllInscriptionCompetitors(inscriptionId, t);

  const [addGender, setAddGender] = useState<"W" | "M">("W");
  const [userDrivenSorting, setUserDrivenSorting] = useState<SortingState>([]);

  // Dialog state for managing competitor registrations
  const [openDialog, setOpenDialog] = useState<null | number>(null); // Stores competitorId or null
  const {mutate: updateCompetitor} =
    useUpdateCompetitorRegistrations(inscriptionId, t);

  const handleUpdateCompetitor = useCallback(
    (competitorId: number, codexNumbers: number[]) => {
      updateCompetitor({competitorId, codexNumbers});
    },
    [updateCompetitor]
  );

  const permissionToEdit = usePermissionToEdit(
    inscription,
    "manageCompetitorInscriptions",
    null
  );

  // Derived sorting state for the table, ensuring it's always valid with current filters
  const tableSorting = useMemo(() => {
    const competitions = inscription?.eventData.competitions;
    if (!competitions) return []; // No competitions, no sort

    const visibleCompetitionsBasedOnFilter = competitions.filter(
      (comp) => genderFilter === "both" || comp.genderCode === genderFilter
    );

    if (visibleCompetitionsBasedOnFilter.length === 0) return []; // No visible columns, clear sort

    const visibleCodexColumnIds = visibleCompetitionsBasedOnFilter.map((comp) =>
      String(comp.codex)
    );
    const currentActiveSortColumnId = userDrivenSorting[0]?.id;

    if (
      currentActiveSortColumnId &&
      visibleCodexColumnIds.includes(currentActiveSortColumnId)
    ) {
      // The user's current sort is valid for the visible columns
      return userDrivenSorting;
    }

    // User's sort is not valid (or no sort is active), or no visible columns matching that sort.
    // Default to sorting by the first visible codex column.
    return [{id: visibleCodexColumnIds[0], desc: false}];
  }, [inscription?.eventData.competitions, genderFilter, userDrivenSorting]);

  // 1. Data Preparation: on force les champs string à non-null et on normalise le genre
  const allCompetitors: CompetitorRow[] = useMemo(() => {
    return (competitorsData as InscriptionCompetitorWithCodex[]).map((c) => ({
      ...c,
      lastname: c.lastname ?? "",
      firstname: c.firstname ?? "",
      gender: c.gender || "M",
      points: typeof c.points === "object" && c.points !== null ? c.points : {},
      codexNumbers: (c.codexNumbers || []).map(String),
      skiclub: c.skiclub ?? "",
      addedByEmail: c.addedByEmail,
      createdAt: c.createdAt,
    }));
  }, [competitorsData]);

  // Filter competitors based on the genderFilter prop
  const filteredCompetitors = useMemo(() => {
    if (genderFilter === "both") {
      return allCompetitors;
    }
    return allCompetitors.filter((c) => c.gender === genderFilter);
  }, [allCompetitors, genderFilter]);

  // 2. TanStack Table Columns Definition (for body rows)
  const columnHelper = createColumnHelper<CompetitorRow>();

  // Colonnes = codex de l'évènement, chaque colonne affiche les points de la discipline du codex
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "name",
        header: () => tTable("name"),
        cell: (info) =>
          `${info.row.original.lastname} ${info.row.original.firstname} `,
      }),
      // Birth year column
      columnHelper.accessor((row) => row.birthdate, {
        id: "birthyear",
        header: () => tTable("birthYear"),
        cell: (info) => {
          const birthdate = info.getValue();
          return birthdate ? new Date(birthdate as string).getFullYear() : "";
        },
        enableSorting: true,
      }),
      // Static skiclub column
      columnHelper.accessor((row) => row.skiclub, {
        id: "skiclub",
        header: () => tTable("club"),
        cell: (info) => info.getValue(),
        enableSorting: true,
      }),
      // Dynamic codex columns
      ...(inscription?.eventData.competitions ?? [])
        .sort((a, b) => a.codex - b.codex) // Sort by codex ascending
        .filter((competition) => {
          if (genderFilter === "both") return true;
          return competition.genderCode === genderFilter;
        })
        .map((competition) =>
          columnHelper.accessor(
            (row) => {
              const isInscrit =
                Array.isArray(row.codexNumbers) &&
                row.codexNumbers.includes(String(competition.codex));
              // Si inscrit mais pas de points, retourne '999'. Si pas inscrit, retourne '-'.
              if (isInscrit) {
                const val = row.points[competition.eventCode];
                if (val === 0) return 0; // Explicitly return 0 if points are 0
                return val === null ||
                  val === undefined ||
                  String(val).trim() === "" || // Check for empty string after trim
                  String(val) === "-"
                  ? "999"
                  : val;
              }
              return "-"; // Not inscribed
            },
            {
              id: String(competition.codex),
              header: ({column}) => {
                const codexStr = String(competition.codex);
                const countForThisCodex = allCompetitors.filter((c) => {
                  const isRegisteredToCodex = c.codexNumbers.includes(codexStr);
                  if (!isRegisteredToCodex) return false;

                  // Gender compatibility check
                  if (!competition.genderCode) {
                    return true; // Compatible if event is mixed or has no gender specified
                  }
                  // At this point, competition.genderCode is 'M' or 'W'.
                  // c.gender is also 'M' or 'W'.
                  return c.gender === competition.genderCode;
                }).length;

                // Format date for display
                const formatDate = (dateStr: string) => {
                  if (!dateStr) return "";
                  const date = new Date(dateStr);
                  return date.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit"
                  });
                };

                return (
                  <div
                    className="flex flex-col items-center justify-center min-w-[80px] select-none cursor-pointer"
                    onClick={() =>
                      column.toggleSorting(column.getIsSorted() === "asc")
                    }
                  >
                    {competition.date && (
                      <div className="text-xs text-slate-500 font-medium mb-0.5">
                        {formatDate(competition.date)}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-700">{competition.codex}</span>
                      <Badge
                        className={`text-xs px-1.5 py-0.5 ${
                          colorBadgePerDiscipline[competition.eventCode] || ""
                        }`}
                      >
                        {competition.eventCode}
                      </Badge>
                      <span className={`text-xs font-medium ${
                        competition.genderCode === "M" ? "text-blue-600" : "text-pink-600"
                      }`}>
                        {competition.genderCode}
                      </span>
                      {column.getIsSorted() === "asc" && <span>↑</span>}
                      {column.getIsSorted() === "desc" && <span>↓</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      ({countForThisCodex} {tTable("registered")})
                    </div>
                  </div>
                );
              },
              cell: (info) => {
                const value = info.getValue();
                return (
                  <div className="text-center min-w-[80px]">
                    {value}
                  </div>
                );
              },
              enableSorting: true,
              sortingFn: (rowA, rowB, columnId) => {
                const a = rowA.getValue(columnId);
                const b = rowB.getValue(columnId);

                const isANotInscribed = a === "-";
                const isBNotInscribed = b === "-";

                if (isANotInscribed && isBNotInscribed) return 0;
                if (isANotInscribed) return 1;
                if (isBNotInscribed) return -1;

                // Handle 0 explicitly, convert "999" for sorting
                const valA = a === "999" ? 999 : a === 0 ? 0 : Number(a);
                const valB = b === "999" ? 999 : b === 0 ? 0 : Number(b);

                // If conversion results in NaN (e.g., unexpected string), treat as high value or handle as error
                // For now, standard numeric sort after conversion.
                if (isNaN(valA) && isNaN(valB)) return 0;
                if (isNaN(valA)) return 1; // NaN values go to bottom
                if (isNaN(valB)) return -1;

                return valA - valB;
              },
            }
          )
        ),
      // Nouvelle colonne email ajouté par
      columnHelper.accessor((row) => row.addedByEmail ?? "-", {
        id: "addedByEmail",
        header: () => tTable("addedBy"),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col">
              <span>{info.getValue() || "-"}</span>
              {row.createdAt && (
                <span className="text-xs text-slate-400">
                  {format(new Date(row.createdAt), "dd/MM/yyyy HH:mm")}
                </span>
              )}
            </div>
          );
        },
        enableSorting: false,
      }),
      // Action column for managing registrations - only if user has permission
      ...(permissionToEdit
        ? [
            columnHelper.display({
              id: "actions",
              header: () => tTable("actions"),
              cell: (info) => {
                const competitor = info.row.original;
                return (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={tTable("actions")}
                    className="cursor-pointer"
                    disabled={inscription?.status !== "open"}
                    onClick={() => setOpenDialog(competitor.competitorid)}
                  >
                    <Settings className="w-5 h-5 text-slate-500" />
                  </Button>
                );
              },
            }),
          ]
        : []),
    ],
    [
      columnHelper,
      inscription?.eventData.competitions,
      inscription?.status,
      inscriptionId,
      genderFilter,
      permissionToEdit,
      openDialog,
      handleUpdateCompetitor,
      allCompetitors,
      tTable,
    ]
  );

  // 3. TanStack Table Instance
  const table = useReactTable({
    data: filteredCompetitors,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {sorting: tableSorting},
    onSortingChange: setUserDrivenSorting,
  });

  // Filter groups based on genderFilter
  const displayedGroups = useMemo(() => {
    const groups = [
      {label: tGroups("women"), value: "W"},
      {label: tGroups("men"), value: "M"},
    ];

    if (genderFilter === "M") {
      return groups.filter((g) => g.value === "M");
    }
    if (genderFilter === "W") {
      return groups.filter((g) => g.value === "W");
    }
    return groups; // For "both", show all defined groups
  }, [genderFilter, tGroups]);

  // Détection des sexes présents dans les codex de l'évènement
  const codexSexes = useMemo(() => {
    if (!inscription?.eventData.competitions) return [];
    const sexes = new Set<string>();
    for (const competition of inscription.eventData.competitions) {
      if (competition.genderCode === "W") sexes.add("W");
      if (competition.genderCode === "M") sexes.add("M");
    }
    return Array.from(sexes);
  }, [inscription?.eventData.competitions]);

  // 4. Loading / Error / Empty States
  if (isLoadingInscription || isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <p>{t("loading")}</p>
      </div>
    );
  }
  if (errorInscription || error) {
    return <div>{t("errors.loadData")}</div>;
  }
  if (!inscription?.eventData.competitions?.length) {
    return <div>{t("errors.noCodex")}</div>;
  }

  // 5. Render Component (groupé par sexe)
  // Trie les compétiteurs par sexe (F puis M) - this sorting might be less relevant if filtered
  const sortedRows = table.getRowModel().rows.sort((a, b) => {
    const sexA = a.original.gender;
    const sexB = b.original.gender;
    if (sexA === sexB) return 0;
    if (sexA === "F") return -1; // Prioritize 'F' if 'both' is selected, otherwise only one gender will be present
    return 1;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 md:gap-4 mb-4 justify-between flex-wrap px-3 md:px-4">
        <TotalInscriptionsInfo
          filteredCount={filteredCompetitors.length}
          genderFilter={genderFilter}
        />
        <div className="flex gap-1 md:gap-2 items-center flex-wrap">
          {permissionToEdit && inscription?.status === "open" ? (
            genderFilter === "W" ? (
              <AddCompetitorModal
                inscriptionId={inscriptionId}
                defaultCodex={inscription?.eventData.competitions[0].codex}
                gender="W"
                codexData={inscription?.eventData.competitions || []}
                triggerText={tAdd("female")}
                triggerTextMobile={tAdd("femaleShort")}
              />
            ) : genderFilter === "M" ? (
              <AddCompetitorModal
                inscriptionId={inscriptionId}
                defaultCodex={inscription?.eventData.competitions[0].codex}
                gender="M"
                codexData={inscription?.eventData.competitions || []}
                triggerText={tAdd("male")}
                triggerTextMobile={tAdd("maleShort")}
              />
            ) : // genderFilter === "both"
            codexSexes.length === 1 ? (
              <AddCompetitorModal
                inscriptionId={inscriptionId}
                defaultCodex={inscription?.eventData.competitions[0].codex}
                gender={codexSexes[0] as "W" | "M"}
                codexData={inscription?.eventData.competitions || []}
                triggerText={
                  codexSexes[0] === "W"
                    ? tAdd("female")
                    : tAdd("male")
                }
                triggerTextMobile={
                  codexSexes[0] === "W" ? tAdd("femaleShort") : tAdd("maleShort")
                }
              />
            ) : (
              // genderFilter === "both" && codexSexes has multiple
              <>
                <span className="text-xs md:text-sm hidden md:inline">
                  {tAdd("add", {gender: addGender === "W" ? tAdd("femaleGender") : tAdd("maleGender")})}
                </span>
                <button
                  type="button"
                  className={`px-2 md:px-3 py-1 rounded border cursor-pointer text-xs md:text-sm ${
                    addGender === "W"
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-white border-gray-300"
                  }`}
                  onClick={() => setAddGender("W")}
                >
                  <span className="md:hidden">{tGenderButtons("femaleShort")}</span>
                  <span className="hidden md:inline">{tGenderButtons("female")}</span>
                </button>
                <button
                  type="button"
                  className={`px-2 md:px-3 py-1 rounded border cursor-pointer text-xs md:text-sm ${
                    addGender === "M"
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-white border-gray-300"
                  }`}
                  onClick={() => setAddGender("M")}
                >
                  <span className="md:hidden">{tGenderButtons("maleShort")}</span>
                  <span className="hidden md:inline">{tGenderButtons("male")}</span>
                </button>
                <AddCompetitorModal
                  inscriptionId={inscriptionId}
                  defaultCodex={inscription?.eventData.competitions[0].codex}
                  gender={addGender}
                  codexData={inscription?.eventData.competitions || []}
                  triggerText={
                    addGender === "W"
                      ? tAdd("female")
                      : tAdd("male")
                  }
                  triggerTextMobile="+"
                />
              </>
            )
          ) : !permissionToEdit ? (
            <div className="text-xs text-slate-400 italic">
              {tPermissions("noPermission")}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic" dangerouslySetInnerHTML={{__html: tPermissions("closedInscription")}} />
          )}
        </div>
      </div>
      
      {/* Vue desktop - table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {displayedGroups.map((group) => {
            const groupRows = sortedRows.filter(
              (row) => row.original.gender === group.value
            );
            // if (groupRows.length === 0) return null; // Keep this if you want to hide empty groups even when selected
            // If genderFilter is specific (M or W), and groupRows is empty,
            // it implies no competitors for that gender, so we might want to show nothing or a message.
            // For now, if filter is M and no Men, or W and no Women, the group won't render.
            if (genderFilter !== "both" && group.value !== genderFilter) {
              return null; // Don't render the group if it doesn't match the filter
            }
            if (groupRows.length === 0) return null; // Always hide empty groups

            return (
              <React.Fragment key={group.value}>
                <TableRow className="border-none">
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className={`py-3 font-semibold text-sm uppercase tracking-wide border-l-4 ${
                      group.value === "W"
                        ? "bg-pink-50/50 text-pink-700 border-l-pink-400"
                        : "bg-blue-50/50 text-blue-700 border-l-blue-400"
                    }`}
                  >
                    {group.label} ({groupRows.length})
                  </TableCell>
                </TableRow>
                {groupRows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
        </Table>
      </div>

      {/* Vue mobile - cartes */}
      <div className="md:hidden space-y-1 pb-20">
        {displayedGroups.map((group) => {
          const groupRows = sortedRows.filter(
            (row) => row.original.gender === group.value
          );

          if (genderFilter !== "both" && group.value !== genderFilter) {
            return null;
          }
          if (groupRows.length === 0) return null;

          return (
            <div key={group.value} className="space-y-1">
              {/* En-tête de groupe */}
              <div className="bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
                <h3 className="font-semibold text-xs text-slate-600">{group.label}</h3>
              </div>
              
              {/* Cartes des compétiteurs */}
              {groupRows.map((row) => (
                <CompetitorCard
                  key={row.id}
                  competitor={row.original}
                  competitions={inscription?.eventData?.competitions || []}
                  genderFilter={genderFilter}
                  permissionToEdit={permissionToEdit}
                  inscriptionStatus={inscription?.status || ""}
                  onManageRegistrations={(competitorId) => setOpenDialog(competitorId)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Dialog partagé pour la gestion des inscriptions - mobile et desktop */}
      {openDialog && filteredCompetitors.find(c => c.competitorid === openDialog) && (
        <CompetitorRegistrationDialog
          competitor={filteredCompetitors.find(c => c.competitorid === openDialog)!}
          isOpen={true}
          onOpenChange={(open) => setOpenDialog(open ? openDialog : null)}
          inscriptionId={inscriptionId}
          allEventCodexes={inscription?.eventData?.competitions || []}
          onUpdate={handleUpdateCompetitor}
        />
      )}
    </div>
  );
};

// Composant pour afficher le nombre total d'inscriptions
interface TotalInscriptionsInfoProps {
  filteredCount: number;
  genderFilter: "both" | "M" | "W";
}

const TotalInscriptionsInfo: React.FC<TotalInscriptionsInfoProps> = ({
  filteredCount,
  genderFilter,
}) => {
  const tTotals = useTranslations("inscriptionDetail.recap.totals");

  let text = "";
  if (genderFilter === "both") {
    text = tTotals("all", {count: filteredCount});
  } else if (genderFilter === "W") {
    text = tTotals("women", {count: filteredCount});
  } else if (genderFilter === "M") {
    text = tTotals("men", {count: filteredCount});
  }

  const parts = text.split(String(filteredCount));

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span>{parts[0]?.trim()}</span>
      <span className="font-semibold text-slate-700 tabular-nums">{filteredCount}</span>
    </div>
  );
};
