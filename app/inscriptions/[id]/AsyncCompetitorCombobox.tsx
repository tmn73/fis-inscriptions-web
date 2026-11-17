import React, {useState} from "react";
import {Combobox, ComboboxOption} from "@/components/ui/combobox";
import {useQuery} from "@tanstack/react-query";
import {Loader2} from "lucide-react";
import {Competitor} from "@/app/types";
import {useTranslations} from "next-intl";

const MIN_SEARCH_LENGTH = 4;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function useCompetitors(search: string) {
  return useQuery({
    queryKey: ["competitors", search],
    queryFn: async () => {
      if (search.length < MIN_SEARCH_LENGTH) return [];
      const res = await fetch(
        `/api/competitors?search=${encodeURIComponent(search)}`
      );
      if (!res.ok) throw new Error("Erreur API");
      return res.json();
    },
    enabled: search.length >= MIN_SEARCH_LENGTH,
  });
}

export default function AsyncCompetitorCombobox({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const t = useTranslations("modals.addCompetitor");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const {data: results = [], isLoading} = useCompetitors(debouncedSearch);

  // Adapter les résultats au format ComboboxOption
  const options: ComboboxOption[] = results.map((c: Competitor) => ({
    value: c.competitorid.toString(),
    label: `${c.firstname} ${c.lastname} (${c.nationcode})`,
  }));

  return (
    <div className="relative space-y-2">
      <input
        className="w-full px-3 py-2 border rounded"
        placeholder={t("search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
      />
      <Combobox
        options={options}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder ?? t("selected")}
        disabled={disabled}
        renderOption={(option) => <span>{option.label}</span>}
        className="w-full"
      />
      {isLoading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
        </span>
      )}
      {debouncedSearch.length >= MIN_SEARCH_LENGTH &&
        !isLoading &&
        options.length === 0 && (
          <div className="text-muted-foreground px-3 py-2 text-sm">
            Aucun compétiteur trouvé
          </div>
        )}
    </div>
  );
}
