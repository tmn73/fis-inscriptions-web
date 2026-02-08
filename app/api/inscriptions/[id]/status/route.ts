import {db} from "@/app/db/inscriptionsDB";
import {Status} from "@/app/types";
import {getDbTables} from "@/app/lib/getDbTables";
import {eq} from "drizzle-orm";
import {NextRequest, NextResponse} from "next/server";
import {selectNotDeleted} from "@/lib/soft-delete";

export async function PATCH(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>}
) {
  try {
    const { inscriptions } = getDbTables();
    const {id} = await params;
    const body = await req.json();
    const status = body.status as Status;
    const scope = body.scope as "global" | "men" | "women" | "both" | undefined;
    const inscriptionId = Number(id);

    // Basic validation
    if (!id || !status) {
      return NextResponse.json(
        {error: "Données manquantes pour la mise à jour."},
        {status: 400}
      );
    }

    if (status !== "open" && status !== "validated" && status !== "email_sent" && status !== "cancelled" && status !== "refused" && status !== "not_concerned") {
      return NextResponse.json({error: "Statut invalide"}, {status: 400});
    }

    // Prepare update data based on scope
    const updateData: any = {};
    const currentTime = new Date();

    switch (scope) {
      case "men": {
        updateData.menStatus = status;
        if (status === "email_sent") {
          updateData.menEmailSentAt = currentTime;
        }
        // Recalculer le statut global en fonction de l'autre genre
        const [currentInscription] = await db
          .select({ womenStatus: inscriptions.womenStatus })
          .from(inscriptions)
          .where(selectNotDeleted(inscriptions, eq(inscriptions.id, inscriptionId)));
        const otherStatus = currentInscription?.womenStatus;
        if (otherStatus === "email_sent" && status === "email_sent") {
          updateData.status = "email_sent";
          updateData.emailSentAt = currentTime;
        } else {
          // Si au moins un genre n'est plus "email_sent", le statut global doit refléter ça
          updateData.status = status;
        }
        break;
      }
      case "women": {
        updateData.womenStatus = status;
        if (status === "email_sent") {
          updateData.womenEmailSentAt = currentTime;
        }
        // Recalculer le statut global en fonction de l'autre genre
        const [currentInscription] = await db
          .select({ menStatus: inscriptions.menStatus })
          .from(inscriptions)
          .where(selectNotDeleted(inscriptions, eq(inscriptions.id, inscriptionId)));
        const otherStatus = currentInscription?.menStatus;
        if (otherStatus === "email_sent" && status === "email_sent") {
          updateData.status = "email_sent";
          updateData.emailSentAt = currentTime;
        } else {
          updateData.status = status;
        }
        break;
      }
      case "both":
        updateData.menStatus = status;
        updateData.womenStatus = status;
        if (status === "email_sent") {
          updateData.menEmailSentAt = currentTime;
          updateData.womenEmailSentAt = currentTime;
        }
        // Fallthrough to also update global status
      case "global":
      default:
        updateData.status = status;
        if (status === "email_sent") {
          updateData.emailSentAt = currentTime;
        }
        break;
    }

    await db
      .update(inscriptions)
      .set(updateData)
      .where(selectNotDeleted(inscriptions, eq(inscriptions.id, inscriptionId)));
    
    return NextResponse.json({message: "Inscription mise à jour avec succès"});
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'inscription:", error);
    return NextResponse.json(
      {error: "Erreur interne du serveur"},
      {status: 500}
    );
  }
}
