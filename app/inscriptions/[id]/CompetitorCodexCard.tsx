"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, ChevronDown } from "lucide-react";
import { InscriptionCompetitor } from "@/app/types";
import { format } from "date-fns";

interface CompetitorCodexCardProps {
  competitor: InscriptionCompetitor;
  permissionToEdit: boolean;
  inscriptionStatus: string;
  onManageRegistrations: (competitorId: number) => void;
}

export function CompetitorCodexCard({
  competitor,
  permissionToEdit,
  inscriptionStatus,
  onManageRegistrations,
}: CompetitorCodexCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const points =
    competitor.points !== null && competitor.points !== undefined
      ? competitor.points
      : "-";

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

        {/* Points + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-slate-700 tabular-nums">
            {points}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <Badge
                variant="outline"
                className={`px-1.5 py-0.5 ${
                  competitor.gender === "M"
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : "bg-pink-100 text-pink-700 border-pink-300"
                }`}
              >
                {competitor.gender === "M" ? "Homme" : "Femme"}
              </Badge>
              {competitor.birthdate && (
                <span className="text-slate-500">
                  Né(e) le {format(new Date(competitor.birthdate), "dd/MM/yyyy")}
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

          {/* Info ajout */}
          {(competitor.addedByEmail || competitor.createdAt) && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400">
              {competitor.addedByEmail && (
                <span>par {competitor.addedByEmail}</span>
              )}
              {competitor.createdAt && (
                <span>
                  {competitor.addedByEmail ? " · " : ""}
                  {format(new Date(competitor.createdAt), "dd/MM/yyyy HH:mm")}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
