"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { colorBadgePerDiscipline } from "@/app/lib/colorMappers";
import { Competitor, CompetitorInscriptionDetail, CodexItem } from "@/app/types";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  UserCheck,
  Calendar,
  MapPin,
  ChevronRight,
  Users,
  Trophy,
  Loader2,
  Check,
  ChevronsUpDown,
} from "lucide-react";

function useAllCompetitorsWithInscriptions() {
  return useQuery<Competitor[], Error>({
    queryKey: ["all-competitors-with-inscriptions"],
    queryFn: async () => {
      const resM = await fetch(`/api/competitors/with-inscriptions?gender=M`);
      const resW = await fetch(`/api/competitors/with-inscriptions?gender=W`);
      if (!resM.ok && !resW.ok) throw new Error("Erreur API");
      const dataM: Competitor[] = resM.ok ? await resM.json() : [];
      const dataW: Competitor[] = resW.ok ? await resW.json() : [];
      return [...dataM, ...dataW];
    },
  });
}

export function CompetitorEventsTab() {
  const t = useTranslations("competitorEventsTab");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [gender, setGender] = useState<"M" | "W" | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const { data: allResults = [], isLoading: loadingAll } =
    useAllCompetitorsWithInscriptions();
  const results: Competitor[] = gender
    ? allResults.filter((c: Competitor) => c.gender === gender)
    : [];

  const sortedResults = [...results].sort((a, b) =>
    (a.lastname ?? "").localeCompare(b.lastname ?? "")
  );

  const selectedCompetitorFromList = sortedResults.find(
    (c) => c.competitorid?.toString() === selectedId
  );

  const { data: competitor, isLoading: loadingCompetitor } = useQuery<
    Competitor | null,
    Error
  >({
    queryKey: ["competitor", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const res = await fetch(`/api/competitors/${selectedId}`);
      if (!res.ok) throw new Error("Erreur API");
      return res.json();
    },
    enabled: !!selectedId,
  });

  const { data: inscriptions, isLoading: loadingInscriptions } = useQuery<
    CompetitorInscriptionDetail[],
    Error
  >({
    queryKey: ["competitor-inscriptions", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await fetch(`/api/competitors/${selectedId}/inscriptions`);
      if (!res.ok) throw new Error("Erreur API");
      return res.json();
    },
    enabled: !!selectedId,
  });

  useEffect(() => {
    setSelectedId(undefined);
    setOpen(false);
  }, [gender]);

  const maleCount = allResults.filter((c) => c.gender === "M").length;
  const femaleCount = allResults.filter((c) => c.gender === "W").length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25 mb-4">
          <UserCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {t("title") || "Compétiteurs"}
        </h1>
        <p className="text-slate-500 text-sm">
          {t("subtitle") || "Consultez les inscriptions par athlète"}
        </p>
      </div>

      {/* Gender Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setGender("M")}
            className={cn(
              "relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
              gender === "M"
                ? "bg-white text-blue-700 shadow-md"
                : "text-slate-600 hover:text-slate-800"
            )}
          >
            <Users className="w-4 h-4" />
            <span>{t("gender.male")}</span>
            {!loadingAll && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                  gender === "M"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-200 text-slate-600"
                )}
              >
                {maleCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setGender("W")}
            className={cn(
              "relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
              gender === "W"
                ? "bg-white text-purple-700 shadow-md"
                : "text-slate-600 hover:text-slate-800"
            )}
          >
            <Users className="w-4 h-4" />
            <span>{t("gender.female")}</span>
            {!loadingAll && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                  gender === "W"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-slate-200 text-slate-600"
                )}
              >
                {femaleCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Combobox Search & Select */}
      {gender && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                disabled={loadingAll || sortedResults.length === 0}
                className={cn(
                  "w-full justify-between h-12 px-4 text-base font-medium",
                  "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300",
                  "shadow-sm hover:shadow-md transition-all duration-200",
                  open ? "rounded-t-xl rounded-b-none border-b-0" : "rounded-xl",
                  !selectedId && "text-slate-500"
                )}
              >
                {loadingAll
                  ? t("loading.competitors")
                  : selectedCompetitorFromList
                    ? `${selectedCompetitorFromList.lastname} ${selectedCompetitorFromList.firstname}`
                    : sortedResults.length === 0
                      ? t("select.noCompetitors")
                      : t("select.placeholder")}
                <ChevronsUpDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0 rounded-t-none rounded-b-xl border-t-0 shadow-lg"
              align="start"
              sideOffset={0}
            >
              <Command>
                <CommandInput
                  placeholder={t("searchPlaceholder") || "Rechercher..."}
                  className="h-10"
                />
                <CommandList className="max-h-64">
                  <CommandEmpty>{t("select.noCompetitors")}</CommandEmpty>
                  <CommandGroup>
                    {sortedResults.map((c) => (
                      <CommandItem
                        key={c.competitorid}
                        value={`${c.lastname} ${c.firstname}`}
                        onSelect={() => {
                          setSelectedId(c.competitorid?.toString());
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedId === c.competitorid?.toString()
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {c.lastname} {c.firstname}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Loading States */}
      {loadingCompetitor && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
          <span className="ml-3 text-slate-500">{t("loading.competitorDetails")}</span>
        </div>
      )}

      {/* Competitor Profile Card */}
      {competitor && (
        <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl p-6",
              competitor.gender === "M"
                ? "bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100"
                : "bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100"
            )}
          >
            {/* Decorative element */}
            <div
              className={cn(
                "absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20",
                competitor.gender === "M" ? "bg-blue-400" : "bg-purple-400"
              )}
            />

            <div className="relative flex items-start gap-4">
              {/* Avatar */}
              <div
                className={cn(
                  "flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg",
                  competitor.gender === "M"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30"
                    : "bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/30"
                )}
              >
                {competitor.firstname?.[0]}
                {competitor.lastname?.[0]}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-slate-800 mb-1">
                  {competitor.firstname} {competitor.lastname}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium">{t("competitorInfo.fis")}:</span>
                    <span className="font-mono">{competitor.fiscode}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {competitor.nationcode}
                  </span>
                  {competitor.birthdate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(parseISO(competitor.birthdate), "dd/MM/yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      {loadingInscriptions && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
          <span className="ml-3 text-slate-500">{t("loading.events")}</span>
        </div>
      )}

      {inscriptions && inscriptions.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100">
              <Trophy className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t("eventsTitle")}</h3>
              <p className="text-xs text-slate-500">
                {inscriptions.length}{" "}
                {inscriptions.length === 1 ? t("eventCount.event_one") : t("eventCount.event_other")}
                {" · "}
                {inscriptions.reduce((acc, curr) => acc + curr.codexList.length, 0)}{" "}
                {t("eventCount.codex")}
              </p>
            </div>
          </div>

          {/* Events timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-sky-200 via-slate-200 to-transparent" />

            <ul className="space-y-3">
              {[...(inscriptions ?? [])]
                .sort(
                  (a: CompetitorInscriptionDetail, b: CompetitorInscriptionDetail) =>
                    new Date(a.eventStartDate).getTime() - new Date(b.eventStartDate).getTime()
                )
                .map((insc: CompetitorInscriptionDetail, index: number) => (
                  <li
                    key={insc.inscriptionId.toString()}
                    className="relative pl-10 animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-2 top-4 w-3.5 h-3.5 rounded-full bg-white border-2 border-sky-400 shadow-sm" />

                    <a
                      href={`/inscriptions/${insc.inscriptionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group cursor-pointer"
                    >
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                              {insc.eventPlace}
                            </h4>
                            {insc.eventStartDate && (
                              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {(() => {
                                  try {
                                    return format(parseISO(insc.eventStartDate), "dd MMM yyyy");
                                  } catch {
                                    return insc.eventStartDate;
                                  }
                                })()}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {insc.codexList.map((codex: CodexItem) => (
                            <Badge
                              key={codex.displayCodex}
                              className={cn(
                                "text-xs px-2.5 py-1 font-medium",
                                colorBadgePerDiscipline[codex.eventCode as keyof typeof colorBadgePerDiscipline] ||
                                  "bg-slate-500 text-white"
                              )}
                            >
                              {codex.displayCodex} · {codex.eventCode}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty state */}
      {inscriptions && inscriptions.length === 0 && selectedId && !loadingInscriptions && (
        <div className="text-center py-12 animate-in fade-in duration-300">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 mb-4">
            <Calendar className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500">{t("noInscriptions")}</p>
        </div>
      )}

      {/* Initial state - no gender selected */}
      {!gender && (
        <div className="text-center py-16 animate-in fade-in duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">
            {t("selectGenderPrompt") || "Sélectionnez une catégorie pour commencer"}
          </p>
        </div>
      )}
    </div>
  );
}
