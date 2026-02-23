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
import {Loader2} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {getEffectiveStatusForFilter, isMixedEvent, getGenderStatus} from "@/app/lib/genderStatus";

// Athlete count component - compact inline display
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
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />;
  }

  if (isError || !Array.isArray(data)) {
    return null;
  }

  const menCount = data.filter((c: {gender?: string}) => c.gender === "M").length;
  const womenCount = data.filter((c: {gender?: string}) => c.gender === "W").length;

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {hasM && (
        <div className="flex items-center gap-0.5">
          <span className={`w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center ${colorBadgePerGender["M"]}`}>
            M
          </span>
          <span className="text-xs font-semibold tabular-nums text-slate-500">
            {menCount}
          </span>
        </div>
      )}
      {hasW && (
        <div className="flex items-center gap-0.5">
          <span className={`w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center ${colorBadgePerGender["W"]}`}>
            W
          </span>
          <span className="text-xs font-semibold tabular-nums text-slate-500">
            {womenCount}
          </span>
        </div>
      )}
    </div>
  );
};

// Deadline badge - compact, inline for mixed events
const DeadlineBadge = ({inscription}: {inscription: Inscription}) => {
  const startDate = inscription.eventData.startDate;
  const eventDate = new Date(startDate);
  const deadlineDate = new Date(eventDate);
  deadlineDate.setUTCDate(eventDate.getUTCDate() - 3);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  deadlineDate.setUTCHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formatSentDate = (date: Date | string | null | undefined) => {
    if (!date) return null;
    return format(new Date(date), "dd/MM HH:mm");
  };

  const countdownTag = (days: number) => {
    let classes = "";
    let text = "";
    if (days < 0) {
      classes = "text-red-900 bg-red-200 font-bold";
      text = "Passé";
    } else if (days === 0) {
      classes = "text-red-700 bg-red-100 animate-pulse";
      text = "J-0";
    } else if (days <= 2) {
      classes = "text-amber-700 bg-amber-100";
      text = `J-${days}`;
    } else {
      classes = "text-sky-700 bg-sky-50";
      text = `J-${days}`;
    }
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${classes}`}>
        {text}
      </span>
    );
  };

  const mixed = isMixedEvent(inscription.eventData);

  if (mixed) {
    const menInfo = getGenderStatus(inscription, "M");
    const womenInfo = getGenderStatus(inscription, "W");

    return (
      <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
        {menInfo.status !== "not_concerned" && (
          menInfo.status === "email_sent" && menInfo.emailSentAt ? (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <span className={`w-3 h-3 rounded text-[7px] font-bold text-white flex items-center justify-center ${colorBadgePerGender["M"]} flex-shrink-0`}>M</span>
              ✓ {formatSentDate(menInfo.emailSentAt)}
            </span>
          ) : (
            <div className="flex items-center gap-0.5">
              <span className={`w-3 h-3 rounded text-[7px] font-bold text-white flex items-center justify-center ${colorBadgePerGender["M"]} flex-shrink-0`}>M</span>
              {countdownTag(diffDays)}
            </div>
          )
        )}
        {womenInfo.status !== "not_concerned" && (
          womenInfo.status === "email_sent" && womenInfo.emailSentAt ? (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <span className={`w-3 h-3 rounded text-[7px] font-bold text-white flex items-center justify-center ${colorBadgePerGender["W"]} flex-shrink-0`}>W</span>
              ✓ {formatSentDate(womenInfo.emailSentAt)}
            </span>
          ) : (
            <div className="flex items-center gap-0.5">
              <span className={`w-3 h-3 rounded text-[7px] font-bold text-white flex items-center justify-center ${colorBadgePerGender["W"]} flex-shrink-0`}>W</span>
              {countdownTag(diffDays)}
            </div>
          )
        )}
      </div>
    );
  }

  // Non-mixed
  if (inscription.status === "email_sent") {
    const sentDate = formatSentDate(inscription.emailSentAt);
    return (
      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex-shrink-0">
        ✓ {sentDate || "Envoyé"}
      </span>
    );
  }

  return <div className="flex-shrink-0">{countdownTag(diffDays)}</div>;
};

export function InscriptionCard({inscription}: {inscription: Inscription}) {
  const {flagUrl, countryLabel} = useCountryInfo(
    inscription.eventData.placeNationCode ||
    inscription.eventData.organiserNationCode ||
    ""
  );

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

  const codexes = Array.from(
    new Set(
      (inscription.eventData.competitions ?? []).map(
        (c: CompetitionItem) => c.codex
      )
    )
  ).filter(Boolean);

  const sexes = ["M", "W"].filter((sex) =>
    (inscription.eventData.competitions ?? []).some(
      (c: CompetitionItem) => c.genderCode === sex
    )
  );

  const eventDate = parseISO(inscription.eventData.startDate);
  const day = format(eventDate, "d");
  const month = format(eventDate, "MMM", {locale: fr});
  const weekday = format(eventDate, "EEE", {locale: fr});

  const place = inscription.eventData.place || "—";
  const formattedPlace = place.charAt(0).toUpperCase() + place.slice(1).toLowerCase();

  // Urgency styling
  const effectiveStatus = getEffectiveStatusForFilter(inscription);
  const deadlineDate = new Date(eventDate);
  deadlineDate.setUTCDate(eventDate.getUTCDate() - 3);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  deadlineDate.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isUrgent = effectiveStatus === "open" && diffDays >= 0 && diffDays <= 1;
  const isApproaching = effectiveStatus === "open" && diffDays >= 2 && diffDays <= 3;

  // Discipline order
  const disciplineOrder = ["DH", "SG", "GS", "SL", "AC"];
  const sortedDisciplines = [...disciplines].sort((a, b) => {
    const indexA = disciplineOrder.indexOf(a);
    const indexB = disciplineOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Urgency-driven date block color
  const dateBlockClasses = isUrgent
    ? "bg-red-600"
    : isApproaching
      ? "bg-amber-600"
      : "bg-slate-700";

  // Card border/background based on urgency
  const cardClasses = isUrgent
    ? "border-red-200 bg-red-50/30"
    : isApproaching
      ? "border-amber-200 bg-amber-50/20"
      : "border-slate-200";

  return (
    <Link href={`/inscriptions/${inscription.id}`} className="block">
      <article
        className={`
          group bg-white rounded-xl overflow-hidden
          border transition-all duration-150
          active:scale-[0.98]
          ${cardClasses}
        `}
      >
        <div className="flex items-stretch">
          {/* DATE BLOCK - urgency-colored */}
          <div className={`flex-shrink-0 w-[4.25rem] text-white flex flex-col items-center justify-center py-3 transition-colors ${dateBlockClasses}`}>
            <span className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
              {weekday}
            </span>
            <span className="text-3xl font-black leading-none tracking-tight">
              {day}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
              {month}
            </span>
          </div>

          {/* CONTENT */}
          <div className="flex-1 min-w-0 py-2.5 px-3 flex flex-col gap-1.5">
            {/* Row 1: Location + Flag + Deadline */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-slate-900 truncate">
                  {formattedPlace}
                </h3>
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
              <DeadlineBadge inscription={inscription} />
            </div>

            {/* Row 2: Disciplines + Race Levels */}
            <div className="flex items-center gap-1 flex-wrap">
              {sortedDisciplines.map((discipline) => (
                <span
                  key={discipline}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    colorBadgePerDiscipline[discipline] || "bg-slate-200 text-slate-700"
                  }`}
                >
                  {discipline}
                </span>
              ))}
              {raceLevels.map((level) => (
                <span
                  key={level}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    colorBadgePerRaceLevel[level] || "bg-slate-200 text-slate-600"
                  }`}
                >
                  {level}
                </span>
              ))}
            </div>

            {/* Row 3: Codex + Athletes - subtle metadata */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
              {codexes.length > 0 ? (
                <span className="text-[10px] font-mono text-slate-400 truncate">
                  {codexes.slice(0, 3).join(" \u00b7 ")}
                  {codexes.length > 3 && ` +${codexes.length - 3}`}
                </span>
              ) : (
                <span />
              )}
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
