"use client";

import {useQuery} from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs";
import {Loader2, ExternalLink} from "lucide-react";
import Link from "next/link";
import type {InscriptionWithCounts} from "@/app/types";
import {colorBadgePerDiscipline} from "@/app/lib/colorMappers";
import type {CompetitionItem} from "@/app/types";
import {useTranslations} from "next-intl";

type Competitor = {
  competitorid: number;
  fiscode: string | null;
  lastname: string | null;
  firstname: string | null;
  nationcode: string | null;
  gender: string | null;
  skiclub: string | null;
  points: {
    SL: string | number;
    SG: string | number;
    GS: string | number;
    DH: string | number;
    AC: string | number;
  };
  codexNumbers: string[];
};

function RunnerCard({competitor, disciplines}: {competitor: Competitor; disciplines: string[]}) {
  const initials = `${(competitor.firstname?.[0] || "").toUpperCase()}${(competitor.lastname?.[0] || "").toUpperCase()}`;
  const isMale = competitor.gender === "M";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          isMale ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
        }`}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">
          {competitor.lastname} {competitor.firstname}
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1.5">
          <span className="font-mono">{competitor.fiscode}</span>
          {competitor.skiclub && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
              <span className="truncate">{competitor.skiclub}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {disciplines.map((d) => {
          const key = d as keyof typeof competitor.points;
          const val = competitor.points[key];
          if (!val || val === "0" || val === 0 || val === "999.99") return null;
          return (
            <div
              key={d}
              className="text-center px-2 py-1 rounded bg-gray-50 border border-gray-100"
            >
              <div className="text-[9px] font-semibold text-gray-400 uppercase">
                {d}
              </div>
              <div className="text-[11px] font-mono font-medium">{val}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RunnersSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
        >
          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 bg-gray-100 animate-pulse rounded" />
            <div className="h-3 w-48 bg-gray-100 animate-pulse rounded" />
          </div>
          <div className="h-8 w-16 bg-gray-100 animate-pulse rounded flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function QuickViewDrawer({
  inscription,
  open,
  onOpenChange,
}: {
  inscription: InscriptionWithCounts | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("common");

  const {data, isLoading} = useQuery<Competitor[]>({
    queryKey: ["inscription-competitors-all", inscription?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/inscriptions/${inscription!.id}/competitors/all`
      );
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
    enabled: open && !!inscription,
  });

  if (!inscription) return null;

  const men = data?.filter((c) => c.gender === "M") || [];
  const women = data?.filter((c) => c.gender === "W") || [];

  const disciplines = Array.from(
    new Set(
      (inscription.eventData.competitions ?? []).map(
        (c: CompetitionItem) => c.eventCode
      )
    )
  ).filter(Boolean);

  const place = inscription.eventData.place || "—";
  const formattedPlace =
    place.charAt(0).toUpperCase() + place.slice(1).toLowerCase();

  const genderCodes = inscription.eventData.genderCodes || [];
  const hasM = genderCodes.includes("M");
  const hasW = genderCodes.includes("W");
  const defaultTab = hasM ? "men" : "women";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b space-y-2">
          <SheetTitle className="text-base">{formattedPlace}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-1.5">
            {inscription.eventData.startDate && (
              <span>{new Date(inscription.eventData.startDate).toLocaleDateString("fr-FR")}</span>
            )}
            {disciplines.map((d: string) => (
              <span
                key={d}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  colorBadgePerDiscipline[d] || "bg-gray-200 text-gray-700"
                }`}
              >
                {d}
              </span>
            ))}
          </SheetDescription>
        </SheetHeader>

        <Link
          href={`/inscriptions/${inscription.id}`}
          className="mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          Ouvrir l&apos;événement complet
        </Link>

        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col mt-2 overflow-hidden">
          <TabsList className="mx-4">
            {hasM && (
              <TabsTrigger value="men" className="gap-1.5 cursor-pointer">
                Hommes
                <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                  {data ? men.length : (inscription.menCount ?? 0)}
                </span>
              </TabsTrigger>
            )}
            {hasW && (
              <TabsTrigger value="women" className="gap-1.5 cursor-pointer">
                Femmes
                <span className="bg-purple-50 text-purple-700 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                  {data ? women.length : (inscription.womenCount ?? 0)}
                </span>
              </TabsTrigger>
            )}
          </TabsList>

          {hasM && (
            <TabsContent value="men" className="flex-1 overflow-y-auto px-4 pb-4">
              {isLoading ? (
                <RunnersSkeleton />
              ) : men.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  Aucun coureur inscrit
                </div>
              ) : (
                <div className="space-y-2">
                  {men.map((c) => (
                    <RunnerCard
                      key={c.competitorid}
                      competitor={c}
                      disciplines={disciplines}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {hasW && (
            <TabsContent value="women" className="flex-1 overflow-y-auto px-4 pb-4">
              {isLoading ? (
                <RunnersSkeleton />
              ) : women.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  Aucune coureuse inscrite
                </div>
              ) : (
                <div className="space-y-2">
                  {women.map((c) => (
                    <RunnerCard
                      key={c.competitorid}
                      competitor={c}
                      disciplines={disciplines}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
