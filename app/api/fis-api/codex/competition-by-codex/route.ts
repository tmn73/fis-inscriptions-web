import {NextRequest, NextResponse} from "next/server";
import {getFisToken} from "@/app/lib/fisAuth";

export const GET = async (req: NextRequest) => {
  const codex = req.nextUrl.searchParams.get("codex");
  const disciplineCode = req.nextUrl.searchParams.get("disciplineCode") || "AL";
  if (!codex) {
    return NextResponse.json({error: "Missing codex"}, {status: 400});
  }

  // 1. Appel FIS pour récupérer l'eventId
  const fisCodexRes = await fetch(
    `https://api.fis-ski.com/competitions/find-by-codex/${disciplineCode}/${codex}?season=2027`,
    {
      headers: {
        "x-api-key": process.env.FIS_API_KEY!,
        Accept: "application/json",
        "X-CSRF-TOKEN": "",
      },
    }
  );
  if (!fisCodexRes.ok) {
    return NextResponse.json(
      {error: fisCodexRes.statusText},
      {status: fisCodexRes.status}
    );
  }
  const fisCodexData = await fisCodexRes.json();
  const eventId = fisCodexData?.eventId;
  const usedDisciplineCode = fisCodexData?.disciplineCode || disciplineCode;
  if (!eventId) {
    return NextResponse.json(
      {error: "No eventId found for codex"},
      {status: 404}
    );
  }

  // 2. Récupérer le token dynamique
  let access_token: string;
  try {
    const tokenData = await getFisToken();
    access_token = tokenData.access_token;
  } catch {
    return NextResponse.json({error: "Token error"}, {status: 500});
  }

  // 3. Appel FIS pour les infos de l'évènement
  const fisEventRes = await fetch(
    `https://api.fis-ski.com/events/${usedDisciplineCode.toLowerCase()}/${eventId}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
        "X-CSRF-TOKEN": "",
      },
    }
  );
  if (!fisEventRes.ok) {
    const fisError = await fisEventRes.text();
    return NextResponse.json(
      {
        error: "FIS API error (events)",
        eventId,
        disciplineCode: usedDisciplineCode,
        url: `https://api.fis-ski.com/events/${usedDisciplineCode.toLowerCase()}/${eventId}`,
        fisCodexData, // réponse brute de la première requête
        fisError,
        status: fisEventRes.status,
      },
      {status: fisEventRes.status}
    );
  }
  const eventData = await fisEventRes.json();
  return NextResponse.json(eventData);
};
