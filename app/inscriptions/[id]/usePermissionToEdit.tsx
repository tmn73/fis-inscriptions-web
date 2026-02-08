import {useRole, isAdminRole} from "@/app/lib/useRole";
import {Inscription} from "@/app/types";
import {useUser} from "@clerk/nextjs";
import {getGenderStatus} from "@/app/lib/genderStatus";

type Type = "actionsBtn" | "manageCompetitorInscriptions" | "manageCoaches";

export const usePermissionToEdit = (
  inscription: Inscription | undefined,
  type: Type,
  gender?: "M" | "W" | null
) => {
  const role = useRole();
  const user = useUser();

  if (!inscription) return false;

  if (type === "actionsBtn") {
    return isAdminRole(role);
  }

  if (type === "manageCompetitorInscriptions" || type === "manageCoaches") {
    // Les admins peuvent toujours modifier les compétiteurs et coaches
    if (isAdminRole(role)) return true;

    // Pour les autres utilisateurs, on vérifie aussi le statut par genre
    const genderStatus = getGenderStatus(inscription, gender || null);
    const hasUserPermission = !!user.user;
    const canEditBasedOnStatus = genderStatus.canEdit;

    return hasUserPermission && canEditBasedOnStatus;
  }

  return isAdminRole(role) || user.user?.id === inscription.createdBy;
};
