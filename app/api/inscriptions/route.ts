import {NextResponse} from "next/server";
import * as z from "zod";
import {db} from "@/app/db/inscriptionsDB";
import {getDbTables} from "@/app/lib/getDbTables";
import {Resend} from "resend";
import {clerkClient} from "@clerk/clerk-sdk-node";
import {isNull, eq} from "drizzle-orm";
import {getUserOrganizationCode} from "@/app/lib/getUserOrganization";
import {checkDuplicateCodex} from "@/app/lib/checkDuplicateCodex";
import type {Competition} from "@/app/lib/checkDuplicateCodex";

// Define the schema for the request body (matching the form schema)
const inscriptionSchema = z.object({
  eventId: z.number(),
  eventData: z.any(),
  createdBy: z.string(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = inscriptionSchema.safeParse(json);

    if (!body.success) {
      return NextResponse.json(
        {error: "Invalid input", details: body.error.format()},
        {status: 400}
      );
    }

    const newInscription = body.data;

    // Validate that codex doesn't already exist (server-side validation to prevent race conditions)
    const eventDataForValidation = newInscription.eventData as Competition;
    const competitions = eventDataForValidation?.competitions;

    if (Array.isArray(competitions)) {
      for (const competition of competitions) {
        if (competition.codex && competition.seasonCode) {
          const duplicateCheck = await checkDuplicateCodex(
            competition.codex,
            competition.seasonCode
          );

          if (duplicateCheck.exists) {
            return NextResponse.json(
              {
                error: "DUPLICATE_CODEX",
                message: "Ce codex est déjà présent dans une inscription existante",
                inscriptionId: duplicateCheck.inscriptionId,
                codex: competition.codex,
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // Get organization config dynamically
    const organizationCode = await getUserOrganizationCode();
    const { inscriptions, organizations } = getDbTables();

    const result = await db
      .insert(inscriptions)
      .values({
        createdBy: newInscription.createdBy,
        eventId: newInscription.eventId,
        eventData: newInscription.eventData,
      })
      .returning();

    // Récupérer le vrai npm Clerk (username ou email)
    let creatorDisplay = newInscription.createdBy;
    try {
      const user = await clerkClient.users.getUser(newInscription.createdBy);
      creatorDisplay =
        user.username || user.emailAddresses?.[0]?.emailAddress || user.id;
    } catch {
      // fallback: id Clerk
    }

    // Infos eventData
    const eventData = newInscription.eventData || {};
    const place = eventData.place || "-";
    const nation = eventData.placeNationCode
      ? `(${eventData.placeNationCode})`
      : "";
    const startDate = eventData.startDate
      ? new Date(eventData.startDate)
      : null;
    const endDate = eventData.endDate ? new Date(eventData.endDate) : null;
    const formatDate = (d: Date) => d.toLocaleDateString("fr-FR");
    const dateStr =
      startDate && endDate
        ? `${formatDate(startDate)} au ${formatDate(endDate)}`
        : "-";
    let gender = "-";
    if (Array.isArray(eventData.genderCodes)) {
      if (
        eventData.genderCodes.includes("M") &&
        eventData.genderCodes.includes("W")
      )
        gender = "Mixte";
      else if (eventData.genderCodes.includes("M")) gender = "Hommes";
      else if (eventData.genderCodes.includes("W")) gender = "Femmes";
    }

    // Get organization configuration
    const org = await db.select().from(organizations).where(eq(organizations.code, organizationCode)).limit(1);

    if (!org[0]) {
      return NextResponse.json({error: "Organization not found"}, {status: 404});
    }

    const baseUrl = org[0].baseUrl;
    const fromEmail = org[0].fromEmail;
    const emailTemplates = org[0].emailTemplates;
    const recipients = emailTemplates?.new_inscription?.recipients || ["pmartin@ffs.fr"]; // fallback for compatibility

    // Lien vers l'événement
    const eventUrl = `${baseUrl}/inscriptions/${result[0].id}`;

    // Envoi de l'email de notification via Resend
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: fromEmail,
        to: recipients,
        subject: `Nouvelle inscription créée (eventId: ${newInscription.eventId})`,
        html: `
          <div style='font-family: Arial, sans-serif; max-width:600px; margin:0 auto; background:#f9f9f9; padding:24px; border-radius:8px;'>
            <h2 style='color:#1976d2;'>Nouvelle inscription créée</h2>
            <table style='margin-bottom:24px;'>
              <tr><td style='font-weight:bold;'>Lieu :</td><td>${place} ${nation}</td></tr>
              <tr><td style='font-weight:bold;'>Genre :</td><td>${gender}</td></tr>
              <tr><td style='font-weight:bold;'>Date :</td><td>${dateStr}</td></tr>
              <tr><td style='font-weight:bold;'>eventId :</td><td>${newInscription.eventId}</td></tr>
              <tr><td style='font-weight:bold;'>Créateur :</td><td>${creatorDisplay}</td></tr>
            </table>
            <a href='${eventUrl}' style='display:inline-block; padding:12px 28px; background:#1976d2; color:#fff; border-radius:6px; text-decoration:none; font-weight:bold; font-size:16px;'>Voir l'événement</a>
            <div style='margin-top:32px; color:#888; font-size:13px;'>
              ${new Date().toLocaleString("fr-FR")}
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'email de notification:", err);
      // On ne bloque pas la création si l'email échoue
    }

    return NextResponse.json({
      inscription: result[0],
    });
  } catch (error) {
    console.error("Failed to create inscription:", error);
    // Generic error for security
    return NextResponse.json({error: "Internal Server Error"}, {status: 500});
  }
}

export async function GET() {
  const { inscriptions } = getDbTables();
  const inscripList = await db
    .select()
    .from(inscriptions)
    .where(isNull(inscriptions.deletedAt));
  return NextResponse.json(inscripList);
}
