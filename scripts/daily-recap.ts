import {Client} from "pg";
import {sendNotificationEmail} from "../app/lib/sendNotificationEmail";
import {format} from "date-fns";
import {fr} from "date-fns/locale";
import {clerkClient} from "@clerk/clerk-sdk-node";

const dbUrl = process.env.NEON_DATABASE_URL!;
// Fallback email configuration for backwards compatibility
const fallbackEmailTo = process.env.RECAP_EMAIL_TO?.split(",") || ["pmartin@ffs.fr", "dchastan@ffs.fr"];
const fallbackEmailCc = process.env.RECAP_EMAIL_CC
  ? process.env.RECAP_EMAIL_CC.split(",")
  : [];

const main = async () => {
  const client = new Client({connectionString: dbUrl});
  await client.connect();

  // Get organization configuration (default to FFS for now)
  // TODO Phase 2: Make this dynamic (multi-org support in cron) - See MULTI_COUNTRY_PLAN.md
  const organizationCode = "FFS"; // Currently hardcoded for compatibility
  let emailTo = fallbackEmailTo;
  let emailCc = fallbackEmailCc;
  let baseUrl = "https://www.inscriptions-fis-etranger.fr"; // Fallback
  let fromEmail: string | undefined;

  try {
    const {rows: orgRows} = await client.query(
      'SELECT email_templates, base_url, from_email FROM organizations WHERE code = $1',
      [organizationCode]
    );

    if (orgRows.length > 0) {
      const org = orgRows[0];
      baseUrl = org.base_url || baseUrl;
      fromEmail = org.from_email;

      if (org.email_templates?.daily_recap) {
        const dailyRecapConfig = org.email_templates.daily_recap;
        emailTo = dailyRecapConfig.recipients || fallbackEmailTo;
        emailCc = dailyRecapConfig.cc || fallbackEmailCc;
      }
    }
  } catch (error) {
    console.warn('Could not fetch organization config, using fallback:', error);
  }

  // Récupère les ajouts de compétiteurs du jour
  const {rows: competitors} = await client.query(`
    SELECT
      'competitor_added' AS action_type,
      ic.id,
      ic.inscription_id,
      i.event_id,
      i.event_data->>'place' AS event_location,
      i.event_data->>'startDate' AS event_start_date,
      i.event_data->>'endDate' AS event_end_date,
      ic.created_at,
      c.firstname,
      c.lastname,
      ic.codex_number,
      ic.added_by
    FROM "ffs".inscription_competitors ic
    JOIN "ffs".competitors c ON ic.competitor_id = c.competitorid
    JOIN "ffs".inscriptions i ON ic.inscription_id = i.id
    WHERE ic.created_at >= CURRENT_DATE
      AND ic.created_at < CURRENT_DATE + INTERVAL '1 day'
      AND ic.deleted_at IS NULL
      AND i.deleted_at IS NULL
      AND i.status != 'cancelled'
    ORDER BY ic.created_at ASC;
  `);

  // Récupère les suppressions de compétiteurs du jour
  const {rows: deletedCompetitors} = await client.query(`
    SELECT
      'competitor_deleted' AS action_type,
      ic.id,
      ic.inscription_id,
      i.event_id,
      i.event_data->>'place' AS event_location,
      i.event_data->>'startDate' AS event_start_date,
      i.event_data->>'endDate' AS event_end_date,
      ic.deleted_at,
      c.firstname,
      c.lastname,
      ic.codex_number,
      ic.added_by
    FROM "ffs".inscription_competitors ic
    JOIN "ffs".competitors c ON ic.competitor_id = c.competitorid
    JOIN "ffs".inscriptions i ON ic.inscription_id = i.id
    WHERE ic.deleted_at >= CURRENT_DATE
      AND ic.deleted_at < CURRENT_DATE + INTERVAL '1 day'
      AND i.deleted_at IS NULL
      AND i.status != 'cancelled'
    ORDER BY ic.deleted_at ASC;
  `);

  // Récupère les créations d'événements du jour
  const {rows: events} = await client.query(`
    SELECT
      'event_created' AS action_type,
      id,
      event_id,
      event_data->>'place' AS event_location,
      event_data->>'startDate' AS event_start_date,
      event_data->>'endDate' AS event_end_date,
      created_at,
      created_by
    FROM "ffs".inscriptions
    WHERE created_at >= CURRENT_DATE
      AND created_at < CURRENT_DATE + INTERVAL '1 day'
      AND deleted_at IS NULL
    ORDER BY created_at ASC;
  `);

  // Récupère les suppressions d'événements du jour
  const {rows: deletedEvents} = await client.query(`
    SELECT
      'event_deleted' AS action_type,
      id,
      event_id,
      event_data->>'place' AS event_location,
      event_data->>'startDate' AS event_start_date,
      event_data->>'endDate' AS event_end_date,
      deleted_at,
      created_by
    FROM "ffs".inscriptions
    WHERE deleted_at >= CURRENT_DATE
      AND deleted_at < CURRENT_DATE + INTERVAL '1 day'
    ORDER BY deleted_at ASC;
  `);

  // Récupère les ajouts de coachs/staff du jour
  const {rows: coaches} = await client.query(`
    SELECT
      'coach_added' AS action_type,
      ic.id,
      ic.inscription_id,
      i.event_id,
      i.event_data->>'place' AS event_location,
      i.event_data->>'startDate' AS event_start_date,
      i.event_data->>'endDate' AS event_end_date,
      ic.created_at,
      ic.first_name,
      ic.last_name,
      ic.team,
      ic.start_date,
      ic.end_date,
      ic.added_by
    FROM "ffs".inscription_coaches ic
    JOIN "ffs".inscriptions i ON ic.inscription_id = i.id
    WHERE ic.created_at >= CURRENT_DATE
      AND ic.created_at < CURRENT_DATE + INTERVAL '1 day'
      AND ic.deleted_at IS NULL
      AND i.deleted_at IS NULL
      AND i.status != 'cancelled'
    ORDER BY ic.created_at ASC;
  `);

  // Récupère les suppressions de coachs/staff du jour
  const {rows: deletedCoaches} = await client.query(`
    SELECT
      'coach_deleted' AS action_type,
      ic.id,
      ic.inscription_id,
      i.event_id,
      i.event_data->>'place' AS event_location,
      i.event_data->>'startDate' AS event_start_date,
      i.event_data->>'endDate' AS event_end_date,
      ic.deleted_at,
      ic.first_name,
      ic.last_name,
      ic.team,
      ic.start_date,
      ic.end_date,
      ic.added_by
    FROM "ffs".inscription_coaches ic
    JOIN "ffs".inscriptions i ON ic.inscription_id = i.id
    WHERE ic.deleted_at >= CURRENT_DATE
      AND ic.deleted_at < CURRENT_DATE + INTERVAL '1 day'
      AND i.deleted_at IS NULL
      AND i.status != 'cancelled'
    ORDER BY ic.deleted_at ASC;
  `);

  // Récupère les événements dont la date limite d'envoi (J-3) est dans les 7 prochains jours et dont l'email/PDF n'a pas encore été envoyé
  const {rows: upcomingEventsWithoutEmail} = await client.query(`
    SELECT
      id,
      event_id,
      event_data->>'place' AS event_location,
      event_data->>'startDate' AS event_start_date,
      event_data->>'endDate' AS event_end_date,
      status,
      created_by,
      created_at,
      -- Calcul de la date limite (J-3)
      ((event_data->>'startDate')::date - INTERVAL '3 days') AS deadline_date,
      -- Calcul des jours restants jusqu'à la date limite
      ((event_data->>'startDate')::date - INTERVAL '3 days') - CURRENT_DATE AS days_until_deadline
    FROM "ffs".inscriptions
    WHERE deleted_at IS NULL
      AND status NOT IN ('email_sent', 'cancelled')
      AND email_sent_at IS NULL
      AND ((event_data->>'startDate')::date - INTERVAL '3 days') BETWEEN CURRENT_DATE - INTERVAL '3 days' AND CURRENT_DATE + INTERVAL '7 days'
    ORDER BY 
      -- Tri par urgence: les plus urgents en premier (J-0, J-1, J-2...)
      ((event_data->>'startDate')::date - INTERVAL '3 days') - CURRENT_DATE ASC,
      -- Puis par date de course pour départager
      (event_data->>'startDate')::date ASC;
  `);

  await client.end();

  // Si aucun changement et aucun événement à venir sans email, on n'envoie pas d'email
  if (events.length === 0 && competitors.length === 0 && deletedEvents.length === 0 && deletedCompetitors.length === 0 && coaches.length === 0 && deletedCoaches.length === 0 && upcomingEventsWithoutEmail.length === 0) {
    console.log("Aucun changement aujourd'hui et aucun événement à venir sans email, aucun email envoyé.");
    return;
  }

  // Groupement utilitaire
  const groupBy = <T, K extends keyof T>(arr: T[], key: K) =>
    arr.reduce(
      (acc, item) => {
        const k = item[key] as string;
        acc[k] = acc[k] || [];
        acc[k].push(item);
        return acc;
      },
      {} as Record<string, T[]>
    );

  // Group by type, then by event, then by codex
  const eventsById = groupBy(events, "event_id");
  const competitorsByEvent = groupBy(competitors, "event_id");
  const deletedEventsById = groupBy(deletedEvents, "event_id");
  const deletedCompetitorsByEvent = groupBy(deletedCompetitors, "event_id");
  const coachesByEvent = groupBy(coaches, "event_id");
  const deletedCoachesByEvent = groupBy(deletedCoaches, "event_id");

  // Récupère tous les userId Clerk uniques pour fetch les emails (added_by + created_by)
  const userIds = Array.from(
    new Set([
      ...competitors.map((c) => c.added_by).filter(Boolean),
      ...deletedCompetitors.map((c) => c.added_by).filter(Boolean),
      ...events.map((e) => e.created_by).filter(Boolean),
      ...deletedEvents.map((e) => e.created_by).filter(Boolean),
      ...coaches.map((c) => c.added_by).filter(Boolean),
      ...deletedCoaches.map((c) => c.added_by).filter(Boolean),
      ...upcomingEventsWithoutEmail.map((e) => e.created_by).filter(Boolean),
    ])
  );
  const userIdToEmail: Record<string, string> = {};
  for (const userId of userIds) {
    try {
      const user = await clerkClient.users.getUser(userId);
      const email =
        user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        user.username ||
        user.id;
      userIdToEmail[userId] = email;
    } catch (err) {
      userIdToEmail[userId] = userId;
      console.error("Erreur Clerk pour", userId, err);
    }
  }

  // Construction conditionnelle des blocs HTML
  const eventsCreatedHtml = Object.keys(eventsById).length > 0 ? `
    <div style="margin-bottom:32px;">
      <h3 style="color:#111827;">Événements créés</h3>
      ${Object.values(eventsById)
        .map((evts) => {
          const evt = evts[0];
          const email = userIdToEmail[evt.created_by] || evt.created_by;
          const startDate = format(new Date(evt.event_start_date), 'dd/MM/yyyy');
          const endDate = format(new Date(evt.event_end_date), 'dd/MM/yyyy');
          return `<div style='margin-bottom:16px;'>
            <a href="${baseUrl}/inscriptions/${evt.id}" style="color:#2563eb;text-decoration:underline;font-weight:bold;">${evt.event_location} (${startDate} → ${endDate})</a><br>
            <span style='color:#6b7280;'>Créé par ${email}</span>
          </div>`;
        })
        .join("")}
    </div>` : '';

  const eventsDeletedHtml = Object.keys(deletedEventsById).length > 0 ? `
    <div style="margin-bottom:32px;">
      <h3 style="color:#dc2626;">Événements supprimés</h3>
      ${Object.values(deletedEventsById)
        .map((evts) => {
          const evt = evts[0];
          const startDate = format(new Date(evt.event_start_date), 'dd/MM/yyyy');
          const endDate = format(new Date(evt.event_end_date), 'dd/MM/yyyy');
          return `<div style='margin-bottom:16px;'>
            <span style="color:#dc2626;font-weight:bold;">${evt.event_location} (${startDate} → ${endDate})</span>
          </div>`;
        })
        .join("")}
    </div>` : '';

  const competitorsAddedHtml = Object.keys(competitorsByEvent).length > 0 ? `
    <div style="margin-bottom:32px;">
      <h3 style="color:#111827;">Ajouts de coureurs</h3>
      ${Object.values(competitorsByEvent)
        .map((comps) => {
          const evt = comps[0];
          const startDate = format(new Date(evt.event_start_date), 'dd/MM/yyyy');
          const endDate = format(new Date(evt.event_end_date), 'dd/MM/yyyy');
          return `<div style='margin-bottom:24px;'>
            <a href="${baseUrl}/inscriptions/${evt.inscription_id}" style="color:#2563eb;text-decoration:underline;font-weight:bold;">${evt.event_location} (${startDate} → ${endDate})</a>
            <ul style='margin:8px 0 0 16px;padding:0;'>
              ${(() => {
                const byCodex = groupBy(comps, "codex_number");
                return Object.entries(byCodex)
                  .map(
                    ([codex, runners]) => `
                  <li style='margin-bottom:8px;'>
                    <span style='color:#111827;font-weight:500;'>Codex ${codex}</span>
                    <ul style='margin:4px 0 0 16px;padding:0;'>
                      ${runners
                        .map((runner) => {
                          const email =
                            userIdToEmail[runner.added_by] || runner.added_by;
                          return `<li style='color:#374151;'>${runner.firstname} ${runner.lastname} <span style='color:#6b7280;'>(ajouté par ${email})</span></li>`;
                        })
                        .join("")}
                    </ul>
                  </li>
                `
                  )
                  .join("");
              })()}
            </ul>
          </div>`;
        })
        .join("")}
    </div>` : '';

  const coachesAddedHtml = Object.keys(coachesByEvent).length > 0 ? `
    <div style="margin-bottom:32px;">
      <h3 style="color:#111827;">Ajouts de coachs/staff</h3>
      ${Object.values(coachesByEvent)
        .map((coachList) => {
          const evt = coachList[0];
          const startDate = format(new Date(evt.event_start_date), 'dd/MM/yyyy');
          const endDate = format(new Date(evt.event_end_date), 'dd/MM/yyyy');
          return `<div style='margin-bottom:24px;'>
            <a href="${baseUrl}/inscriptions/${evt.inscription_id}" style="color:#2563eb;text-decoration:underline;font-weight:bold;">${evt.event_location} (${startDate} → ${endDate})</a>
            <ul style='margin:8px 0 0 16px;padding:0;'>
              ${coachList
                .map((coach) => {
                  const email = userIdToEmail[coach.added_by] || coach.added_by;
                  const teamInfo = coach.team ? ` (${coach.team})` : "";
                  const startDate = format(new Date(coach.start_date), 'dd/MM/yyyy');
                  const endDate = format(new Date(coach.end_date), 'dd/MM/yyyy');
                  const period = startDate === endDate 
                    ? startDate 
                    : `${startDate} → ${endDate}`;
                  return `<li style='color:#374151;margin-bottom:4px;'>${coach.first_name} ${coach.last_name}${teamInfo} <span style='color:#16a34a;'>[${period}]</span> <span style='color:#6b7280;'>(ajouté par ${email})</span></li>`;
                })
                .join("")}
            </ul>
          </div>`;
        })
        .join("")}
    </div>` : '';

  const coachesDeletedHtml = Object.keys(deletedCoachesByEvent).length > 0 ? `
    <div style="margin-bottom:32px;">
      <h3 style="color:#dc2626;">Suppressions de coachs/staff</h3>
      ${Object.values(deletedCoachesByEvent)
        .map((coachList) => {
          const evt = coachList[0];
          const startDate = format(new Date(evt.event_start_date), 'dd/MM/yyyy');
          const endDate = format(new Date(evt.event_end_date), 'dd/MM/yyyy');
          return `<div style='margin-bottom:24px;'>
            <span style="color:#dc2626;font-weight:bold;">${evt.event_location} (${startDate} → ${endDate})</span>
            <ul style='margin:8px 0 0 16px;padding:0;'>
              ${coachList
                .map((coach) => {
                  const teamInfo = coach.team ? ` (${coach.team})` : "";
                  const startDate = format(new Date(coach.start_date), 'dd/MM/yyyy');
                  const endDate = format(new Date(coach.end_date), 'dd/MM/yyyy');
                  const period = startDate === endDate
                    ? startDate
                    : `${startDate} → ${endDate}`;
                  return `<li style='color:#dc2626;margin-bottom:4px;'>${coach.first_name} ${coach.last_name}${teamInfo} <span style='color:#16a34a;'>[${period}]</span></li>`;
                })
                .join("")}
            </ul>
          </div>`;
        })
        .join("")}
    </div>` : '';

  const competitorsDeletedHtml = Object.keys(deletedCompetitorsByEvent).length > 0 ? `
    <div style="margin-bottom:32px;">
      <h3 style="color:#dc2626;">Suppressions de coureurs</h3>
      ${Object.values(deletedCompetitorsByEvent)
        .map((comps) => {
          const evt = comps[0];
          const startDate = format(new Date(evt.event_start_date), 'dd/MM/yyyy');
          const endDate = format(new Date(evt.event_end_date), 'dd/MM/yyyy');
          return `<div style='margin-bottom:24px;'>
            <span style="color:#dc2626;font-weight:bold;">${evt.event_location} (${startDate} → ${endDate})</span>
            <ul style='margin:8px 0 0 16px;padding:0;'>
              ${(() => {
                const byCodex = groupBy(comps, "codex_number");
                return Object.entries(byCodex)
                  .map(
                    ([codex, runners]) => `
                  <li style='margin-bottom:8px;'>
                    <span style='color:#dc2626;font-weight:500;'>Codex ${codex}</span>
                    <ul style='margin:4px 0 0 16px;padding:0;'>
                      ${runners
                        .map((runner) => {
                          return `<li style='color:#dc2626;'>${runner.firstname} ${runner.lastname}</li>`;
                        })
                        .join("")}
                    </ul>
                  </li>
                `
                  )
                  .join("");
              })()}
            </ul>
          </div>`;
        })
        .join("")}
    </div>` : '';

  const upcomingEventsHtml = upcomingEventsWithoutEmail.length > 0 ? `
    <div style="margin-bottom:32px;">
      <h3 style="color:#f59e0b;">📧 Rappels d'envoi PDF - Événements prochains</h3>
      ${upcomingEventsWithoutEmail
        .map((evt) => {
          const email = userIdToEmail[evt.created_by] || evt.created_by;
          const startDate = format(
            new Date(evt.event_start_date),
            "dd/MM/yyyy"
          );
          const endDate = format(
            new Date(evt.event_end_date),
            "dd/MM/yyyy"
          );
          
          // Calcul manuel plus fiable des jours restants
          const eventDate = new Date(evt.event_start_date);
          const deadlineDate = new Date(eventDate);
          // Use UTC methods to avoid timezone-related bugs
          deadlineDate.setUTCDate(eventDate.getUTCDate() - 3); // J-3
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          deadlineDate.setUTCHours(0, 0, 0, 0);
          const diffTime = deadlineDate.getTime() - today.getTime();
          const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Logique de couleur et texte comme dans la colonne "Rappel"
          let urgencyColor = '#16a34a'; // Vert par défaut
          let urgencyText = '';
          let emailIcon = '📧';
          
          if (daysUntilDeadline < 0) {
            urgencyColor = '#6b7280'; // Gris pour passé
            urgencyText = `Date limite passée de ${Math.abs(daysUntilDeadline)} jour${Math.abs(daysUntilDeadline) > 1 ? 's' : ''}`;
            emailIcon = '🚨';
          } else if (daysUntilDeadline === 0) {
            urgencyColor = '#dc2626'; // Rouge pour J-0
            urgencyText = 'Date limite AUJOURD\'HUI ⚠️';
            emailIcon = '🚨';
          } else if (daysUntilDeadline === 1) {
            urgencyColor = '#f97316'; // Orange pour J-1
            urgencyText = 'Date limite DEMAIN';
            emailIcon = '⚠️';
          } else if (daysUntilDeadline === 2) {
            urgencyColor = '#eab308'; // Jaune pour J-2
            urgencyText = `Date limite dans ${daysUntilDeadline} jours`;
            emailIcon = '⚠️';
          } else {
            urgencyColor = '#16a34a'; // Vert pour J-3+
            urgencyText = `Date limite dans ${daysUntilDeadline} jours`;
            emailIcon = '📧';
          }
          
          return `<div style='margin-bottom:16px;border-left:4px solid ${urgencyColor};padding-left:12px;background-color:#f9fafb;border-radius:4px;padding:12px;'>
            <a href="${baseUrl}/inscriptions/${evt.id}" style="color:#2563eb;text-decoration:underline;font-weight:bold;">${evt.event_location}</a><br>
            <span style='color:#111827;font-weight:500;'>📅 Course: ${startDate === endDate ? startDate : `${startDate} → ${endDate}`}</span><br>
            <span style='color:${urgencyColor};font-weight:bold;font-size:14px;'>${emailIcon} ${urgencyText}</span><br>
            <span style='color:#6b7280;font-size:13px;'>Statut: ${evt.status} | Créé par: ${email}</span>
          </div>`;
        })
        .join("")}
    </div>` : '';

  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#f9fafb;padding:32px;">
    <h2 style="color:#2563eb;">Récapitulatif quotidien des inscriptions</h2>
    ${eventsCreatedHtml}
    ${eventsDeletedHtml}
    ${competitorsAddedHtml}
    ${coachesAddedHtml}
    ${coachesDeletedHtml}
    ${competitorsDeletedHtml}
    ${upcomingEventsHtml}
  </div>`;

  // Envoi du mail via Resend
  await sendNotificationEmail({
    to: emailTo,
    subject: "Récapitulatif quotidien des inscriptions",
    html,
    cc: emailCc,
    fromEmail,
  });

  console.log("Récapitulatif envoyé !");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
