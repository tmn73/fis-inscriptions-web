"use client";

import {useQuery} from "@tanstack/react-query";
import {Inscription} from "@/app/types";
import {getEffectiveStatusForFilter} from "@/app/lib/genderStatus";
import {AlertTriangle, Clock, CheckCircle2, Send, Calendar, List} from "lucide-react";
import {useTranslations} from "next-intl";

type StatCardProps = {
  icon: React.ReactNode;
  value: number;
  label: string;
  description: string;
  color: "urgent" | "warning" | "success" | "info" | "neutral";
  onClick?: () => void;
  active?: boolean;
};

function StatCard({icon, value, label, description, color, onClick, active}: StatCardProps) {
  const colorStyles = {
    urgent: {
      bg: "bg-white hover:bg-rose-50/50",
      activeBg: "bg-rose-50/80",
      border: "border-slate-200/60",
      activeBorder: "border-rose-300",
      icon: "text-rose-400",
      activeIcon: "text-rose-500",
      value: "text-slate-700",
      activeValue: "text-rose-600",
    },
    warning: {
      bg: "bg-white hover:bg-amber-50/50",
      activeBg: "bg-amber-50/80",
      border: "border-slate-200/60",
      activeBorder: "border-amber-300",
      icon: "text-amber-400",
      activeIcon: "text-amber-500",
      value: "text-slate-700",
      activeValue: "text-amber-600",
    },
    info: {
      bg: "bg-white hover:bg-sky-50/50",
      activeBg: "bg-sky-50/80",
      border: "border-slate-200/60",
      activeBorder: "border-sky-300",
      icon: "text-sky-400",
      activeIcon: "text-sky-500",
      value: "text-slate-700",
      activeValue: "text-sky-600",
    },
    success: {
      bg: "bg-white hover:bg-emerald-50/50",
      activeBg: "bg-emerald-50/80",
      border: "border-slate-200/60",
      activeBorder: "border-emerald-300",
      icon: "text-emerald-400",
      activeIcon: "text-emerald-500",
      value: "text-slate-700",
      activeValue: "text-emerald-600",
    },
    neutral: {
      bg: "bg-white hover:bg-slate-50/50",
      activeBg: "bg-slate-50/80",
      border: "border-slate-200/60",
      activeBorder: "border-slate-400",
      icon: "text-slate-400",
      activeIcon: "text-slate-500",
      value: "text-slate-700",
      activeValue: "text-slate-700",
    },
  };

  const styles = colorStyles[color];

  return (
    <button
      onClick={onClick}
      className={`
        group flex items-center gap-2.5 px-3 py-2 rounded-md border transition-all duration-200
        ${active ? styles.activeBg : styles.bg}
        ${active ? styles.activeBorder : styles.border}
        ${onClick ? "cursor-pointer" : "cursor-default"}
      `}
      title={description}
    >
      <span className={active ? styles.activeIcon : styles.icon}>
        {icon}
      </span>
      <span className={`text-lg font-semibold tabular-nums ${active ? styles.activeValue : styles.value}`}>
        {value}
      </span>
      <span className="text-xs text-slate-500">
        {label}
      </span>
    </button>
  );
}

type QuickStatsBarProps = {
  onFilterChange?: (filter: string) => void;
  activeFilter?: string;
};

export function QuickStatsBar({onFilterChange, activeFilter}: QuickStatsBarProps) {
  const t = useTranslations("dashboard.stats");

  const {data: inscriptions = []} = useQuery<Inscription[]>({
    queryKey: ["inscriptions"],
    queryFn: () => fetch("/api/inscriptions").then((res) => res.json()),
  });

  // Calculate stats
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  // Urgent: deadline today or tomorrow (D-0, D-1)
  const urgentCount = inscriptions.filter((insc) => {
    const status = getEffectiveStatusForFilter(insc);
    if (status !== "open") return false;

    const eventDate = new Date(insc.eventData.startDate);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setUTCDate(eventDate.getUTCDate() - 3);
    deadlineDate.setUTCHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 1 && diffDays >= 0;
  }).length;

  // This week: deadline within 7 days
  const thisWeekCount = inscriptions.filter((insc) => {
    const status = getEffectiveStatusForFilter(insc);
    if (status !== "open") return false;

    const eventDate = new Date(insc.eventData.startDate);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setUTCDate(eventDate.getUTCDate() - 3);
    deadlineDate.setUTCHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 1 && diffDays <= 7;
  }).length;

  // To validate
  const toValidateCount = inscriptions.filter((insc) => {
    const status = getEffectiveStatusForFilter(insc);
    return status === "validated";
  }).length;

  // Sent this week
  const sentThisWeekCount = inscriptions.filter((insc) => {
    const status = getEffectiveStatusForFilter(insc);
    if (status !== "email_sent") return false;

    // Check if sent within last 7 days
    const sentAt = insc.emailSentAt || insc.menEmailSentAt || insc.womenEmailSentAt;
    if (!sentAt) return false;

    const sentDate = new Date(sentAt);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return sentDate >= weekAgo;
  }).length;

  // All open
  const allOpenCount = inscriptions.filter((insc) => {
    const status = getEffectiveStatusForFilter(insc);
    return status === "open";
  }).length;

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <StatCard
        icon={<AlertTriangle className="w-4 h-4" />}
        value={urgentCount}
        label={t("urgent")}
        description={t("urgentDesc")}
        color="urgent"
        onClick={() => onFilterChange?.("urgent")}
        active={activeFilter === "urgent"}
      />
      <StatCard
        icon={<Clock className="w-4 h-4" />}
        value={thisWeekCount}
        label={t("thisWeek")}
        description={t("thisWeekDesc")}
        color="warning"
        onClick={() => onFilterChange?.("thisWeek")}
        active={activeFilter === "thisWeek"}
      />
      <StatCard
        icon={<CheckCircle2 className="w-4 h-4" />}
        value={toValidateCount}
        label={t("toValidate")}
        description={t("toValidateDesc")}
        color="info"
        onClick={() => onFilterChange?.("toValidate")}
        active={activeFilter === "toValidate"}
      />
      <StatCard
        icon={<Send className="w-4 h-4" />}
        value={sentThisWeekCount}
        label={t("sentRecently")}
        description={t("sentRecentlyDesc")}
        color="success"
        onClick={() => onFilterChange?.("sent")}
        active={activeFilter === "sent"}
      />
      <StatCard
        icon={<Calendar className="w-4 h-4" />}
        value={allOpenCount}
        label={t("allOpen")}
        description={t("allOpenDesc")}
        color="neutral"
        onClick={() => onFilterChange?.("nextRaces")}
        active={activeFilter === "nextRaces"}
      />
      <StatCard
        icon={<List className="w-4 h-4" />}
        value={inscriptions.length}
        label={t("all")}
        description={t("allDesc")}
        color="neutral"
        onClick={() => onFilterChange?.("all")}
        active={activeFilter === "all"}
      />
    </div>
  );
}
