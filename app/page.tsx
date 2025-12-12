"use client";

import {useState, useCallback} from "react";
import {InscriptionsTable} from "@/components/InscriptionsTable";
import {QuickStatsBar} from "@/components/QuickStatsBar";

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<string>("nextRaces");

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
  }, []);

  return (
    <div className="space-y-4">
      {/* Quick stats - clickable to filter */}
      <QuickStatsBar onFilterChange={handleFilterChange} activeFilter={activeFilter} />

      {/* Inscriptions table */}
      <InscriptionsTable externalFilter={activeFilter} />
    </div>
  );
}
