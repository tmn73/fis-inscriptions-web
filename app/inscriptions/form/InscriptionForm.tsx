"use client";

import React, {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {useCompetitionByCodex} from "@/app/fisApi";
import {useCreateInscription, useCodexCheck} from "./api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {useUser} from "@clerk/nextjs";
import {useRouter} from "next/navigation";
import {Inscription, Competition, CompetitionItem} from "@/app/types";
import {Card} from "@/components/ui/card";
import {EventDetails} from "@/components/EventDetails";

export const InscriptionFormWrapper = () => {
  const {user} = useUser();
  const router = useRouter();
  const form = useForm<z.infer<typeof inscriptionFormSchema>>({
    resolver: zodResolver(inscriptionFormSchema),
    defaultValues: {codex: ""},
  });
  const [codexInput, setCodexInput] = useState("");
  const [searchedCodex, setSearchedCodex] = useState<string | null>(null);
  const [serverError, setServerError] = useState<{
    message: string;
    inscriptionId?: number;
  } | null>(null);
  const {
    data: eventUntyped,
    isLoading,
    error,
  } = useCompetitionByCodex(searchedCodex ? Number(searchedCodex) : 0);
  const {createInscription} = useCreateInscription();

  const event = eventUntyped as Competition | null | undefined;

  const {data: codexCheck} = useCodexCheck(
    searchedCodex ?? "",
    undefined,
    event?.seasonCode ? String(event.seasonCode) : undefined
  );

  const isTrainingEvent =
    event &&
    event.categoryCodes?.includes("TRA") &&
    event.categoryCodes.length === 1;

  const onSubmit = async () => {
    if (!event || isTrainingEvent || !user || (codexCheck !== undefined && codexCheck.exists))
      return;

    // Clear any previous server errors
    setServerError(null);

    const eventDataForDb = JSON.parse(JSON.stringify(event));

    if (
      eventDataForDb.competitions &&
      Array.isArray(eventDataForDb.competitions)
    ) {
      eventDataForDb.competitions = eventDataForDb.competitions.filter(
        (comp: CompetitionItem) => comp.categoryCode !== "TRA"
      );
    } else {
      eventDataForDb.competitions = [];
    }

    if (
      eventDataForDb.categoryCodes &&
      Array.isArray(eventDataForDb.categoryCodes)
    ) {
      eventDataForDb.categoryCodes = eventDataForDb.categoryCodes.filter(
        (code: string) => code !== "TRA"
      );
    } else {
      eventDataForDb.categoryCodes = [];
    }

    const createdBy = user.id;
    const newInscription = {
      eventId: event.id,
      eventData: eventDataForDb,
      createdBy,
    };

    try {
      const returningInscription: {inscription: Inscription} =
        await createInscription.mutateAsync(newInscription);
      router.push(`/inscriptions/${returningInscription.inscription.id}`);
    } catch (err) {
      // Handle duplicate codex error from server
      const error = err as Error & { errorCode?: string; inscriptionId?: number };
      if (error.errorCode === "DUPLICATE_CODEX" && error.inscriptionId) {
        setServerError({
          message: error.message,
          inscriptionId: error.inscriptionId,
        });
      } else {
        // Generic error
        setServerError({
          message: error.message || "Erreur lors de la création de l'inscription",
        });
      }
    }
  };

  return (
    <div className="mx-auto max-w-12xl px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="max-w-4xl mx-auto mb-8 text-center">
          <h1 className="text-xl font-semibold text-[#3d7cf2] mb-4">
            Nouvelle Demande d&apos;Inscription
          </h1>
          <p className="text-sm text-gray-500">
            Le formulaire d&apos;inscription sera envoyé à l&apos;organisateur
            au plus tard 36 heures avant le 1er TCM (8 jours pour NJC ou NC,
            délai règlementaire pour une demande d&apos;invitation en NC)
          </p>
        </div>

        <Card className="mb-6 p-4 sm:p-6 max-w-2xl mx-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors, values) => {
                console.log("ZOD ERRORS", errors, values);
              })}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="codex"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Codex</FormLabel>
                    <span className="text-sm text-gray-500 mb-1 block">
                      Veuillez entrer un des codex de l&apos;événement à ajouter
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <FormControl>
                        <Input
                          placeholder="ex: 1234"
                          {...field}
                          value={codexInput}
                          onChange={(e) => {
                            const onlyDigits = e.target.value.replace(
                              /\D/g,
                              ""
                            );
                            setCodexInput(onlyDigits);
                            field.onChange({
                              ...e,
                              target: {
                                ...e.target,
                                value: onlyDigits,
                              },
                            });
                          }}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="max-w-xs w-full"
                        />
                      </FormControl>
                      <button
                        type="button"
                        className="bg-gray-200 px-4 py-2 rounded cursor-pointer border border-gray-300 hover:bg-gray-300 whitespace-nowrap"
                        onClick={() => setSearchedCodex(codexInput)}
                        disabled={isLoading}
                      >
                        Chercher
                      </button>
                    </div>
                    <FormMessage />
                    {searchedCodex &&
                      codexCheck !== undefined &&
                      codexCheck.exists &&
                      codexCheck.inscriptionId && (
                        <div className="mt-2 text-red-600">
                          Ce codex est déjà présent dans une{" "}
                          <a
                            href={`/inscriptions/${codexCheck.inscriptionId}`}
                            className="underline text-blue-600"
                          >
                            inscription existante
                          </a>
                          .
                        </div>
                      )}
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </Card>

        {event && isTrainingEvent && (
          <p className="text-orange-600 mt-4 mb-6">
            Les compétitions de type &apos;Training&apos; (TRA) uniquement ne
            peuvent pas être sélectionnées pour une inscription.
          </p>
        )}

        {isLoading && <p className="mb-6">Chargement des infos FIS...</p>}
        {error && (
          <p className="text-red-500 mb-6">
            {error instanceof Error && error.message === "Codex non trouvé"
              ? "Codex non trouvé."
              : "Erreur lors de la récupération de l'événement."}
          </p>
        )}

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6 max-w-2xl mx-auto">
            <p className="font-semibold">Erreur lors de la création</p>
            <p className="mt-1">
              {serverError.message}
              {serverError.inscriptionId && (
                <>
                  {" "}
                  <a
                    href={`/inscriptions/${serverError.inscriptionId}`}
                    className="underline text-blue-600 hover:text-blue-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir l&apos;inscription existante
                  </a>
                </>
              )}
            </p>
          </div>
        )}

        {event && !isTrainingEvent && codexCheck !== undefined && !codexCheck?.exists && (
          <EventDetails codex={Number(searchedCodex)} />
        )}
        {event && !isTrainingEvent && codexCheck !== undefined && !codexCheck?.exists && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={onSubmit}
              className="bg-[#3d7cf2] hover:bg-[#3369d6] text-white px-8 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              disabled={
                isLoading ||
                !event ||
                isTrainingEvent ||
                (codexCheck !== undefined && codexCheck.exists)
              }
            >
              Créer la compétition
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const inscriptionFormSchema = z.object({
  codex: z
    .string()
    .min(1, {message: "Le codex est requis."})
    .regex(/^[\d]+$/, {
      message: "Le codex doit contenir uniquement des chiffres.",
    }),
});
