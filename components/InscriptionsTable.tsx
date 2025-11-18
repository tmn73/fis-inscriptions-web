"use client";
import React from "react";
import {useQuery} from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  useReactTable,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {TableBody, TableCell, TableHead} from "@/components/ui/table";
import {Table, TableHeader, TableRow} from "@/components/ui/table";
import {useState, useMemo} from "react";
import {Button} from "@/components/ui/button";
import {Loader2, Mail} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {useTranslations} from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {format, parseISO} from "date-fns";
import Link from "next/link";
import {
  colorBadgePerDiscipline,
  colorBadgePerRaceLevel,
  colorBadgePerGender,
} from "@/app/lib/colorMappers";
import {DebouncedInput} from "@/components/ui/debounced-input";
import {Inscription} from "@/app/types";
import type {CompetitionItem} from "@/app/types";
import Image from "next/image";
import {useCountryInfo} from "@/hooks/useCountryInfo";
import {InscriptionCard} from "@/components/InscriptionCard";
import {ChevronDown, ChevronUp} from "lucide-react";
import {
  getSeasonFromDate,
  getCurrentSeason,
  getSeasonsFromInscriptions,
} from "@/app/lib/dates";
import {StatusBadges} from "@/components/ui/status-badges";

// Composant pour afficher le nombre de compétiteurs pour une inscription
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

// Composant pour afficher le drapeau et le code pays
const CountryCell = ({country}: {country: string}) => {
  const {flagUrl, countryLabel} = useCountryInfo(country);
  return (
    <span className="flex items-center gap-2">
      {flagUrl && (
        <Image
          src={flagUrl}
          alt={countryLabel}
          className="inline-block w-5 h-4 object-cover border border-gray-200 rounded"
          loading="lazy"
          width={20}
          height={16}
        />
      )}
      {countryLabel}
    </span>
  );
};

// Nouveau composant pour l'élément SelectItem de pays
const CountrySelectItem = ({countryCode}: {countryCode: string}) => {
  const {flagUrl, countryLabel} = useCountryInfo(countryCode);
  return (
    <SelectItem key={countryCode} value={countryCode}>
      <span className="flex items-center gap-2">
        {flagUrl && (
          <Image
            src={flagUrl}
            alt={countryLabel}
            className="inline-block w-5 h-4 object-cover border border-gray-200 rounded"
            loading="lazy"
            width={20}
            height={16}
          />
        )}
        {countryLabel}
      </span>
    </SelectItem>
  );
};

