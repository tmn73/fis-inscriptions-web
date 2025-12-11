"use client";
import Link from "next/link";
import {format, parseISO} from "date-fns";
import {fr} from "date-fns/locale";
import {Inscription} from "@/app/types";
import type {CompetitionItem} from "@/app/types";
import Image from "next/image";
import {useCountryInfo} from "@/hooks/useCountryInfo";
import {
  colorBadgePerDiscipline,
  colorBadgePerRaceLevel,
  colorBadgePerGender,
} from "@/app/lib/colorMappers";
import {Loader2, MapPin, ChevronRight, Users} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {StatusBadges} from "@/components/ui/status-badges";

// Athlete count component with refined visual design
const AthleteStats = ({
  inscriptionId,
  genderCodes,
}: {
  inscriptionId: number;
  genderCodes: string[];
}) => {
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

  const hasM = genderCodes.includes("M");
  const hasW = genderCodes.includes("W");

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !Array.isArray(data)) {
    return null;
  }

  const menCount = data.filter((c: {gender?: string}) => c.gender === "M").length;
  const womenCount = data.filter((c: {gender?: string}) => c.gender === "W").length;

  return (
    <div className="flex items-center gap-2">
      {hasM && (
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-md ${colorBadgePerGender["M"]} flex items-center justify-center`}>
            <span className="text-[10px] font-bold text-white">M</span>
          </div>
          <span className={`text-sm font-semibold tabular-nums ${
            menCount > 0 ? "text-blue-900" : "text-slate-300"
          }`}>
            {menCount}
          </span>
        </div>
      )}
      {hasW && (
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-md ${colorBadgePerGender["W"]} flex items-center justify-center`}>
            <span className="text-[10px] font-bold text-white">W</span>
          </div>
          <span className={`text-sm font-semibold tabular-nums ${
            womenCount > 0 ? "text-purple-700" : "text-slate-300"
          }`}>
            {womenCount}
          </span>
        </div>
      )}
      {!hasM && !hasW && (
        <span className="text-xs text-slate-400">—</span>
      )}
    </div>
  );
};

// Location display with flag
const LocationDisplay = ({place, country}: {place: string; country: string}) => {
  const {flagUrl, countryLabel} = useCountryInfo(country);

  const formattedPlace = place
    ? place.charAt(0).toUpperCase() + place.slice(1).toLowerCase()
    : "Non renseigné";

  return (
    <div className="flex items-center gap-2 text-slate-600">
      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      <span className="font-medium text-sm truncate">{formattedPlace}</span>
      {flagUrl && (
        <Image
          src={flagUrl}
          alt={countryLabel}
          className="w-5 h-3.5 object-cover rounded-sm ring-1 ring-slate-200 flex-shrink-0"
          loading="lazy"
          width={20}
          height={14}
        />
      )}
    </div>
  );
};

// Deadline countdown badge
const DeadlineCountdown = ({startDate, status}: {startDate: string; status: string}) => {
  const eventDate = new Date(startDate);
  const deadlineDate = new Date(eventDate);
  deadlineDate.setUTCDate(eventDate.getUTCDate() - 3);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  deadlineDate.setUTCHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (status === "email_sent") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs font-semibold text-emerald-700">Envoyé</span>
      </div>
    );
  }

  let bgClass = "";
  let textClass = "";
  let dotClass = "";
  let text = "";

  if (diffDays < 0) {
    bgClass = "bg-slate-50 border-slate-200";
    textClass = "text-slate-500";
    dotClass = "bg-slate-400";
    text = "Passé";
  } else if (diffDays === 0) {
    bgClass = "bg-red-50 border-red-200";
    textClass = "text-red-700";
    dotClass = "bg-red-500 animate-pulse";
    text = "Aujourd'hui";
  } else if (diffDays <= 2) {
    bgClass = "bg-amber-50 border-amber-200";
    textClass = "text-amber-700";
    dotClass = "bg-amber-500";
    text = `J-${diffDays}`;
  } else {
    bgClass = "bg-sky-50 border-sky-200";
    textClass = "text-sky-700";
    dotClass = "bg-sky-500";
    text = `J-${diffDays}`;
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${bgClass}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className={`text-xs font-semibold ${textClass}`}>{text}</span>
    </div>
  );
};

// Discipline pills with sport-authentic colors
const DisciplinePills = ({disciplines}: {disciplines: string[]}) => {
  const disciplineOrder = ["DH", "SG", "GS", "SL", "AC"];
  const sorted = [...disciplines].sort((a, b) => {
    const indexA = disciplineOrder.indexOf(a);
    const indexB = disciplineOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex gap-1.5 flex-wrap">
      {sorted.map((discipline) => (
        <span
          key={discipline}
          className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${
            colorBadgePerDiscipline[discipline] || "bg-slate-200 text-slate-700"
          }`}
        >
          {discipline}
        </span>
      ))}
    </div>
  );
};

// Race level badges
const RaceLevelBadges = ({levels}: {levels: string[]}) => {
  if (levels.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap">
      {levels.slice(0, 3).map((level) => (
        <span
          key={level}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            colorBadgePerRaceLevel[level] || "bg-slate-200 text-slate-600"
          }`}
        >
          {level}
        </span>
      ))}
      {levels.length > 3 && (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-slate-100">
          +{levels.length - 3}
        </span>
      )}
    </div>
  );
};

export function InscriptionCard({inscription}: {inscription: Inscription}) {
  const country =
    inscription.eventData.placeNationCode ||
    inscription.eventData.organiserNationCode ||
    "";

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

  const eventDate = parseISO(inscription.eventData.startDate);
  const day = format(eventDate, "dd");
  const month = format(eventDate, "MMM", {locale: fr}).toUpperCase();
  const year = format(eventDate, "yyyy");

  return (
    <Link href={`/inscriptions/${inscription.id}`} className="block">
      <article className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden">
        {/* Subtle gradient accent at top */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 opacity-80" />

        <div className="p-4 pt-5">
          {/* Header: Date block + Status + Arrow */}
          <div className="flex items-start gap-3 mb-3">
            {/* Date block */}
            <div className="flex-shrink-0 w-14 text-center">
              <div className="bg-slate-900 text-white rounded-lg px-2 py-1.5">
                <div className="text-2xl font-black leading-none tracking-tight">{day}</div>
                <div className="text-[10px] font-semibold tracking-wider opacity-80 mt-0.5">{month}</div>
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">{year}</div>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Location */}
              <LocationDisplay
                place={inscription.eventData.place || ""}
                country={country}
              />

              {/* Status row */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadges
                  inscription={inscription}
                  size="sm"
                  showEmailSent={false}
                  showLabels={true}
                />
                <DeadlineCountdown
                  startDate={inscription.eventData.startDate}
                  status={inscription.status}
                />
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-3" />

          {/* Bottom section: Disciplines, Levels, Athletes */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Disciplines & Levels */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DisciplinePills disciplines={disciplines} />
                <RaceLevelBadges levels={raceLevels} />
              </div>

              {/* Codex - subtle secondary info */}
              {codexes.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Codex</span>
                  <div className="flex gap-1">
                    {codexes.slice(0, 3).map((codex, i) => (
                      <span
                        key={`${codex}-${i}`}
                        className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded"
                      >
                        {codex}
                      </span>
                    ))}
                    {codexes.length > 3 && (
                      <span className="text-[10px] text-slate-400">+{codexes.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Athlete counts */}
            <div className="flex-shrink-0 pl-3 border-l border-slate-100">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Athlètes</span>
              </div>
              <AthleteStats
                inscriptionId={inscription.id}
                genderCodes={sexes}
              />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
