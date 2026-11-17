"use client";

import React from "react";
import {
  CompetitionItem,
  JuryMember,
  CompetitionInfo,
  CompetitionInfoData,
  CompetitionInfoItem,
} from "@/app/types";
import {Calendar, MapPin, Clock, ExternalLink, Loader2} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";
import {useCompetitionByCodex} from "@/app/fisApi";
import {useInscription} from "@/app/inscriptions/form/api";
import {useDateLocale} from "@/app/lib/dateLocale";
import {useTranslations} from "next-intl";

interface EventDetailsProps {
  codex: number;
  inscriptionId?: number;
}

export const EventDetails = ({codex, inscriptionId}: EventDetailsProps) => {
  const dateLocale = useDateLocale();
  const tEvent = useTranslations("eventDetails");
  // Si on a un inscriptionId, on utilise les données de la base
  // Sinon, on utilise l'API FIS (cas de la création)
  const {data: inscription} = useInscription(
    inscriptionId ? inscriptionId.toString() : ""
  );
  const {data: fisEvent, isLoading: isFisLoading} = useCompetitionByCodex(
    codex,
    !inscription // Désactive l'appel FIS si on a les données en base
  );

  if (isFisLoading) return <Loader2 className="h-8 w-8 animate-spin" />;

  // On utilise soit les données de la base, soit les données FIS
  const eventData = inscription?.eventData || fisEvent;
  if (!eventData) return <div>{tEvent("noData")}</div>;

  return (
    <div className="mt-0">
      <div className="bg-white rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {eventData.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <span>
                  {eventData.place}, {eventData.placeNationCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={18} />
                <span>
                  {formatDate(eventData.startDate, dateLocale)} -{" "}
                  {formatDate(eventData.endDate, dateLocale)}
                </span>
              </div>
            </div>
          </div>
          {eventData.sponsor?.logoUrl && (
            <div className="flex items-center gap-2 shrink-0">
              {eventData.sponsor?.prefix && (
                <span className="text-sm text-gray-500">
                  {eventData.sponsor.prefix}
                </span>
              )}
              <a
                href={eventData.sponsor.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center cursor-pointer"
              >
                <Image
                  src={eventData.sponsor.logoUrl}
                  alt={eventData.sponsor.name || "Partenaire"}
                  width={100}
                  height={50}
                  className="object-contain"
                />
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {eventData.seasonCode && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 border-blue-200"
            >
              Saison {eventData.seasonCode}
            </Badge>
          )}
          {eventData.disciplineCode && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 border-blue-200"
            >
              Discipline: {eventData.disciplineCode}
            </Badge>
          )}
          {eventData.genderCodes && eventData.genderCodes.length > 0 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 border-blue-200"
            >
              {eventData.genderCodes.includes("M") &&
              eventData.genderCodes.includes("W")
                ? "Mixte"
                : eventData.genderCodes.includes("M")
                ? "Hommes"
                : eventData.genderCodes.includes("W")
                ? "Femmes"
                : "N/A"}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="competitions" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="competitions" className="cursor-pointer">
              Compétitions
            </TabsTrigger>
            <TabsTrigger value="details" className="cursor-pointer">
              Détails techniques
            </TabsTrigger>
            <TabsTrigger value="contact" className="cursor-pointer">
              Contact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="competitions" className="space-y-4">
            {eventData.competitions &&
            eventData.competitions.filter((c) => c.categoryCode !== "TRA")
              .length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {eventData.competitions
                  .filter((c: CompetitionItem) => c.categoryCode !== "TRA")
                  .map((competition: CompetitionItem, index: number) => (
                    <Card
                      key={competition.id || index}
                      className="overflow-hidden border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <CardHeader className="bg-gray-50 border-b pb-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <CardTitle className="text-md font-semibold text-blue-700 flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="bg-blue-600 text-white border-0 text-xs"
                              >
                                {String(
                                  competition.displayCodex || competition.codex
                                ).padStart(4, "0")}
                              </Badge>
                              {competition.eventDescriptionWithGender ||
                                competition.eventDescription}
                            </CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {formatDate(competition.date, dateLocale)}
                              </span>
                              {competition.times &&
                                competition.times.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {formatTime(competition.times[0], dateLocale)}
                                    {competition.times.length > 1 &&
                                      ` - ${formatTime(competition.times[1], dateLocale)}`}
                                  </span>
                                )}
                            </CardDescription>
                          </div>
                          {competition.status && (
                            <Badge
                              variant={
                                competition.status.toLowerCase() ===
                                "official results"
                                  ? "default"
                                  : "outline"
                              }
                              className={`text-xs ${
                                competition.status.toLowerCase() ===
                                "official results"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-200"
                              }`}
                            >
                              {translateStatus(competition.status)}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 text-sm">
                        <Accordion type="single" collapsible className="w-full">
                          {competition.competitionInfo &&
                            competition.competitionInfo.length > 0 && (
                              <AccordionItem value="technical-data">
                                <AccordionTrigger className="text-xs font-medium text-gray-600 hover:text-blue-600">
                                  Données techniques
                                </AccordionTrigger>
                                <AccordionContent>
                                  {competition.competitionInfo.map(
                                    (
                                      infoGroup: CompetitionInfo,
                                      infoIdx: number
                                    ) =>
                                      infoGroup.data &&
                                      infoGroup.data.map(
                                        (
                                          dataGroup: CompetitionInfoData,
                                          dgIndex: number
                                        ) => (
                                          <div
                                            key={`${infoIdx}-${dgIndex}`}
                                            className="mb-3 last:mb-0"
                                          >
                                            <h4 className="font-semibold text-gray-700 text-xs mb-1">
                                              {translateDynamicTitle(
                                                dataGroup.title
                                              )}
                                            </h4>
                                            <ul className="space-y-0.5 text-xs">
                                              {dataGroup.items.map(
                                                (
                                                  item: CompetitionInfoItem,
                                                  itemIndex: number
                                                ) => (
                                                  <li
                                                    key={itemIndex}
                                                    className="flex justify-between"
                                                  >
                                                    <span className="text-gray-500">
                                                      {translateDynamicTitle(
                                                        item.title
                                                      )}
                                                      :
                                                    </span>
                                                    <span className="font-medium text-gray-700">
                                                      {item.value}
                                                    </span>
                                                  </li>
                                                )
                                              )}
                                            </ul>
                                          </div>
                                        )
                                      )
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            )}
                          {competition.jury && competition.jury.length > 0 && (
                            <AccordionItem value="jury">
                              <AccordionTrigger className="text-xs font-medium text-gray-600 hover:text-blue-600">
                                Jury
                              </AccordionTrigger>
                              <AccordionContent>
                                <ul className="space-y-1 text-xs">
                                  {competition.jury.map(
                                    (
                                      member: JuryMember,
                                      memberIndex: number
                                    ) => (
                                      <li
                                        key={memberIndex}
                                        className="flex justify-between"
                                      >
                                        <span className="text-gray-500">
                                          {translateDynamicTitle(
                                            member.displayFunction ||
                                              member.function
                                          )}
                                          :
                                        </span>
                                        <span className="font-medium text-gray-700">
                                          {member.firstName} {member.lastName} (
                                          {member.nationCode})
                                        </span>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      </CardContent>
                      {(competition.sponsor?.logoUrl ||
                        competition.liveResultsUrl) && (
                        <CardFooter className="bg-gray-50 border-t p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          {competition.sponsor?.logoUrl && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {competition.sponsor?.prefix && (
                                <span>{competition.sponsor.prefix}</span>
                              )}
                              <a
                                href={competition.sponsor.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center cursor-pointer"
                              >
                                <Image
                                  src={competition.sponsor.logoUrl}
                                  alt={competition.sponsor.name || "Partenaire"}
                                  width={80}
                                  height={30}
                                  className="h-5 w-auto object-contain"
                                />
                              </a>
                            </div>
                          )}
                          {competition.liveResultsUrl && (
                            <a
                              href={competition.liveResultsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                            >
                              Voir les résultats <ExternalLink size={12} />
                            </a>
                          )}
                        </CardFooter>
                      )}
                    </Card>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Aucune compétition (hors entraînements) trouvée pour cet
                événement.
              </p>
            )}
          </TabsContent>

          <TabsContent value="details">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700">
                  Informations détaillées
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Détails techniques de l&apos;événement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {eventData.disciplineCode && (
                  <div>
                    <h3 className="font-medium text-gray-600 mb-1">
                      Discipline principale
                    </h3>
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-700"
                    >
                      {eventData.disciplineCode}
                    </Badge>
                  </div>
                )}
                {eventData.categoryCodes &&
                  eventData.categoryCodes.filter(
                    (code: string) => code !== "TRA"
                  ).length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-600 mb-1">
                        Catégories de l&apos;événement (hors TRA)
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {eventData.categoryCodes
                          .filter((code: string) => code !== "TRA")
                          .map((code: string) => (
                            <Badge
                              key={code}
                              variant="outline"
                              className="bg-gray-100 text-gray-700"
                            >
                              {code}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                {eventData.timeZone && (
                  <div>
                    <h3 className="font-medium text-gray-600 mb-1">
                      Fuseau horaire
                    </h3>
                    <p className="text-gray-700">{eventData.timeZone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700">
                  Informations de contact
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Coordonnées de l&apos;organisateur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {eventData.contactInformation ? (
                  <>
                    {(eventData.contactInformation.line1 ||
                      eventData.contactInformation.line2 ||
                      eventData.contactInformation.line4) && (
                      <div>
                        <h3 className="font-medium text-gray-600 mb-1">
                          Adresse
                        </h3>
                        {eventData.contactInformation.line1 && (
                          <p className="text-gray-700">
                            {eventData.contactInformation.line1}
                          </p>
                        )}
                        {eventData.contactInformation.line2 && (
                          <p className="text-gray-700">
                            {eventData.contactInformation.line2}
                          </p>
                        )}
                        {eventData.contactInformation.line4 && (
                          <p className="text-gray-700">
                            {eventData.contactInformation.line4}
                          </p>
                        )}
                      </div>
                    )}
                    {(eventData.contactInformation.phone ||
                      eventData.contactInformation.emailGeneral ||
                      eventData.contactInformation.emailEntries) && (
                      <div>
                        <h3 className="font-medium text-gray-600 mb-1">
                          Contact
                        </h3>
                        {eventData.contactInformation.phone && (
                          <p className="text-gray-700">
                            Téléphone: {eventData.contactInformation.phone}
                          </p>
                        )}
                        {eventData.contactInformation.emailGeneral && (
                          <p className="text-gray-700">
                            Email général:{" "}
                            <a
                              href={`mailto:${eventData.contactInformation.emailGeneral}`}
                              className="text-blue-600 hover:underline"
                            >
                              {eventData.contactInformation.emailGeneral}
                            </a>
                          </p>
                        )}
                        {eventData.contactInformation.emailEntries && (
                          <p className="text-gray-700">
                            Email inscriptions:{" "}
                            <a
                              href={`mailto:${eventData.contactInformation.emailEntries}`}
                              className="text-blue-600 hover:underline"
                            >
                              {eventData.contactInformation.emailEntries}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                    {eventData.contactInformation.website && (
                      <div>
                        <h3 className="font-medium text-gray-600 mb-1">
                          Liens
                        </h3>
                        <p>
                          <a
                            href={eventData.contactInformation.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            Site web <ExternalLink size={12} />
                          </a>
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">
                    Aucune information de contact disponible pour cet événement.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Helper function to format date
const formatDate = (dateString: string | undefined, locale: string): string => {
  if (!dateString) return "-";
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  try {
    return new Date(dateString).toLocaleDateString(locale, options);
  } catch {
    return dateString;
  }
};

// Helper function to format time
const formatTime = (timeString: string | undefined, locale: string): string => {
  if (!timeString) return "-";
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  } catch {
    return timeString;
  }
};

// Helper function to translate competition status
const translateStatus = (status: string | undefined): string => {
  if (!status) return "-";
  const lowerStatus = status.toLowerCase();
  switch (lowerStatus) {
    case "official results":
      return "Résultats Officiels";
    case "confirmed":
      return "Confirmé";
    case "cancelled":
      return "Annulé";
    case "scheduled":
      return "Programmé";
    case "postponed":
      return "Reporté";
    case "live":
      return "En direct";
    case "rescheduled":
      return "Re-programmé";
    case "provisional":
      return "Provisoire";
    // Add more translations as needed
    default:
      return status; // Return original status if no translation is available
  }
};

// Helper function to translate dynamic titles from API data
const translateDynamicTitle = (title: string | undefined): string => {
  if (!title) return "-";
  const translations: {[key: string]: string} = {
    // Section Titles
    "Technical data": "Données techniques",
    Information: "Informations",
    General: "Général",
    Reports: "Rapports",
    Jury: "Jury",
    // Technical Data Items
    "Start altitude": "Altitude de départ",
    "Finish altitude": "Altitude d'arrivée",
    "Vertical drop": "Dénivelé",
    "Course length": "Longueur du parcours",
    Homologation: "Homologation",
    // Information Items
    "Course name": "Nom du parcours",
    "Course setter": "Traceur",
    Gates: "Portes",
    "Turning gates": "Portes directionnelles",
    "Start time": "Heure de départ",
    // General Items
    Codex: "Codex",
    "Valid for FIS points": "Valide pour points FIS",
    "Valid for Olympic FIS points 2026":
      "Valide pour points FIS Olympiques 2026",
    // Reports Items
    "Timing report": "Rapport de chronométrage",
    // Jury Functions
    "Technical Delegate": "Délégué Technique",
    Referee: "Arbitre",
    "Assistant Referee": "Arbitre Assistant",
    "Chief of Race": "Chef de Piste",
    "Start Referee": "Juge au départ",
    "Finish Referee": "Juge à l'arrivée",
    "Course Chief": "Chef de Piste", // Assuming same as Chief of Race based on context
    // Add more translations as they are identified
  };
  return translations[title] || title; // Return original title if no translation is available
};