export function InscriptionsTable() {
  const t = useTranslations("inscriptions.table");
  const tHeaders = useTranslations("inscriptions.table.headers");
  const tFilters = useTranslations("inscriptions.table.filters");
  const tStatus = useTranslations("inscriptions.status");
  const tGender = useTranslations("inscriptions.gender");
  const tCommon = useTranslations("common");

  const [sorting, setSorting] = useState<SortingState>([
    {id: "startDate", desc: false},
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    {id: "status", value: "open"},
    {id: "season", value: getCurrentSeason()},
  ]);

  const [showFilters, setShowFilters] = useState(false);

  const {data, isLoading} = useQuery<Inscription[]>({
    queryKey: ["inscriptions"],
    queryFn: () => fetch("/api/inscriptions").then((res) => res.json()),
  });

  // Mémoïsation forte pour éviter les recalculs infinis
  const stableData = useMemo(() => data ?? [], [data]);

  // Génération dynamique des options de filtres à partir de stableData
  const locationOptions = useMemo(() => {
    return Array.from(
      new Set(stableData.map((row) => row.eventData.place).filter(Boolean))
    )
      .map((name) => ({value: name, label: name}))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [stableData]);

  const countryOptions = useMemo(() => {
    return Array.from(
      new Set(
        stableData
          .map(
            (row) =>
              row.eventData.placeNationCode || row.eventData.organiserNationCode
          )
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [stableData]);

  const codexOptions = useMemo(() => {
    return Array.from(
      new Set(
        stableData.flatMap((row) =>
          (row.eventData.competitions ?? []).map(
            (c: CompetitionItem) => c.codex
          )
        )
      )
    ).sort((a, b) => Number(a) - Number(b));
  }, [stableData]);

  const disciplineOptions = useMemo(() => {
    const disciplineOrder = ["DH", "SG", "GS", "SL", "AC"]; // Ordre logique des disciplines
    const allDisciplines = Array.from(
      new Set(
        stableData.flatMap((row) =>
          (row.eventData.competitions ?? []).map((c) => c.eventCode)
        )
      )
    );
    
    return allDisciplines.sort((a, b) => {
      const indexA = disciplineOrder.indexOf(a);
      const indexB = disciplineOrder.indexOf(b);
      
      // Si les deux sont dans l'ordre prédéfini, on utilise cet ordre
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // Si un seul est dans l'ordre prédéfini, il vient en premier
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // Sinon, ordre alphabétique
      return String(a).localeCompare(String(b));
    });
  }, [stableData]);

  const raceLevelOptions = useMemo(() => {
    return Array.from(
      new Set(
        stableData.flatMap((row) =>
          (row.eventData.competitions ?? []).map(
            (c: CompetitionItem) => c.categoryCode
          )
        )
      )
    ).sort((a, b) => String(a).localeCompare(String(b)));
  }, [stableData]);

  const sexOptions = useMemo(() => {
    return Array.from(
      new Set(
        stableData.flatMap((row) =>
          (row.eventData.competitions ?? []).map(
            (c: CompetitionItem) => c.genderCode
          )
        )
      )
    ).sort((a, b) => String(a).localeCompare(String(b)));
  }, [stableData]);

  const seasonOptions = useMemo(() => {
    return getSeasonsFromInscriptions(stableData);
  }, [stableData]);

  const columns: ColumnDef<Inscription>[] = [
    {
      id: "actions",
      cell: ({row}) => {
        return (
          <Link href={`/inscriptions/${row.original.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-[#3d7cf2] hover:bg-[#f0f7ff] cursor-pointer text-base px-2 py-1"
            >
              {tCommon("actions.details")}
            </Button>
          </Link>
        );
      },
      header: tHeaders("actions"),
    },
    {
      accessorFn: (row) => row.eventData.startDate,
      id: "startDate",
      cell: ({row}) => {
        return (
          <div>
            {format(parseISO(row.original.eventData.startDate), "dd/MM/yyyy")}
          </div>
        );
      },
      header: ({column}) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          {tHeaders("date")}
        </Button>
      ),
      filterFn: (row, id, filterValue) => {
        if (!filterValue) return true;
        return row.original.eventData.startDate.includes(filterValue);
      },
      sortingFn: "datetime",
    },
    {
      id: "reminder",
      header: tHeaders("reminder"),
      accessorFn: (row) => {
        const eventDate = new Date(row.eventData.startDate);
        const deadlineDate = new Date(eventDate);
        // Use UTC methods to avoid timezone-related bugs
        deadlineDate.setUTCDate(eventDate.getUTCDate() - 3); // J-3
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        deadlineDate.setUTCHours(0, 0, 0, 0);
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      },
      cell: ({row}) => {
        const eventDate = new Date(row.original.eventData.startDate);
        const deadlineDate = new Date(eventDate);
        // Use UTC methods to avoid timezone-related bugs
        deadlineDate.setUTCDate(eventDate.getUTCDate() - 3); // J-3
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        deadlineDate.setUTCHours(0, 0, 0, 0);
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Si l'email a déjà été envoyé, on affiche une coche verte
        if (row.original.status === "email_sent") {
          return (
            <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              ✓ {t("reminder.sent")}
            </Badge>
          );
        }

        // Sinon on affiche le compte à rebours avec les couleurs appropriées
        let badgeClass = "";
        let text = "";

        if (diffDays < 0) {
          badgeClass = "bg-gray-100 text-gray-800 border-gray-200";
          text = t("reminder.past", {days: Math.abs(diffDays)});
        } else if (diffDays === 0) {
          badgeClass = "bg-red-100 text-red-800 border-red-200";
          text = t("reminder.warning");
        } else if (diffDays === 1) {
          badgeClass = "bg-orange-100 text-orange-800 border-orange-200";
          text = "D-1";
        } else if (diffDays === 2) {
          badgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
          text = "D-2";
        } else {
          badgeClass = "bg-green-100 text-green-800 border-green-200";
          text = `D-${diffDays}`;
        }
        
        return (
          <Badge className={`${badgeClass} flex items-center gap-1`}>
            <Mail className="w-3 h-3" />
            {text}
          </Badge>
        );
      },
      sortingFn: (rowA, rowB) => {
        const daysA = rowA.getValue("reminder") as number;
        const daysB = rowB.getValue("reminder") as number;
        return daysA - daysB;
      },
    },
    {
      accessorKey: "location",
      header: ({column}) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          {tHeaders("station")}
        </Button>
      ),
      cell: ({row}) => {
        const locationId = row.original.eventData.place;
        let stationName = "";
        if (locationId) {
          stationName = locationId;
        } else {
          stationName = "Non renseigné";
        }
        return (
          <span>
            {stationName
              ? stationName[0].toUpperCase() + stationName.slice(1)
              : "Non renseigné"}
          </span>
        );
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        const locationId = row.original.eventData.place;
        return locationId
          ? locationId.toLowerCase().includes(filterValue.toLowerCase())
          : false;
      },
    },
    {
      accessorKey: "country",
      header: ({column}) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          {tHeaders("country")}
        </Button>
      ),
      cell: ({row}) => {
        const country =
          row.original.eventData.placeNationCode ||
          row.original.eventData.organiserNationCode ||
          "Non renseigné";
        return <CountryCell country={country} />;
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        const country =
          row.original.eventData.placeNationCode ||
          row.original.eventData.organiserNationCode ||
          "";
        return country === filterValue;
      },
    },
    {
      id: "codex",
      header: tHeaders("codex"),
      enableColumnFilter: true,
      accessorFn: (row) => row,
      cell: ({row}) => (
        <div className="flex gap-2 flex-wrap">
          {(row.original.eventData.competitions ?? []).map(
            (c: CompetitionItem, i: number) => (
              <Badge key={`${c.codex}-${i}`} variant={"outline"}>
                {c.codex}
              </Badge>
            )
          )}
        </div>
      ),
      filterFn: (row, id, filterValue) => {
        if (!filterValue) return true;
        return Array.isArray(row.original.eventData.competitions)
          ? row.original.eventData.competitions.some((c: CompetitionItem) =>
              String(c.codex)
                .toLowerCase()
                .includes((filterValue as string).toLowerCase())
            )
          : true;
      },
    },
    {
      id: "discipline",
      header: tHeaders("disciplines"),
      enableColumnFilter: true,
      accessorFn: (row) => row,
      cell: ({row}) => {
        const disciplineOrder = ["DH", "SG", "GS", "SL", "AC"]; // Même ordre que les options
        const disciplines = Array.from(
          new Set(
            (row.original.eventData.competitions ?? []).map((c) => c.eventCode)
          )
        ).filter(Boolean);
        
        // Applique l'ordre cohérent aux badges
        const sortedDisciplines = disciplines.sort((a, b) => {
          const indexA = disciplineOrder.indexOf(a);
          const indexB = disciplineOrder.indexOf(b);
          
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return String(a).localeCompare(String(b));
        });
        
        return (
          <div className="flex gap-2 flex-wrap">
            {sortedDisciplines.map((discipline: string) => (
              <Badge
                key={discipline}
                className={colorBadgePerDiscipline[discipline] || "bg-gray-300"}
                data-testid={`badge-discipline-${discipline}`}
              >
                {discipline}
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue) return true;
        return Array.isArray(row.original.eventData.competitions)
          ? row.original.eventData.competitions.some(
              (c: CompetitionItem) => c.eventCode === filterValue
            )
          : true;
      },
    },
    {
      id: "raceLevel",
      header: tHeaders("raceLevels"),
      enableColumnFilter: true,
      accessorFn: (row) => row,
      cell: ({row}) => {
        const raceLevels = Array.from(
          new Set(
            (row.original.eventData.competitions ?? []).map(
              (c: CompetitionItem) => c.categoryCode
            )
          )
        ).filter(Boolean);
        return (
          <div className="flex gap-2 flex-wrap">
            {raceLevels.map((raceLevel: string) => (
              <Badge
                key={raceLevel}
                className={colorBadgePerRaceLevel[raceLevel] || "bg-gray-300"}
                data-testid={`badge-level-${raceLevel}`}
              >
                {raceLevel}
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue) return true;
        return Array.isArray(row.original.eventData.competitions)
          ? row.original.eventData.competitions.some(
              (c: CompetitionItem) => c.categoryCode === filterValue
            )
          : true;
      },
    },
    {
      accessorKey: "status",
      header: ({column}) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          {tHeaders("status")}
        </Button>
      ),
      cell: ({row}) => {
        return (
          <StatusBadges 
            inscription={row.original} 
            size="sm"
            showEmailSent={false}
            showLabels={true}
          />
        );
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        return row.original.status === value;
      },
    },
    {
      id: "sex",
      header: tHeaders("sex"),
      enableColumnFilter: true,
      accessorFn: (row) => row,
      cell: ({row}) => {
        // On force l'ordre M puis W
        const sexes = ["M", "W"].filter((sex) =>
          (row.original.eventData.competitions ?? []).some(
            (c: CompetitionItem) => c.genderCode === sex
          )
        );
        return (
          <div className="flex gap-1">
            {sexes.map((sex: string) => (
              <Badge
                key={sex}
                variant="outline"
                className={`${
                  colorBadgePerGender[sex === "M" ? "M" : "W"] || ""
                } text-white`}
                data-testid={`badge-sex-${sex}`}
              >
                {sex}
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        return Array.isArray(row.original.eventData.competitions)
          ? row.original.eventData.competitions.some(
              (c: CompetitionItem) => c.genderCode === filterValue
            )
          : true;
      },
    },
    {
      id: "competitorCount",
      header: tHeaders("competitorCount"),
      cell: ({row}) => <CompetitorCountCell inscriptionId={row.original.id} />,
    },
    {
      id: "season",
      header: tHeaders("season"),
      enableColumnFilter: true,
      accessorFn: (row) => getSeasonFromDate(new Date(row.eventData.startDate)),
      cell: ({row}) => {
        const season = getSeasonFromDate(
          new Date(row.original.eventData.startDate)
        );
        return <span>{season}</span>;
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue) return true;
        const rowSeason = getSeasonFromDate(
          new Date(row.original.eventData.startDate)
        );
        return rowSeason === filterValue;
      },
    },
  ];

  // Table instance (props stables)
  const table = useReactTable({
    data: stableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    enableColumnFilters: true,
  });

  const dateValue = String(
    table.getColumn("startDate")?.getFilterValue() ?? ""
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Bouton toggle pour les filtres sur mobile */}
      <div className="md:hidden mb-4">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="w-full flex items-center justify-between"
        >
          <span>{tCommon("actions.filters")}</span>
          {showFilters ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Barre de filtres */}
      <div
        className={`mb-6 p-4 bg-white/80 rounded-lg shadow border ${
          showFilters || "md:block"
        } ${showFilters ? "block" : "hidden md:block"}`}
      >
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-6 md:justify-start md:items-center">
          <div className="flex flex-col gap-1 w-full md:w-[140px]">
            <label
              htmlFor="filter-season"
              className="font-semibold text-sm flex items-center gap-2"
            >
              {tFilters("season")}
              {!!table.getColumn("season")?.getFilterValue() && (
                <span
                  className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                  title={tFilters("activeFilter")}
                ></span>
              )}
            </label>
            <Select
              value={String(
                table.getColumn("season")?.getFilterValue() ?? "all"
              )}
              onValueChange={(value) =>
                table
                  .getColumn("season")
                  ?.setFilterValue(value === "all" ? undefined : Number(value))
              }
            >
              <SelectTrigger
                id="filter-season"
                className="w-full md:w-[140px] cursor-pointer"
              >
                <SelectValue placeholder={tFilters("season")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilters("allSeasons")}</SelectItem>
                {seasonOptions.map((season) => (
                  <SelectItem key={season} value={String(season)}>
                    {season}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-full md:w-[140px]">
            <label
              htmlFor="filter-date"
              className="font-semibold text-sm flex items-center gap-2"
            >
              {tFilters("date")}
              {dateValue && (
                <span
                  className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                  title={tFilters("activeFilter")}
                ></span>
              )}
            </label>
            <DebouncedInput
              id="filter-date"
              type="date"
              value={dateValue}
              onChange={(value) => {
                if (value !== dateValue) {
                  table.getColumn("startDate")?.setFilterValue(value);
                }
              }}
              placeholder={tFilters("datePlaceholder")}
              className="w-full md:w-[140px]"
            />
          </div>
          <div className="flex flex-col gap-1 w-full md:w-[140px]">
            <label
              htmlFor="filter-station"
              className="font-semibold text-sm flex items-center gap-2"
            >
              {tFilters("station")}
              {!!table.getColumn("location")?.getFilterValue() && (
                <span
                  className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                  title={tFilters("activeFilter")}
                ></span>
              )}
            </label>
            <Select
              value={String(
                table.getColumn("location")?.getFilterValue() ?? "all"
              )}
              onValueChange={(value) =>
                table
                  .getColumn("location")
                  ?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger
                id="filter-station"
                className="w-full md:w-[140px] cursor-pointer"
              >
                <SelectValue placeholder={tFilters("station")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilters("allStations")}</SelectItem>
                {locationOptions.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label[0].toUpperCase() + loc.label.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-full md:w-[140px]">
            <label
              htmlFor="filter-country"
              className="font-semibold text-sm flex items-center gap-2"
            >
              {tFilters("country")}
              {!!table.getColumn("country")?.getFilterValue() && (
                <span
                  className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                  title={tFilters("activeFilter")}
                ></span>
              )}
            </label>
            <Select
              value={String(
                table.getColumn("country")?.getFilterValue() ?? "all"
              )}
              onValueChange={(value) =>
                table
                  .getColumn("country")
                  ?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger
                id="filter-country"
                className="w-full md:w-[140px] cursor-pointer"
              >
                <SelectValue placeholder={tFilters("country")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilters("allCountries")}</SelectItem>
                {countryOptions.map((countryCode) => (
                  <CountrySelectItem
                    key={countryCode}
                    countryCode={countryCode}
                  />
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-full md:w-[140px]">
            <label
              htmlFor="filter-codex"
              className="font-semibold text-sm flex items-center gap-2"
            >
              {tFilters("codex")}
              {!!table.getColumn("codex")?.getFilterValue() && (
                <span
                  className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                  title={tFilters("activeFilter")}
                ></span>
              )}
            </label>
            <Select
              value={String(
                table.getColumn("codex")?.getFilterValue() ?? "all"
              )}
              onValueChange={(value) =>
                table
                  .getColumn("codex")
                  ?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger
                id="filter-codex"
                className="w-full md:w-[140px] cursor-pointer"
              >
                <SelectValue placeholder={tFilters("codex")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilters("allCodex")}</SelectItem>
                {codexOptions.map((codex) => (
                  <SelectItem key={String(codex)} value={String(codex)}>
                    {codex}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-full md:w-[140px]">
            <label
              htmlFor="filter-discipline"
              className="font-semibold text-sm flex items-center gap-2"
            >
              {tFilters("discipline")}
              {!!table.getColumn("discipline")?.getFilterValue() && (
                <span
                  className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                  title={tFilters("activeFilter")}
                ></span>
              )}
            </label>
            <Select
              value={String(
                table.getColumn("discipline")?.getFilterValue() ?? "all"
              )}
              onValueChange={(value) =>
                table
                  .getColumn("discipline")
                  ?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger
                id="filter-discipline"
                className="w-full md:w-[140px] cursor-pointer"
              >
                <SelectValue placeholder={tFilters("discipline")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilters("allDisciplines")}</SelectItem>
                {disciplineOptions.map((discipline) => (
                  <SelectItem key={discipline} value={discipline}>
                    {discipline}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-full md:w-[140px]">
            <label
              htmlFor="filter-racelevel"
              className="font-semibold text-sm flex items-center gap-2"
            >
              {tFilters("raceLevel")}
              {!!table.getColumn("raceLevel")?.getFilterValue() && (
                <span
                  className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                  title={tFilters("activeFilter")}
                ></span>
              )}
            </label>
            <Select
              value={String(
                table.getColumn("raceLevel")?.getFilterValue() ?? "all"
              )}
              onValueChange={(value) =>
                table
                  .getColumn("raceLevel")
                  ?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger
                id="filter-racelevel"
                className="w-full md:w-[140px] cursor-pointer"
              >
                <SelectValue placeholder={tFilters("raceLevel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilters("allRaceLevels")}</SelectItem>
                {raceLevelOptions.map((raceLevel) => (
                  <SelectItem key={raceLevel} value={raceLevel}>
                    {raceLevel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-full md:w-[140px]">
            <label
              htmlFor="filter-status"
              className="font-semibold text-sm flex items-center gap-2"
            >
              {tFilters("status")}
              {!!table.getColumn("status")?.getFilterValue() && (
                <span
                  className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                  title={tFilters("activeFilter")}
                ></span>
              )}
            </label>
            <Select
              value={
                table.getColumn("status")?.getFilterValue() === undefined
                  ? "all"
                  : String(table.getColumn("status")?.getFilterValue())
              }
              onValueChange={(value) =>
                table
                  .getColumn("status")
                  ?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger
                id="filter-status"
                className="w-full md:w-[140px] cursor-pointer"
              >
                <SelectValue placeholder={tFilters("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilters("allStatuses")}</SelectItem>
                <SelectItem value="open">{tStatus("open")}</SelectItem>
                <SelectItem value="validated">{tStatus("validated")}</SelectItem>
                <SelectItem value="email_sent">{tStatus("email_sent")}</SelectItem>
                <SelectItem value="cancelled">{tStatus("cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-full md:w-[140px]">
            <label
              htmlFor="filter-sex"
              className="font-semibold text-sm flex items-center gap-2"
            >
              {tFilters("sex")}
              {!!table.getColumn("sex")?.getFilterValue() && (
                <span
                  className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                  title={tFilters("activeFilter")}
                ></span>
              )}
            </label>
            <Select
              value={String(table.getColumn("sex")?.getFilterValue() ?? "all")}
              onValueChange={(value) =>
                table
                  .getColumn("sex")
                  ?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger
                id="filter-sex"
                className="w-full md:w-[140px] cursor-pointer"
              >
                <SelectValue placeholder={tFilters("sex")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilters("allGenders")}</SelectItem>
                {sexOptions.map((sex) => (
                  <SelectItem key={sex} value={sex}>
                    {sex === "M" ? tGender("male") : tGender("female")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {/* Vue desktop - tableau */}
      <div className="hidden md:block rounded-md border bg-white px-4">
        <Table className="w-full">
          <TableHeader className="w-full">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={
                        header.id === "actions" || header.id === "status"
                          ? "w-auto min-w-[60px] max-w-[100px] whitespace-nowrap px-2 text-sm"
                          : "w-auto min-w-[100px] max-w-[200px] whitespace-nowrap px-2 text-sm"
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <div>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="w-full">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  data-testid={`row-inscription-${row.id}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "actions" ||
                        cell.column.id === "status"
                          ? "whitespace-nowrap px-2 text-sm"
                          : "whitespace-nowrap px-2 text-sm"
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {tCommon("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vue mobile - cartes */}
      <div className="md:hidden space-y-4">
        {table.getRowModel().rows?.length ? (
          table
            .getRowModel()
            .rows.map((row) => (
              <InscriptionCard key={row.id} inscription={row.original} />
            ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            {tCommon("noResults")}
          </div>
        )}
      </div>
    </>
  );
}
