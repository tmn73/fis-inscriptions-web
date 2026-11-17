"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Loader2, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {usePermissionToEdit} from "./usePermissionToEdit";
import {InscriptionCoach} from "@/app/types";
import {format} from "date-fns";
import {toast} from "@/components/ui/use-toast";
import {useState} from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {useTranslations} from "next-intl";
import {useDateLocale} from "@/app/lib/dateLocale";

export const useInscriptionCoaches = (inscriptionId: string) => {
  return useQuery<InscriptionCoach[]>({
    queryKey: ["inscription-coaches", inscriptionId],
    queryFn: async () => {
      const res = await fetch(`/api/inscriptions/${inscriptionId}/coaches`);
      if (!res.ok) throw new Error("Erreur lors du chargement des coaches");
      return res.json();
    },
  });
};

function useDeleteCoach(inscriptionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({coachId}: {coachId: number}) => {
      const res = await fetch(`/api/inscriptions/${inscriptionId}/coaches`, {
        method: "DELETE",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({coachId}),
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression du coach");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inscription-coaches", inscriptionId],
      });
    },
  });
}

// Composant bouton WhatsApp séparé
const WhatsAppButton = ({inscriptionId}: {inscriptionId: string}) => {
  const t = useTranslations("inscriptionDetail.coaches.whatsapp");
  const dateLocale = useDateLocale();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const {data: coaches = []} = useInscriptionCoaches(inscriptionId);
  const {data: inscription} = useQuery({
    queryKey: ["inscriptions", inscriptionId],
    queryFn: () =>
      fetch(`/api/inscriptions/${inscriptionId}`).then((r) => r.json()),
  });

  const handleCreateWhatsAppGroup = async () => {
    try {
      const coachesWithWhatsApp = coaches.filter(
        (coach: InscriptionCoach) => coach.whatsappPhone
      );

      if (coachesWithWhatsApp.length === 0) {
        toast({
          title: t("toasts.noWhatsApp"),
          description: t("toasts.noWhatsAppDescription"),
          variant: "destructive",
        });
        return;
      }

      setShowWhatsAppModal(true);
    } catch {
      toast({
        title: t("toasts.prepareError"),
        description: t("toasts.prepareErrorDescription"),
        variant: "destructive",
      });
    }
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+33")) {
      const withoutPrefix = cleaned.substring(3);
      if (withoutPrefix.length === 9) {
        return `33 ${withoutPrefix[0]} ${withoutPrefix.substring(1, 3)} ${withoutPrefix.substring(3, 5)} ${withoutPrefix.substring(5, 7)} ${withoutPrefix.substring(7, 9)}`;
      }
    }
    return cleaned.replace("+", "");
  };

  const copyPhoneNumber = async (phoneNumber: string, coachName: string) => {
    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      await navigator.clipboard.writeText(formattedNumber);
      toast({
        title: t("toasts.numberCopied"),
        description: t("toasts.numberCopiedDescription", {number: formattedNumber, name: coachName}),
      });
    } catch {
      toast({
        title: t("toasts.numberCopyError"),
        description: t("toasts.numberCopyErrorDescription"),
        variant: "destructive",
      });
    }
  };

  const copyGroupName = async () => {
    const eventData = inscription?.eventData;
    const eventName = eventData?.name || t("defaultEventName");
    const place = eventData?.place || "";
    const startDate = eventData?.startDate
      ? new Date(eventData.startDate).toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "2-digit",
        })
      : "";
    const endDate = eventData?.endDate
      ? new Date(eventData.endDate).toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "2-digit",
        })
      : "";

    let groupName = `${t("groupNamePrefix")} ${eventName}`;
    if (place) groupName += ` - ${place}`;
    if (startDate && endDate) {
      if (startDate === endDate) {
        groupName += ` - ${startDate}`;
      } else {
        groupName += ` - ${startDate} ${t("dateSeparator")} ${endDate}`;
      }
    }

    try {
      await navigator.clipboard.writeText(groupName);
      toast({
        title: t("toasts.nameCopied"),
        description: t("toasts.nameCopiedDescription"),
      });
    } catch {
      toast({
        title: t("toasts.nameCopyError"),
        description: t("toasts.nameCopyErrorDescription"),
        variant: "destructive",
      });
    }
  };

  const coachesWithWhatsApp = coaches.filter(
    (coach: InscriptionCoach) => coach.whatsappPhone
  );

  if (coachesWithWhatsApp.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleCreateWhatsAppGroup}
        className="px-3 py-2 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:opacity-70 cursor-pointer flex items-center gap-2 text-sm"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
        </svg>
        <span className="hidden sm:inline">{t("button")}</span>
        <span className="sm:hidden">{t("buttonShort")}</span>
      </button>

      {/* Modale WhatsApp */}
      <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
        <DialogContent className="max-w-lg mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg
                className="w-6 h-6 text-green-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
              </svg>
              {t("modalTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="text-center">
              <div className="text-sm text-gray-600">
                {t("instructions")}
              </div>
            </div>

            {/* Étape 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <h3 className="font-medium">
                  {t("step1")}
                </h3>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <h3 className="font-medium">{t("step2")}</h3>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-700 mb-3">
                  {t("step2Description")}
                </div>

                <div className="space-y-2">
                  {coachesWithWhatsApp.map((coach) => (
                    <div
                      key={coach.id}
                      className="flex items-center justify-between bg-white rounded p-2"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {coach.firstName} {coach.lastName}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {coach.whatsappPhone}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copyPhoneNumber(
                            coach.whatsappPhone!,
                            `${coach.firstName} ${coach.lastName}`
                          )
                        }
                        className="ml-2"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        {t("copy")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <h3 className="font-medium">{t("step3")}</h3>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-700 mb-2">
                  {t("suggestedName")}
                </div>
                <div className="flex items-center justify-between bg-white rounded p-2">
                  <div className="font-medium text-sm">
                    {(() => {
                      const eventData = inscription?.eventData;
                      const eventName = eventData?.name || t("defaultEventName");
                      const place = eventData?.place || "";
                      const startDate = eventData?.startDate
                        ? new Date(eventData.startDate).toLocaleDateString(
                            dateLocale,
                            {day: "2-digit", month: "2-digit"}
                          )
                        : "";
                      const endDate = eventData?.endDate
                        ? new Date(eventData.endDate).toLocaleDateString(
                            dateLocale,
                            {day: "2-digit", month: "2-digit"}
                          )
                        : "";

                      let groupName = `${t("groupNamePrefix")} ${eventName}`;
                      if (place) groupName += ` - ${place}`;
                      if (startDate && endDate) {
                        if (startDate === endDate) {
                          groupName += ` - ${startDate}`;
                        } else {
                          groupName += ` - ${startDate} ${t("dateSeparator")} ${endDate}`;
                        }
                      }
                      return groupName;
                    })()}
                  </div>
                  <Button size="sm" variant="outline" onClick={copyGroupName}>
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    {t("copy")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWhatsAppModal(false)}
            >
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const Coaches = ({
  inscriptionId,
  genderFilter,
}: {
  inscriptionId: string;
  genderFilter?: "both" | "M" | "W";
}) => {
  const t = useTranslations("inscriptionDetail.coaches");
  const {
    data: coaches = [],
    isPending,
    error,
  } = useInscriptionCoaches(inscriptionId);

  const {data: inscription} = useQuery({
    queryKey: ["inscriptions", inscriptionId],
    queryFn: () =>
      fetch(`/api/inscriptions/${inscriptionId}`).then((r) => r.json()),
  });

  const {mutate: deleteCoach, isPending: deleting} =
    useDeleteCoach(inscriptionId);

  const permissionToEdit = usePermissionToEdit(inscription, "manageCoaches", null);

  // Filtrer les coaches selon le filtre de genre
  const filteredCoaches = React.useMemo(() => {
    if (!genderFilter || genderFilter === "both") {
      return coaches;
    }
    
    return coaches.filter((coach) => {
      // Si le coach est assigné à "BOTH", il apparaît dans tous les filtres
      if (coach.gender === "BOTH") {
        return true;
      }
      // Sinon, le coach n'apparaît que si son genre correspond au filtre
      return coach.gender === genderFilter;
    });
  }, [coaches, genderFilter]);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <p>{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    return <div>{t("loadError")}</div>;
  }

  if (!filteredCoaches?.length && !isPending) {
    const hasCoaches = coaches?.length > 0;
    const filter = genderFilter === "M" ? t("filterMen") : genderFilter === "W" ? t("filterWomen") : t("filterOther");
    const messageText = hasCoaches
      ? t("noCoachesFiltered", {filter})
      : t("noCoaches");

    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        {inscription?.status !== "open" && (
          <div className="text-xs text-slate-400 italic select-none" dangerouslySetInnerHTML={{__html: t("editRestriction")}} />
        )}
        <p>{messageText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {inscription?.status !== "open" && (
        <div className="text-xs text-slate-400 italic select-none" dangerouslySetInnerHTML={{__html: t("editRestriction")}} />
      )}

      {/* Vue desktop - table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.firstName")}</TableHead>
              <TableHead>{t("table.lastName")}</TableHead>
              <TableHead>{t("table.team")}</TableHead>
              <TableHead>{t("table.gender")}</TableHead>
              <TableHead>{t("table.whatsapp")}</TableHead>
              <TableHead>{t("table.firstDay")}</TableHead>
              <TableHead>{t("table.lastDay")}</TableHead>
              <TableHead>{t("table.addedBy")}</TableHead>
              <TableHead>{t("table.addedAt")}</TableHead>
              {permissionToEdit && <TableHead>{t("table.action")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCoaches.map((coach) => (
              <TableRow key={coach.id}>
                <TableCell className="font-medium">{coach.firstName}</TableCell>
                <TableCell className="font-medium">{coach.lastName}</TableCell>
                <TableCell>{coach.team || "-"}</TableCell>
                <TableCell>
                  {coach.gender === "M" ? t("gender.men") : coach.gender === "W" ? t("gender.women") : t("gender.both")}
                </TableCell>
                <TableCell>{coach.whatsappPhone || "-"}</TableCell>
                <TableCell>
                  {coach.startDate
                    ? format(new Date(coach.startDate), "dd/MM/yyyy")
                    : "-"}
                </TableCell>
                <TableCell>
                  {coach.endDate
                    ? format(new Date(coach.endDate), "dd/MM/yyyy")
                    : "-"}
                </TableCell>
                <TableCell>{coach.addedByEmail || "-"}</TableCell>
                <TableCell>
                  {coach.createdAt
                    ? format(new Date(coach.createdAt), "dd/MM/yyyy HH:mm")
                    : "-"}
                </TableCell>
                {permissionToEdit && (
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Supprimer le coach"
                          className="cursor-pointer text-red-600 hover:text-red-800 hover:bg-red-50"
                          disabled={inscription?.status !== "open" || deleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("delete.title")}</DialogTitle>
                          <DialogDescription dangerouslySetInnerHTML={{__html: t("delete.description", {firstName: coach.firstName, lastName: coach.lastName})}} />
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="ghost">{t("delete.cancel")}</Button>
                          </DialogClose>
                          <Button
                            onClick={() => deleteCoach({coachId: coach.id})}
                            className="bg-red-600 hover:bg-red-700 cursor-pointer"
                          >
                            {t("delete.confirm")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Vue mobile - cartes */}
      <div className="md:hidden space-y-3">
        {filteredCoaches.map((coach) => (
          <div
            key={coach.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {coach.firstName} {coach.lastName}
                </h3>
                {coach.team && (
                  <p className="text-sm text-gray-600 mt-1">
                    {t("mobile.team")}: {coach.team}
                  </p>
                )}
                {coach.whatsappPhone && (
                  <p className="text-sm text-gray-600 mt-1">
                    {t("mobile.whatsapp")}: {coach.whatsappPhone}
                  </p>
                )}
                {(coach.startDate || coach.endDate) && (
                  <p className="text-sm text-gray-600 mt-1">
                    {t("mobile.period")}:{" "}
                    {coach.startDate
                      ? format(new Date(coach.startDate), "dd/MM/yyyy")
                      : "?"}{" "}
                    -{" "}
                    {coach.endDate
                      ? format(new Date(coach.endDate), "dd/MM/yyyy")
                      : "?"}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {t("mobile.addedBy")}: {coach.addedByEmail || "-"}
                </p>
                <p className="text-sm text-gray-500">
                  {t("mobile.addedOn")}:{" "}
                  {coach.createdAt
                    ? format(new Date(coach.createdAt), "dd/MM/yyyy à HH:mm")
                    : "-"}
                </p>
              </div>
              {permissionToEdit && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer text-red-600 hover:text-red-800 hover:bg-red-50"
                      disabled={inscription?.status !== "open" || deleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("delete.title")}</DialogTitle>
                      <DialogDescription dangerouslySetInnerHTML={{__html: t("delete.description", {firstName: coach.firstName, lastName: coach.lastName})}} />
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="ghost">{t("delete.cancel")}</Button>
                      </DialogClose>
                      <Button
                        onClick={() => deleteCoach({coachId: coach.id})}
                        className="bg-red-600 hover:bg-red-700 cursor-pointer"
                      >
                        {t("delete.confirm")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export du bouton WhatsApp
Coaches.WhatsAppButton = WhatsAppButton;
