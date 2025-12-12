"use client";

import {
  Loader2,
  CalendarIcon,
  InfoIcon,
  ArrowLeft,
} from "lucide-react";
import {InscriptionActionsMenu} from "./InscriptionActionsMenu";
import {usePermissionToEdit} from "./usePermissionToEdit";
import {useInscription} from "../form/api";
import {parseLocalDate} from "@/app/lib/dates";
import {useCountryInfo} from "@/hooks/useCountryInfo";
import Image from "next/image";
import {Button} from "@/components/ui/button";
import React, {useState} from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {EventDetails} from "@/components/EventDetails";
import Link from "next/link";
import {ContactModal} from "./ContactModal";
import {useUser} from "@clerk/nextjs";
import {useUserEmail} from "@/hooks/useUserEmail";
import {StatusBadges} from "@/components/ui/status-badges";
import {useTranslations} from "next-intl";

interface InscriptionDetailsProps {
  id: string;
}

export const InscriptionDetails = ({
  id,
}: InscriptionDetailsProps) => {
  const t = useTranslations("inscriptionDetail.details");
  const tCreator = useTranslations("inscriptionDetail.details.creator");

  const {data: inscription, isLoading, error} = useInscription(id);
  const {user} = useUser();
  const {data: creatorEmail, isLoading: isLoadingCreatorEmail} = useUserEmail(inscription?.createdBy);

  const permissionToEdit = usePermissionToEdit(inscription, "actionsBtn", null);

  const countryCode =
    inscription?.eventData.placeNationCode ||
    inscription?.eventData.organiserNationCode;
  const {flagUrl, countryLabel} = useCountryInfo(countryCode);

  const [isEventDetailsModalOpen, setIsEventDetailsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center min-h-[400px] flex items-center justify-center">
        {t("errors.loadData")}
      </div>
    );
  }

  if (!inscription) {
    return null;
  }

  const firstCodex = inscription.eventData?.competitions?.[0]?.codex;

  return (
    <div className="bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer bg-transparent hover:bg-slate-100 text-slate-500"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-semibold text-slate-800 truncate">
                    {inscription.eventData.place}
                  </h1>
                  {countryCode && countryCode !== "Non renseigné" && flagUrl && (
                    <Image
                      src={flagUrl}
                      alt={countryLabel}
                      width={20}
                      height={14}
                      className="inline-block h-3.5 w-5 object-cover border border-gray-200 rounded-sm shrink-0"
                    />
                  )}
                  <StatusBadges inscription={inscription} />
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {parseLocalDate(inscription.eventData.startDate)?.toLocaleDateString("fr-FR")}
                    {" - "}
                    {parseLocalDate(inscription.eventData.endDate)?.toLocaleDateString("fr-FR")}
                  </span>
                  {inscription.createdBy && inscription.createdAt && !isLoadingCreatorEmail && (
                    <span className="text-xs text-slate-400 hidden md:inline">
                      {tCreator("text", {email: creatorEmail ?? tCreator("unknown"), date: new Date(inscription.createdAt).toLocaleDateString("fr-FR")})}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2 shrink-0">
              {firstCodex !== undefined && (
                <Dialog
                  open={isEventDetailsModalOpen}
                  onOpenChange={setIsEventDetailsModalOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                    >
                      <InfoIcon className="h-4 w-4 md:mr-1.5" />
                      <span className="hidden md:inline">{t("eventDetails")}</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] md:w-11/12 !max-w-none max-h-[90vh] overflow-y-auto">
                    <DialogTitle className="text-lg md:text-xl">
                      {t("eventDetailsFull")}
                    </DialogTitle>
                    <div className="mt-4">
                      <EventDetails
                        codex={firstCodex}
                        inscriptionId={Number(inscription.id)}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {user && (
                <ContactModal inscriptionId={id} />
              )}
              {permissionToEdit && inscription && (
                <InscriptionActionsMenu
                  inscription={inscription}
                  readonly={!permissionToEdit}
                />
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};
