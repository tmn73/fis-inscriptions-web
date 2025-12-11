import React from "react";
import type {Inscription, Status} from "@/app/types";
import {getGenderStatus, isMixedEvent} from "@/app/lib/genderStatus";

type StatusBadgesProps = {
  inscription: Inscription;
  showEmailSent?: boolean;
  size?: "sm" | "md";
  className?: string;
  showLabels?: boolean; // Afficher les labels "Hommes:", "Femmes:", etc.
};

const getStatusInfo = (status: Status | null) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    open: { label: "Ouverte", className: "bg-green-100 text-green-800 border-green-200" },
    validated: { label: "Validée", className: "bg-blue-100 text-blue-800 border-blue-200" },
    email_sent: { label: "Envoyée", className: "bg-orange-100 text-orange-800 border-orange-200" },
    cancelled: { label: "Annulée", className: "bg-red-100 text-red-800 border-red-200" },
    not_concerned: { label: "N/C", className: "bg-gray-100 text-gray-500 border-gray-200" },
  };

  if (!status) {
    return { label: "Non définie", className: "bg-gray-100 text-gray-800 border-gray-200" };
  }

  return statusMap[status] || { label: "Inconnu", className: "bg-gray-100 text-gray-800 border-gray-200" };
};

const StatusBadge: React.FC<{
  status: Status | null;
  label: string;
  size: "sm" | "md";
  emailSentAt?: Date | null;
  showEmailSent: boolean;
  showLabel: boolean;
}> = ({ status, label, size, showLabel }) => {
  const { label: statusLabel, className } = getStatusInfo(status);
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs" 
    : "px-2 md:px-3 py-0.5 text-xs";

  return (
    <div className="flex items-center gap-1">
      <span
        className={`${sizeClasses} rounded-full font-semibold flex items-center border ${className}`}
        style={{minHeight: "1.5rem", width: "fit-content"}}
      >
        {showLabel ? `${label}: ${statusLabel}` : statusLabel}
      </span>
    </div>
  );
};

export const StatusBadges: React.FC<StatusBadgesProps> = ({
  inscription,
  showEmailSent = true,
  size = "md",
  className = "",
  showLabels = true,
}) => {
  const isEventMixed = isMixedEvent(inscription.eventData);

  if (!isEventMixed) {
    // Événement non-mixte : affichage sans label "Statut:"
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StatusBadge
          status={inscription.status}
          label="Statut"
          size={size}
          emailSentAt={inscription.emailSentAt}
          showEmailSent={showEmailSent}
          showLabel={false}
        />
      </div>
    );
  }

  // Événement mixte : afficher les statuts par genre si différents
  const menStatus = getGenderStatus(inscription, "M");
  const womenStatus = getGenderStatus(inscription, "W");

  const hasDifferentStatuses = 
    menStatus.status !== womenStatus.status ||
    menStatus.status !== inscription.status ||
    womenStatus.status !== inscription.status;

  if (!hasDifferentStatuses) {
    // Tous les statuts sont identiques : affichage sans label "Statut:"
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StatusBadge
          status={inscription.status}
          label="Statut"
          size={size}
          emailSentAt={inscription.emailSentAt}
          showEmailSent={showEmailSent}
          showLabel={false}
        />
      </div>
    );
  }

  // Statuts différents : afficher par genre
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <StatusBadge
        status={menStatus.status}
        label="H"
        size={size}
        emailSentAt={menStatus.emailSentAt}
        showEmailSent={showEmailSent}
        showLabel={showLabels}
      />
      <StatusBadge
        status={womenStatus.status}
        label="F"
        size={size}
        emailSentAt={womenStatus.emailSentAt}
        showEmailSent={showEmailSent}
        showLabel={showLabels}
      />
      {/* Pas de badge global si on affiche déjà les statuts par genre */}
    </div>
  );
};