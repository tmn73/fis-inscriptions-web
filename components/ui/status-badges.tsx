import React from "react";
import type {Inscription, Status} from "@/app/types";
import {getGenderStatus, isMixedEvent} from "@/app/lib/genderStatus";

type StatusBadgesProps = {
  inscription: Inscription;
  showEmailSent?: boolean;
  size?: "sm" | "md";
  className?: string;
  showLabels?: boolean;
  layout?: "vertical" | "horizontal";
};

type StatusConfig = {
  label: string;
  shortLabel: string;
  bg: string;
  text: string;
  dot: string;
};

const getStatusConfig = (status: Status | null): StatusConfig => {
  const statusMap: Record<string, StatusConfig> = {
    open: {
      label: "Ouverte",
      shortLabel: "Ouv.",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500"
    },
    validated: {
      label: "Validée",
      shortLabel: "Val.",
      bg: "bg-sky-50",
      text: "text-sky-700",
      dot: "bg-sky-500"
    },
    email_sent: {
      label: "Envoyée",
      shortLabel: "Env.",
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500"
    },
    cancelled: {
      label: "Annulée",
      shortLabel: "Ann.",
      bg: "bg-rose-50",
      text: "text-rose-700",
      dot: "bg-rose-500"
    },
    not_concerned: {
      label: "N/C",
      shortLabel: "N/C",
      bg: "bg-slate-50",
      text: "text-slate-400",
      dot: "bg-slate-300"
    },
  };

  if (!status) {
    return {
      label: "—",
      shortLabel: "—",
      bg: "bg-slate-50",
      text: "text-slate-400",
      dot: "bg-slate-300"
    };
  }

  return statusMap[status] || {
    label: "—",
    shortLabel: "—",
    bg: "bg-slate-50",
    text: "text-slate-400",
    dot: "bg-slate-300"
  };
};

// Single status badge for non-mixed events
const SingleStatusBadge: React.FC<{
  status: Status | null;
  size: "sm" | "md";
}> = ({ status, size }) => {
  const config = getStatusConfig(status);
  const isSmall = size === "sm";

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${isSmall ? "px-2 py-0.5" : "px-2.5 py-1"}
        rounded-md font-medium
        ${config.bg} ${config.text}
        border border-current/10
        ${isSmall ? "text-[11px]" : "text-xs"}
        transition-colors duration-150
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

// Compact gender status indicator for mixed events
const GenderStatusIndicator: React.FC<{
  gender: "M" | "W";
  status: Status | null;
}> = ({ gender, status }) => {
  const config = getStatusConfig(status);

  const genderConfig = {
    M: {
      label: "M",
      bg: "bg-blue-900",
      ring: "ring-blue-900/20"
    },
    W: {
      label: "W",
      bg: "bg-purple-500",
      ring: "ring-purple-500/20"
    },
  };

  const g = genderConfig[gender];

  return (
    <div className="flex items-center gap-1">
      {/* Gender marker */}
      <span
        className={`
          w-4 h-4 text-[9px]
          ${g.bg} text-white
          rounded font-bold
          flex items-center justify-center
        `}
      >
        {g.label}
      </span>
      {/* Status indicator */}
      <span
        className={`
          inline-flex items-center gap-1
          px-1.5 py-0.5 text-[10px]
          rounded font-medium
          ${config.bg} ${config.text}
        `}
      >
        <span className={`w-1 h-1 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    </div>
  );
};

export const StatusBadges: React.FC<StatusBadgesProps> = ({
  inscription,
  size = "md",
  className = "",
  layout = "vertical",
}) => {
  const isEventMixed = isMixedEvent(inscription.eventData);

  if (!isEventMixed) {
    return (
      <div className={`flex items-center ${className}`}>
        <SingleStatusBadge
          status={inscription.status}
          size={size}
        />
      </div>
    );
  }

  // Mixed event: always show both gender statuses
  const menStatus = getGenderStatus(inscription, "M");
  const womenStatus = getGenderStatus(inscription, "W");

  const layoutClasses = layout === "horizontal"
    ? "flex items-center gap-3"
    : "flex flex-col gap-0.5";

  return (
    <div className={`${layoutClasses} ${className}`}>
      <GenderStatusIndicator
        gender="M"
        status={menStatus.status}
      />
      <GenderStatusIndicator
        gender="W"
        status={womenStatus.status}
      />
    </div>
  );
};