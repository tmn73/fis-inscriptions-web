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
import {useState} from "react";
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
import {StatusBadges} from "@/components/ui/status-badges";
import {useTranslations} from "next-intl";

interface InscriptionDetailsProps {
  id: string;
}

export const InscriptionDetails = ({
  id,
}: InscriptionDetailsProps) => {
  const t = useTranslations("inscriptionDetail.details");

  const {data: inscription, isLoading, error} = useInscription(id);
  const {user} = useUser();

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
    <header className="w-full bg-white border-b border-slate-200">
      <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base md:text-lg font-semibold text-slate-800 truncate">
                  {inscription.eventData.place}
                </h1>
                {countryCode && countryCode !== "Non renseigné" && flagUrl && (
                  <Image
                    src={flagUrl}
                    alt={countryLabel}
                    width={28}
                    height={20}
                    className="inline-block h-5 w-7 object-cover border border-gray-200 rounded-sm shrink-0"
                  />
                )}
                <StatusBadges inscription={inscription} layout="horizontal" size="lg" />
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <CalendarIcon className="h-3 w-3" />
                <span>
                  {parseLocalDate(inscription.eventData.startDate)?.toLocaleDateString("fr-FR")}
                  {" - "}
                  {parseLocalDate(inscription.eventData.endDate)?.toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {firstCodex !== undefined && (
              <Dialog
                open={isEventDetailsModalOpen}
                onOpenChange={setIsEventDetailsModalOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer text-slate-500 hover:text-slate-700"
                  >
                    <InfoIcon className="h-4 w-4" />
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
            {user && <ContactModal inscriptionId={id} />}
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
  );
};
