import React from "react";
import type {Inscription, Status} from "@/app/types";
import {getGenderStatus, isMixedEvent} from "@/app/lib/genderStatus";

type StatusBadgesProps = {
  inscription: Inscription;
  showEmailSent?: boolean;
  size?: "sm" | "md" | "lg";
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
  size: "sm" | "md" | "lg";
}> = ({ status, size }) => {
  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${sizeClasses[size]}
        rounded-md font-medium
        ${config.bg} ${config.text}
        border border-current/10
        transition-colors duration-150
      `}
    >
      <span className={`${dotSizes[size]} rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

// Compact gender status indicator for mixed events
const GenderStatusIndicator: React.FC<{
  gender: "M" | "W";
  status: Status | null;
  size: "sm" | "md" | "lg";
}> = ({ gender, status, size }) => {
  const config = getStatusConfig(status);

  const genderConfig = {
    M: {
      label: "M",
      bg: "bg-blue-900",
    },
    W: {
      label: "W",
      bg: "bg-purple-500",
    },
  };

  const g = genderConfig[gender];

  const markerSizes = {
    sm: "w-5 h-5 text-[10px]",
    md: "w-5 h-5 text-[10px]",
    lg: "w-6 h-6 text-xs",
  };

  const statusSizes = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2 py-0.5 text-[11px] gap-1",
    lg: "px-2.5 py-1 text-xs gap-1.5",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Gender marker */}
      <span
        className={`
          ${markerSizes[size]}
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
          inline-flex items-center
          ${statusSizes[size]}
          rounded font-medium
          ${config.bg} ${config.text}
        `}
      >
        <span className={`${dotSizes[size]} rounded-full ${config.dot}`} />
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
        size={size}
      />
      <GenderStatusIndicator
        gender="W"
        status={womenStatus.status}
        size={size}
      />
    </div>
  );
};