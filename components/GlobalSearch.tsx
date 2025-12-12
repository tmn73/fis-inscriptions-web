"use client";

import {useState, useEffect, useRef, useCallback, useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {Search, X, ArrowRight} from "lucide-react";
import {Inscription} from "@/app/types";
import {format, parseISO} from "date-fns";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {Badge} from "@/components/ui/badge";
import {colorBadgePerDiscipline} from "@/app/lib/colorMappers";
import {useCountryInfo} from "@/hooks/useCountryInfo";
import Image from "next/image";

type SearchResultProps = {
  inscription: Inscription;
  isSelected: boolean;
  onClick: () => void;
};

function SearchResult({inscription, isSelected, onClick}: SearchResultProps) {
  const country = inscription.eventData.placeNationCode || inscription.eventData.organiserNationCode || "";
  const {flagUrl} = useCountryInfo(country);

  const disciplines = Array.from(
    new Set(
      (inscription.eventData.competitions ?? []).map((c) => c.eventCode)
    )
  ).filter(Boolean);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 flex items-center gap-4 transition-colors
        ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}
        border-b border-slate-100 last:border-b-0
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {flagUrl && (
            <Image
              src={flagUrl}
              alt={country}
              className="w-5 h-4 object-cover border border-gray-200 rounded"
              width={20}
              height={16}
            />
          )}
          <span className="font-semibold text-slate-900 truncate">
            {inscription.eventData.place || "Unknown"}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-sm text-slate-600">
            {format(parseISO(inscription.eventData.startDate), "dd/MM/yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {disciplines.slice(0, 3).map((d) => (
            <Badge
              key={d}
              className={`${colorBadgePerDiscipline[d] || "bg-gray-300"} text-xs`}
            >
              {d}
            </Badge>
          ))}
          {disciplines.length > 3 && (
            <span className="text-xs text-slate-400">+{disciplines.length - 3}</span>
          )}
        </div>
      </div>
      <ArrowRight className={`w-4 h-4 ${isSelected ? "text-blue-500" : "text-slate-300"}`} />
    </button>
  );
}

export function GlobalSearch() {
  const t = useTranslations("dashboard.search");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {data: inscriptions = []} = useQuery<Inscription[]>({
    queryKey: ["inscriptions"],
    queryFn: () => fetch("/api/inscriptions").then((res) => res.json()),
  });

  // Filter results based on query
  const results = useMemo(() => {
    if (query.length < 2) return [];

    return inscriptions.filter((insc) => {
      const searchLower = query.toLowerCase();
      const place = insc.eventData.place?.toLowerCase() || "";
      const country = (insc.eventData.placeNationCode || insc.eventData.organiserNationCode || "").toLowerCase();
      const codexes = (insc.eventData.competitions ?? []).map((c) => String(c.codex)).join(" ");
      const disciplines = (insc.eventData.competitions ?? []).map((c) => c.eventCode).join(" ").toLowerCase();

      return (
        place.includes(searchLower) ||
        country.includes(searchLower) ||
        codexes.includes(searchLower) ||
        disciplines.includes(searchLower)
      );
    }).slice(0, 8);
  }, [query, inscriptions]);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with / key (when not typing in an input)
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsOpen(true);
      }
      // Close with Escape
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        router.push(`/inscriptions/${results[selectedIndex].id}`);
        setIsOpen(false);
        setQuery("");
      }
    },
    [results, selectedIndex, router]
  );

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Search input */}
      <div
        className={`
          relative flex items-center gap-3 px-4 py-3 bg-white rounded-xl border-2
          transition-all duration-200
          ${isOpen ? "border-blue-400 shadow-lg shadow-blue-100" : "border-slate-200 hover:border-slate-300"}
        `}
      >
        <Search className="w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
        />
        {query ? (
          <button
            onClick={() => setQuery("")}
            className="p-1 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 font-mono">
            {t("shortcut")}
          </kbd>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
          {results.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {results.map((insc, index) => (
                <SearchResult
                  key={insc.id}
                  inscription={insc}
                  isSelected={index === selectedIndex}
                  onClick={() => {
                    router.push(`/inscriptions/${insc.id}`);
                    setIsOpen(false);
                    setQuery("");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No results found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
