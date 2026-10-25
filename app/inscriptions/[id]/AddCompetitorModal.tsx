import React, {useState, useCallback, useEffect} from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Checkbox} from "@/components/ui/checkbox";
import {Badge} from "@/components/ui/badge";
import {colorBadgePerDiscipline} from "@/app/lib/colorMappers";
import {CompetitionItem, Competitor} from "@/app/types";
import {useTranslations} from "next-intl";

const MIN_SEARCH_LENGTH = 3;

// Hook debounce simple
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Remplace le useEffect par un hook react-query
function useCompetitors(search: string, gender: "W" | "M") {
  return useQuery<Competitor[]>({
    queryKey: ["competitors", search, gender],
    queryFn: async () => {
      if (search.length < MIN_SEARCH_LENGTH) return [];
      const res = await fetch(
        `/api/competitors?search=${encodeURIComponent(search)}&gender=${gender}`
      );
      if (!res.ok) throw new Error("Erreur API");
      return res.json();
    },
    enabled:
      search.length >= MIN_SEARCH_LENGTH && (gender === "W" || gender === "M"),
  });
}

function useSaveCompetitors(inscriptionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      competitorIds,
      codexNumbers,
    }: {
      competitorIds: string[];
      codexNumbers: number[];
    }) => {
      const res = await fetch(
        `/api/inscriptions/${inscriptionId}/save-competitors`,
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({competitorIds, codexNumbers}),
        }
      );
      if (!res.ok) throw new Error("Erreur lors de l'enregistrement");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inscription-competitors", inscriptionId],
      });
      // Invalider la liste globale des compétiteurs de l'inscription
      queryClient.invalidateQueries({
        queryKey: ["inscription-competitors-all", inscriptionId],
      });
      // Invalider la liste des inscriptions du compétiteur (onglet Compétiteurs)
      if (
        variables &&
        variables.competitorIds &&
        variables.competitorIds.length > 0
      ) {
        variables.competitorIds.forEach((competitorId) => {
          queryClient.invalidateQueries({
            queryKey: ["competitor-inscriptions", competitorId],
          });
        });
      }
    },
  });
}

const codexForGender = (codexData: CompetitionItem[], gender: "W" | "M") =>
  codexData
    .filter((c) =>
      gender === "W" ? c.genderCode === "W" : c.genderCode === "M"
    )
    .map((c) => c.codex);

export default function AddCompetitorModal({
  inscriptionId,
  gender,
  codexData,
  triggerText,
  triggerTextMobile,
}: {
  inscriptionId: string;
  defaultCodex: number;
  gender: "W" | "M";
  codexData: CompetitionItem[];
  triggerText?: string;
  triggerTextMobile?: string;
}) {
  const t = useTranslations("modals.addCompetitor");
  const tCommon = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [selectedCodex, setSelectedCodex] = useState<number[]>(() =>
    codexForGender(codexData, gender)
  );

  const {data: results = [], isLoading: loading} = useCompetitors(
    debouncedSearch,
    gender
  );

  const {mutate: saveCompetitors, isPending: saving} =
    useSaveCompetitors(inscriptionId);

  const handleSave = useCallback(() => {
    if (!selectedId || selectedCodex.length === 0) return;
    saveCompetitors(
      {competitorIds: [selectedId], codexNumbers: selectedCodex},
      {
        onSuccess: () => {
          setSearch("");
          setSelectedId(undefined);
        },
      }
    );
  }, [selectedId, selectedCodex, saveCompetitors]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          // Start from every codex of this gender each time the dialog opens
          setSelectedCodex(codexForGender(codexData, gender));
        } else {
          setSearch("");
          setSelectedId(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-white text-[#3d7cf2] hover:bg-[#f0f7ff] cursor-pointer text-xs md:text-base px-2 md:px-4 py-2"
          disabled={!selectedCodex}
        >
          <span className="md:hidden">{triggerTextMobile || triggerText || t("titleShort")}</span>
          <span className="hidden md:inline">{triggerText || t("title")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search input for competitors */}
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* Select dropdown for competitors */}
          <select
            className="w-full px-3 py-2 border rounded"
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loading || results.length === 0}
          >
            <option value="" disabled>
              {loading
                ? tCommon("loading")
                : results.length === 0
                ? t("noResults")
                : t("selected")}
            </option>
            {results.map((c) => (
              <option key={c.competitorid} value={c.competitorid}>
                {c.firstname} {c.lastname} ({c.nationcode})
              </option>
            ))}
          </select>
          <div className="mb-2 font-medium">
            {t("forWhichCodex", {gender: gender === "W" ? "F" : "M"})}
          </div>
          <div className="flex flex-wrap gap-2">
            {codexData
              .filter((c) =>
                gender === "W" ? c.genderCode === "W" : c.genderCode === "M"
              )
              .map((c) => (
                <label key={c.codex} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedCodex.includes(c.codex)}
                    onCheckedChange={(checked) => {
                      setSelectedCodex((prev) =>
                        checked
                          ? [...prev, c.codex]
                          : prev.filter((codex) => codex !== c.codex)
                      );
                    }}
                  />
                  {c.codex}
                  <Badge
                    className={`ml-1 text-xs px-2 py-1 ${
                      colorBadgePerDiscipline[c.eventCode] || ""
                    }`}
                  >
                    {c.eventCode}
                  </Badge>
                </label>
              ))}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon("actions.cancel")}</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!selectedId || selectedCodex.length === 0 || saving}
          >
            {saving ? t("saving") : "OK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
