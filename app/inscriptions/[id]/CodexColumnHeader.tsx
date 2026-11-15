import React from "react";
import {Badge} from "@/components/ui/badge";
import {colorBadgePerDiscipline, colorBadgePerRaceLevel} from "@/app/lib/colorMappers";

interface CodexColumnHeaderProps {
  date?: string;
  codex: number | string;
  eventCode: string;
  // Level of the race: FIS, NJR, NC...
  categoryCode?: string;
  genderCode?: string;
  registeredCount: number;
  // Accessible text of the count, e.g. "4 inscrits".
  registeredLabel: string;
  sorted: false | "asc" | "desc";
  onToggleSort: () => void;
}

// Header of one race column: date, then codex, discipline, level and "<count> <M|W>".
export const CodexColumnHeader = ({
  date,
  codex,
  eventCode,
  categoryCode,
  genderCode,
  registeredCount,
  registeredLabel,
  sorted,
  onToggleSort,
}: CodexColumnHeaderProps) => (
  <div
    className="flex flex-col items-center justify-center min-w-[80px] select-none cursor-pointer"
    onClick={onToggleSort}
  >
    {date && <div className="text-xs text-slate-500 font-medium mb-0.5">{date}</div>}
    <div className="flex items-center gap-1.5">
      <span className="font-medium text-slate-700">{codex}</span>
      <Badge className={`text-xs px-1.5 py-0.5 ${colorBadgePerDiscipline[eventCode] || ""}`}>
        {eventCode}
      </Badge>
      {categoryCode && (
        <Badge
          className={`text-xs px-1.5 py-0.5 ${
            colorBadgePerRaceLevel[categoryCode] || "bg-gray-200 text-slate-700"
          }`}
        >
          {categoryCode}
        </Badge>
      )}
      <span
        title={registeredLabel}
        className={`text-xs font-medium whitespace-nowrap ${
          genderCode === "M" ? "text-blue-600" : "text-pink-600"
        }`}
      >
        {registeredCount} {genderCode}
      </span>
      {sorted === "asc" && <span>↑</span>}
      {sorted === "desc" && <span>↓</span>}
    </div>
  </div>
);
