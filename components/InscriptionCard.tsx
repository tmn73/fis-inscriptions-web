"use client";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import Link from "next/link";
import {format, parseISO} from "date-fns";
import {Inscription} from "@/app/types";
import type {CompetitionItem} from "@/app/types";
import Image from "next/image";
import {useCountryInfo} from "@/hooks/useCountryInfo";
import {
  colorBadgePerDiscipline,
  colorBadgePerRaceLevel,
  colorBadgePerGender,
} from "@/app/lib/colorMappers";
import {Loader2, Mail} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {StatusBadges} from "@/components/ui/status-badges";

const CompetitorCountCell = ({inscriptionId}: {inscriptionId: number}) => {
  const {data, isLoading, isError} = useQuery({
    queryKey: ["inscription-competitors-all", inscriptionId],
    queryFn: async () => {
      const res = await fetch(
        `/api/inscriptions/${inscriptionId}/competitors/all`
      );
      if (!res.ok)
        throw new Error("Erreur lors du chargement des compétiteurs");
      return res.json();
    },
  });
  if (isLoading)
    return <Loader2 className="w-4 h-4 animate-spin inline-block" />;
  if (isError) return <span>-</span>;
  return <span>{Array.isArray(data) ? data.length : "-"}</span>;
};

const CountryDisplay = ({country}: {country: string}) => {
  const {flagUrl, countryLabel} = useCountryInfo(country);
  return (
    <span className="flex items-center gap-1">
      {flagUrl && (
        <Image
          src={flagUrl}
          alt={countryLabel}
          className="inline-block w-4 h-3 object-cover border border-gray-200 rounded"
          loading="lazy"
          width={16}
          height={12}
        />
      )}
      <span className="text-xs truncate">{countryLabel}</span>
    </span>
  );
};

const BadgeList = ({
  items,
  colorMap,
  maxDisplay = 2,
}: {
  items: string[];
  colorMap: Record<string, string>;
  maxDisplay?: number;
}) => {
  const visibleItems = items.slice(0, maxDisplay);
  const hiddenCount = items.length - maxDisplay;

  return (
    <div className="flex gap-1 flex-wrap">
      {visibleItems.map((item) => (
        <Badge
          key={item}
          className={`${colorMap[item] || "bg-gray-300"} text-xs`}
        >
          {item}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
};

export function InscriptionCard({inscription}: {inscription: Inscription}) {
  const country =
    inscription.eventData.placeNationCode ||
    inscription.eventData.organiserNationCode ||
    "Non renseigné";

  const disciplines = Array.from(
    new Set((inscription.eventData.competitions ?? []).map((c) => c.eventCode))
  ).filter(Boolean);

  const raceLevels = Array.from(
    new Set(
      (inscription.eventData.competitions ?? []).map(
        (c: CompetitionItem) => c.categoryCode
      )
    )
  ).filter(Boolean);

  const sexes = ["M", "W"].filter((sex) =>
    (inscription.eventData.competitions ?? []).some(
      (c: CompetitionItem) => c.genderCode === sex
    )
  );

  const codexes = Array.from(
    new Set(
      (inscription.eventData.competitions ?? []).map(
        (c: CompetitionItem) => c.codex
      )
    )
  );

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        {/* Ligne 1: Date, Station, Pays, Bouton */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">
                {format(
                  parseISO(inscription.eventData.startDate),
                  "dd/MM/yyyy"
                )}
              </span>
              <StatusBadges 
                inscription={inscription} 
                size="sm"
                showEmailSent={true}
                showLabels={false}
              />
              {/* Badge Rappel */}
              {(() => {
                const eventDate = new Date(inscription.eventData.startDate);
                const deadlineDate = new Date(eventDate);
                // Use UTC methods to avoid timezone-related bugs
                deadlineDate.setUTCDate(eventDate.getUTCDate() - 3); // J-3
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);
                deadlineDate.setUTCHours(0, 0, 0, 0);
                const diffTime = deadlineDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Si l'email a déjà été envoyé, on n'affiche rien (ou une petite coche)
                if (inscription.status === "email_sent") {
                  return (
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-1 py-0 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      ✓
                    </Badge>
                  );
                }
                
                // Sinon on affiche le compte à rebours avec les couleurs appropriées
                let badgeClass = "";
                let text = "";
                
                if (diffDays < 0) {
                  badgeClass = "bg-gray-100 text-gray-800 border-gray-200";
                  text = "Passé";
                } else if (diffDays === 0) {
                  badgeClass = "bg-red-100 text-red-800 border-red-200";
                  text = "J-0";
                } else if (diffDays === 1) {
                  badgeClass = "bg-orange-100 text-orange-800 border-orange-200";
                  text = "J-1";
                } else if (diffDays === 2) {
                  badgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
                  text = "J-2";
                } else {
                  badgeClass = "bg-green-100 text-green-800 border-green-200";
                  text = `J-${diffDays}`;
                }
                
                return (
                  <Badge className={`${badgeClass} text-xs px-1 py-0 flex items-center gap-1`}>
                    <Mail className="w-3 h-3" />
                    {text}
                  </Badge>
                );
              })()}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span className="font-medium truncate">
                {inscription.eventData.place?.[0]?.toUpperCase() +
                  inscription.eventData.place?.slice(1) || "Non renseigné"}
              </span>
              <CountryDisplay country={country} />
            </div>
          </div>
          <Link href={`/inscriptions/${inscription.id}`}>
            <Button
              size="sm"
              className="bg-[#3d7cf2] hover:bg-[#2c5dd9] text-white text-xs px-2 py-1 ml-2"
            >
              Détails
            </Button>
          </Link>
        </div>

        {/* Ligne 2: Disciplines et Race Levels */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-600 text-xs">Disc:</span>
            <BadgeList
              items={disciplines}
              colorMap={colorBadgePerDiscipline}
              maxDisplay={2}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600 text-xs">Niv:</span>
            <BadgeList
              items={raceLevels}
              colorMap={colorBadgePerRaceLevel}
              maxDisplay={2}
            />
          </div>
        </div>

        {/* Ligne 3: Sexe, Codex, Compétiteurs */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Sexe:</span>
            <div className="flex gap-1">
              {sexes.map((sex) => (
                <Badge
                  key={sex}
                  variant="outline"
                  className={`${
                    colorBadgePerGender[sex === "M" ? "M" : "W"] || ""
                  } text-white text-xs px-1 py-0`}
                >
                  {sex}
                </Badge>
              ))}
            </div>
          </div>
          {codexes.length > 0 && (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <span className="text-gray-600">Codex:</span>
              <div className="flex gap-1 flex-wrap">
                {codexes.slice(0, 2).map((codex, i) => (
                  <Badge
                    key={`${codex}-${i}`}
                    variant="outline"
                    className="text-xs px-1 py-0"
                  >
                    {codex}
                  </Badge>
                ))}
                {codexes.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{codexes.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Compét:</span>
            <CompetitorCountCell inscriptionId={inscription.id} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
