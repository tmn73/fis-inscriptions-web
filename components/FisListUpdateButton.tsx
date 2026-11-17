"use client";

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {RefreshCw} from "lucide-react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/use-toast";
import {DropdownMenuItem} from "@/components/ui/dropdown-menu";
import type {FisImportResult} from "@/app/lib/fisPointsListImport";

// The FIS list number as shown on the home page: "20th ... 2026/27" -> "20-27"
const shortLabel = (r: FisImportResult) => {
  const match = r.listname?.match(/^(\d+)\D.*?\d{4}\/(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : String(r.listid);
};

export function useUpdateFisList() {
  const t = useTranslations("navigation.fisListUpdate");
  const {toast} = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<FisImportResult> => {
      const res = await fetch("/api/admin/fis-points-list/import", {method: "POST"});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({queryKey: ["fis-points-list"]});
      queryClient.invalidateQueries({queryKey: ["competitors"]});
      toast(
        result.updated
          ? {
              title: t("updated", {label: shortLabel(result)}),
              description: t("updatedDescription", {count: result.count}),
            }
          : {
              title: t("upToDate", {label: shortLabel(result)}),
              description: t("upToDateDescription"),
            }
      );
    },
    onError: () => {
      toast({title: t("error"), variant: "destructive"});
    },
  });
}

// Admin action that imports the newest FIS points list right away, without
// waiting for the nightly job. Used in the desktop and tablet menus; on mobile the FIS list card in
// QuickStatsBar does the same.
export function FisListUpdateButton({
  variant,
}: {
  variant: "nav" | "dropdown";
}) {
  const t = useTranslations("navigation.fisListUpdate");
  const {mutate, isPending} = useUpdateFisList();
  const run = () => mutate();
  const label = isPending ? t("running") : t("label");
  const icon = (
    <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
  );

  if (variant === "dropdown") {
    return (
      <DropdownMenuItem
        disabled={isPending}
        onSelect={(e) => {
          e.preventDefault();
          run();
        }}
        className="flex items-center cursor-pointer"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        {label}
      </DropdownMenuItem>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={run}
      title={t("hint")}
      className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium text-white/65 hover:text-white hover:bg-white/10 transition-all duration-200 disabled:opacity-60"
    >
      {icon}
      {isPending ? t("running") : t("short")}
    </button>
  );
}
