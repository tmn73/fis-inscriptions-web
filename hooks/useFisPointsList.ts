import {useQuery} from "@tanstack/react-query";

export type FisPointsList = {
  listid: number;
  listname: string | null;
  label: string; // "20-27"
};

// The FIS points list competitors are searched in: the newest one imported by
// scripts/import-competitors.cjs.
export function useFisPointsList() {
  return useQuery<FisPointsList | null>({
    queryKey: ["fis-points-list"],
    queryFn: async () => {
      const res = await fetch("/api/competitors/points-list");
      if (!res.ok) throw new Error("Erreur API");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
}
