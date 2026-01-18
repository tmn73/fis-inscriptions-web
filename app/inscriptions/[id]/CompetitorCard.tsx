"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, ChevronDown } from "lucide-react";
import {
  colorBadgePerDiscipline,
  colorBadgePerGender,
  colorBadgePerRaceLevel,
} from "@/app/lib/colorMappers";
import type { CompetitionItem } from "@/app/types";

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
};

interface CompetitorCardProps {
  competitor: CompetitorRow;
  competitions: CompetitionItem[];
  genderFilter: "both" | "M" | "W";
  permissionToEdit: boolean;
  inscriptionStatus: string;
  onManageRegistrations: (competitorId: number) => void;
}

export function CompetitorCard({
  competitor,
  competitions,
  genderFilter,
  permissionToEdit,
  inscriptionStatus,
  onManageRegistrations,
}: CompetitorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredCompetitions = competitions
    .filter((competition) => {
      if (genderFilter === "both") return true;
      return competition.genderCode === genderFilter;
    })
    .sort((a, b) => a.codex - b.codex);

  const registeredCount = filteredCompetitions.filter((c) =>
    competitor.codexNumbers.includes(String(c.codex))
  ).length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header - cliquable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
          isExpanded ? "bg-slate-50" : "hover:bg-slate-50/50"
        }`}
      >
        {/* Indicateur genre */}
        <div
          className={`w-1 h-6 rounded-full shrink-0 ${
            competitor.gender === "M" ? "bg-blue-800" : "bg-purple-500"
          }`}
        />

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-slate-800 truncate">
              {competitor.lastname} {competitor.firstname}
            </span>
            {competitor.birthdate && (
              <span className="text-xs text-slate-400 tabular-nums">
                ({new Date(competitor.birthdate).getFullYear()})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">{competitor.skiclub}</p>
        </div>

        {/* Compteur + chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-slate-400 tabular-nums">
            {registeredCount}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Contenu déployable */}
      {isExpanded && (
        <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50">
          {/* Meta */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge
                className={`${
                  colorBadgePerGender[competitor.gender as "M" | "W"] || "bg-gray-300"
                } text-white text-xs px-2 py-0.5`}
              >
                {competitor.gender === "M" ? "Homme" : "Femme"}
              </Badge>
              {competitor.addedByEmail && (
                <span className="text-xs text-slate-400">
                  par {competitor.addedByEmail}
                </span>
              )}
            </div>
            {permissionToEdit && (
              <Button
                variant="ghost"
                size="sm"
                title="Gérer les inscriptions"
                className="h-7 w-7 p-0"
                disabled={inscriptionStatus !== "open"}
                onClick={(e) => {
                  e.stopPropagation();
                  onManageRegistrations(competitor.competitorid);
                }}
              >
                <Settings className="w-4 h-4 text-slate-500" />
              </Button>
            )}
          </div>

          {/* Liste des courses - seulement celles où le compétiteur est inscrit */}
          <div className="space-y-1">
            {filteredCompetitions
              .filter((c) => competitor.codexNumbers.includes(String(c.codex)))
              .map((competition) => {
              const points =
                competitor.points[competition.eventCode] === null ||
                competitor.points[competition.eventCode] === undefined ||
                String(competitor.points[competition.eventCode]).trim() === "" ||
                String(competitor.points[competition.eventCode]) === "-"
                  ? "-"
                  : competitor.points[competition.eventCode];

              return (
                <div
                  key={competition.codex}
                  className="flex items-center justify-between px-2 py-1 rounded text-xs bg-white border border-slate-200"
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {competition.date && (
                      <span className="text-slate-400 tabular-nums">
                        {new Date(competition.date).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    )}
                    <span className="font-mono font-medium text-slate-600">
                      {String(competition.codex).padStart(4, "0")}
                    </span>
                    <Badge
                      className={`px-1 py-0 text-[10px] ${
                        colorBadgePerDiscipline[competition.eventCode] || "bg-gray-200"
                      }`}
                    >
                      {competition.eventCode}
                    </Badge>
                    <Badge
                      className={`px-1 py-0 text-[10px] text-white ${
                        colorBadgePerGender[competition.genderCode] || ""
                      }`}
                    >
                      {competition.genderCode}
                    </Badge>
                    <Badge
                      className={`px-1 py-0 text-[10px] ${
                        colorBadgePerRaceLevel[competition.categoryCode] || "bg-gray-300"
                      }`}
                    >
                      {competition.categoryCode}
                    </Badge>
                  </div>
                  <span className="font-medium tabular-nums text-slate-700">
                    {points}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
