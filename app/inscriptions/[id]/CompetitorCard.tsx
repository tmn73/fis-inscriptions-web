"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
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
  // Filter competitions based on gender filter
  const filteredCompetitions = competitions
    .filter((competition) => {
      if (genderFilter === "both") return true;
      return competition.genderCode === genderFilter;
    })
    .sort((a, b) => a.codex - b.codex);

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Ligne 1: Nom + Actions */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold text-base text-slate-800 truncate">
                {competitor.lastname} {competitor.firstname}
              </h3>
              {competitor.birthdate && (
                <span className="text-sm text-slate-500 font-medium whitespace-nowrap">
                  ({new Date(competitor.birthdate).getFullYear()})
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 truncate">{competitor.skiclub}</p>
            {competitor.addedByEmail && (
              <p className="text-xs text-slate-500 truncate mt-1">
                Ajouté par: {competitor.addedByEmail}
              </p>
            )}
          </div>
          {permissionToEdit && (
            <Button
              variant="ghost"
              size="sm"
              title="Gérer les inscriptions"
              className="cursor-pointer ml-2 h-8 w-8 p-0"
              disabled={inscriptionStatus !== "open"}
              onClick={() => onManageRegistrations(competitor.competitorid)}
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </Button>
          )}
        </div>

        {/* Ligne 2: Badge genre */}
        <div className="mb-3">
          <Badge
            className={`${
              colorBadgePerGender[competitor.gender as "M" | "W"] || "bg-gray-300"
            } text-white text-xs px-2 py-1`}
          >
            {competitor.gender === "M" ? "Homme" : "Femme"}
          </Badge>
        </div>

        {/* Ligne 3: Codex et points */}
        <div className="space-y-2">
          {filteredCompetitions.map((competition) => {
            const isInscrit = competitor.codexNumbers.includes(String(competition.codex));
            const points = isInscrit 
              ? (competitor.points[competition.eventCode] === null ||
                 competitor.points[competition.eventCode] === undefined ||
                 String(competitor.points[competition.eventCode]).trim() === "" ||
                 String(competitor.points[competition.eventCode]) === "-"
                  ? "999"
                  : competitor.points[competition.eventCode])
              : "-";

            return (
              <div
                key={competition.codex}
                className={`flex items-center justify-between p-2 rounded border ${
                  isInscrit ? "bg-slate-50 border-slate-200" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {competition.date && (
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(competition.date).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit"
                      })}
                    </span>
                  )}
                  <span className="font-mono text-sm font-medium">
                    {String(competition.codex).padStart(4, "0")}
                  </span>
                  <Badge
                    className={`text-xs px-1.5 py-0.5 ${
                      colorBadgePerDiscipline[competition.eventCode] || "bg-gray-200"
                    }`}
                  >
                    {competition.eventCode}
                  </Badge>
                  <Badge
                    className={`text-xs px-1.5 py-0.5 text-white ${
                      colorBadgePerGender[competition.genderCode] || ""
                    }`}
                  >
                    {competition.genderCode}
                  </Badge>
                  <Badge
                    className={`text-xs px-1.5 py-0.5 ${
                      colorBadgePerRaceLevel[competition.categoryCode] || "bg-gray-300"
                    }`}
                  >
                    {competition.categoryCode}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-slate-700">
                  {points}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}