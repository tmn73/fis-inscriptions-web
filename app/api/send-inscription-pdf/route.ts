import {NextResponse} from "next/server";
import {Resend} from "resend";
import {db} from "@/app/db/inscriptionsDB";
import {getDbTables} from "@/app/lib/getDbTables";
import {eq} from "drizzle-orm";
// Removed date-fns import - using native JS instead
import {selectNotDeleted} from "@/lib/soft-delete";
import {getUserOrganizationCode} from "@/app/lib/getUserOrganization";

export const dynamic = "force-dynamic";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is required");
  }
  return new Resend(apiKey);
}

export async function POST(request: Request) {
  try {
    const { inscriptions, organizations } = getDbTables();
    // On attend un formData (multipart)
    const formData = await request.formData();
    const pdfFile = formData.get("pdf");
    const toRaw = formData.get("to");
    const inscriptionId = formData.get("inscriptionId") as string | null;
    const subject = formData.get("subject") as string | null;
    const gender = formData.get("gender") as string | null;

    if (!pdfFile || !toRaw || !inscriptionId || !subject) {
      return NextResponse.json(
        {error: "Missing required fields: pdf, to, inscriptionId, subject"},
        {status: 400}
      );
    }

    // toRaw est un JSON.stringify d'un array
    let to: string[] = [];
    try {
      to = JSON.parse(toRaw as string);
    } catch {
      return NextResponse.json(
        {error: "Invalid 'to' field: must be a JSON array of emails."},
        {status: 400}
      );
    }

    // Récupérer les informations de l'inscription depuis la base de données (non supprimée)
    const inscription = await db
      .select()
      .from(inscriptions)
      .where(
        selectNotDeleted(
          inscriptions,
          eq(inscriptions.id, Number(inscriptionId))
        )
      )
      .limit(1);

    if (!inscription.length) {
      return NextResponse.json({error: "Inscription not found"}, {status: 404});
    }

    const eventData = inscription[0].eventData;

    // Get organization config dynamically
    const organizationCode = await getUserOrganizationCode();
    const org = await db.select().from(organizations).where(eq(organizations.code, organizationCode)).limit(1);

    if (!org.length) {
      return NextResponse.json({error: "Organization not found"}, {status: 404});
    }

    const organizationData = org[0];
    const baseUrl = organizationData.baseUrl;
    const fromEmail = organizationData.fromEmail;
    const emailTemplates = organizationData.emailTemplates;

    // pdfFile est un Blob (File)
    const arrayBuffer = await (pdfFile as Blob).arrayBuffer();
    const pdfAsBuffer = Buffer.from(arrayBuffer);

    // Use the subject provided by the frontend
    const subjectLine = subject;
    
    // Extract gender information for email body and filename
    const isMen = gender === "M";
    const isWomen = gender === "W";
    const subjectGender = isMen ? "MEN" : isWomen ? "WOMEN" : "TEAM";
    
    // Format date for the email body and filename using native JS
    const formatShortDate = (start: Date, end: Date) => {
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const startD = new Date(start);
      const endD = new Date(end);
      const sameMonth = startD.getMonth() === endD.getMonth();
      const sameYear = startD.getFullYear() === endD.getFullYear();
      const yearStr = String(endD.getFullYear()).slice(-2);
      if (sameMonth && sameYear) {
        return `${startD.getDate()}-${endD.getDate()} ${months[endD.getMonth()]} ${yearStr}`;
      } else {
        // Fallback for different months using native JS
        const formatDate = (date: Date) => {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };
        return `${formatDate(startD)}-${formatDate(endD)}`;
      }
    };
    const shortDate = formatShortDate(
      new Date(eventData.startDate),
      new Date(eventData.endDate)
    );
    const place = eventData.place || "";
    const nation = eventData.placeNationCode
      ? `(${eventData.placeNationCode})`
      : "";

    // Get email template data or fallback to hardcoded values for backwards compatibility
    const inscriptionPdfTemplate = emailTemplates?.inscription_pdf;
    const subjectPrefix = inscriptionPdfTemplate?.subject_prefix || "French 🇫🇷";
    const contactEmail = isWomen
      ? (inscriptionPdfTemplate?.contact_email?.women || "jmagnellet@orange.fr")
      : (inscriptionPdfTemplate?.contact_email?.men || "pmartin@ffs.fr");
    const signatureUrl = isWomen
      ? (inscriptionPdfTemplate?.signature_urls?.women || "https://i.imgur.com/ISeoDQp.jpeg")
      : (inscriptionPdfTemplate?.signature_urls?.men || "https://i.imgur.com/tSwmL0f.png");

    const resend = getResendClient();
    const {data, error: emailError} = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: subjectLine,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f6f7; padding: 24px; color: #222;">
          <p style="font-size: 18px; margin-bottom: 18px;">Dear Ski Friend,</p>
          <p style="font-size: 16px; margin-bottom: 18px;">
            Please find attached the ${subjectPrefix} <b><i>${subjectGender}</i></b> Team entries for the following races:
          </p>
          <ul style="margin-bottom: 18px;">
            <li style="font-size: 16px;">
              <a style="color: #1976d2; text-decoration: underline;" href="${baseUrl}/inscriptions/${inscriptionId}">${shortDate}</a>
              ➞ ${place} ${nation}-FIS
            </li>
          </ul>
          <p style="font-size: 16px; margin-bottom: 18px;">
            We kindly ask you to <b><a style="color: #1976d2; text-decoration: underline;" href="mailto:${to.join(",")}?subject=Re:%20${encodeURIComponent(subjectLine)}">reply to all</a></b> to confirm receipt, or if you need to provide us with any information or the program.
          </p>
          <p style="font-size: 16px; margin-bottom: 18px;">
            We wish you great races, and please feel free to contact me at <a href="mailto:${contactEmail}" style="color: #1976d2; text-decoration: underline;">${contactEmail}</a> if you have any questions.
          </p>
          <p style="font-size: 16px;">Best regards.</p>
          <div style="text-align: center; margin-top: 32px;">
            <img src="${signatureUrl}" alt="${organizationData.name} Team Email Signature" style="max-width: 300px; width: 100%; height: auto; display: inline-block;" />
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `${shortDate} ➞ ${place} ${nation}-FIS-${subjectGender}.pdf`
            .replace(/ +/g, " ")
            .replace(" ()", "")
            .trim(),
          content: pdfAsBuffer,
        },
      ],
    });

    if (emailError) {
      return NextResponse.json(
        {error: "Failed to send email", details: emailError},
        {status: 500}
      );
    }

    // Update inscription status based on gender
    const currentTime = new Date();
    const updateData: any = {};

    try {

      if (gender === "M") {
        updateData.menStatus = "email_sent";
        updateData.menEmailSentAt = currentTime;
      } else if (gender === "W") {
        updateData.womenStatus = "email_sent";
        updateData.womenEmailSentAt = currentTime;
      } else {
        // Fallback for non-gendered events
        updateData.status = "email_sent";
        updateData.emailSentAt = currentTime;
      }

      // Get current inscription to check if both genders are sent
      const currentInscription = inscription[0];

      // If this is a gendered event, check if we should update the global status
      if (gender && (gender === "M" || gender === "W")) {
        const otherGenderStatus = gender === "M" ? currentInscription.womenStatus : currentInscription.menStatus;

        // Update global status if:
        // 1. Both genders have been sent (otherGenderStatus === "email_sent"), OR
        // 2. This is a single-gender event (otherGenderStatus is null/undefined)
        if (otherGenderStatus === "email_sent" || !otherGenderStatus) {
          updateData.status = "email_sent";
          updateData.emailSentAt = currentTime;
        }
      }

      await db
        .update(inscriptions)
        .set(updateData)
        .where(eq(inscriptions.id, Number(inscriptionId)));
    } catch (statusError: unknown) {
      // Log the error but don't fail the request since email was sent successfully
      console.error("Failed to update inscription status after sending email:", {
        inscriptionId,
        gender,
        error: statusError instanceof Error ? statusError.message : String(statusError),
        updateData
      });
      // Return warning to client so they know status wasn't updated
      return NextResponse.json({
        message: "Email sent successfully, but status update failed. Please refresh the page or update status manually.",
        emailId: data?.id,
        warning: "Status update failed"
      }, {status: 207}); // 207 Multi-Status indicates partial success
    }

    return NextResponse.json({
      message: "Email sent successfully!",
      emailId: data?.id,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {error: "Failed to process request", details: (error as Error).message},
      {status: 500}
    );
  }
}
