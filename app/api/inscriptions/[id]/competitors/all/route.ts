import {NextRequest, NextResponse} from "next/server";
import {and, eq, inArray, isNull} from "drizzle-orm";
import {db} from "@/app/db/inscriptionsDB";
import {getDbTables} from "@/app/lib/getDbTables";
import {clerkClient} from "@clerk/nextjs/server";

export const GET = async (
  req: NextRequest,
  {params}: {params: Promise<{id: string}>}
) => {
  const { competitors, inscriptionCompetitors } = getDbTables();
  const {id} = await params;
  const inscriptionId = Number(id);
  if (!inscriptionId) {
    return NextResponse.json({error: "Missing parameters"}, {status: 400});
  }

  const clerk = await clerkClient();

  // Récupérer tous les liens competitorId <-> codexNumber <-> addedBy <-> createdAt pour cette inscription
  const links = await db
    .select({
      competitorId: inscriptionCompetitors.competitorId,
      codexNumber: inscriptionCompetitors.codexNumber,
      addedBy: inscriptionCompetitors.addedBy,
      createdAt: inscriptionCompetitors.createdAt,
    })
    .from(inscriptionCompetitors)
    .where(
      and(
        eq(inscriptionCompetitors.inscriptionId, inscriptionId),
        isNull(inscriptionCompetitors.deletedAt)
      )
    );

  type LinkType = typeof links[0];
  const competitorIds = links.map((l: LinkType) => l.competitorId);

  // Construire un mapping competitorId -> [codexNumber]
  const codexMap: Record<number, string[]> = {};
  // Mapping competitorId -> addedBy (on prend le premier si plusieurs)
  const addedByMap: Record<number, string> = {};
  // Mapping competitorId -> createdAt (on prend le premier si plusieurs)
  const createdAtMap: Record<number, Date | null> = {};
  links.forEach((l: LinkType) => {
    if (!codexMap[l.competitorId]) codexMap[l.competitorId] = [];
    codexMap[l.competitorId].push(l.codexNumber);
    if (!addedByMap[l.competitorId])
      addedByMap[l.competitorId] = l.addedBy ?? "Unknown";
    if (!createdAtMap[l.competitorId])
      createdAtMap[l.competitorId] = l.createdAt;
  });

  if (competitorIds.length === 0) {
    return NextResponse.json([]);
  }

  // Récupérer les infos des compétiteurs avec tous les points
  const competitorsData = await db
    .select({
      competitorid: competitors.competitorid,
      fiscode: competitors.fiscode,
      lastname: competitors.lastname,
      firstname: competitors.firstname,
      nationcode: competitors.nationcode,
      gender: competitors.gender,
      birthdate: competitors.birthdate,
      skiclub: competitors.skiclub,
      pointsSL: competitors.slpoints,
      pointsSG: competitors.sgpoints,
      pointsGS: competitors.gspoints,
      pointsDH: competitors.dhpoints,
      pointsAC: competitors.acpoints,
    })
    .from(competitors)
    .where(inArray(competitors.competitorid, competitorIds.map(Number)));

  type CompetitorType = typeof competitorsData[0];
  
  // Récupérer tous les Clerk userId distincts
  const uniqueUserIds = Array.from(new Set(Object.values(addedByMap))).filter(
    (id): id is string => !!id && id !== "Unknown"
  );
  // Récupérer les emails Clerk en batch
  const userEmailMap: Record<string, string> = {};
  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const safeUserId = typeof userId === "string" ? userId : String(userId);
      if (!safeUserId || safeUserId === "Unknown") return;
      try {
        const user = await clerk.users.getUser(safeUserId);
        userEmailMap[safeUserId] =
          user?.emailAddresses?.[0]?.emailAddress || safeUserId;
      } catch {
        userEmailMap[safeUserId] = safeUserId;
      }
    })
  );

  // Formater la réponse avec un objet points et l'email de l'ajouteur
  const result = competitorsData
    .map((c: CompetitorType) => ({
      competitorid: c.competitorid,
      fiscode: c.fiscode,
      lastname: c.lastname,
      firstname: c.firstname,
      nationcode: c.nationcode,
      gender: c.gender,
      birthdate: c.birthdate,
      skiclub: c.skiclub,
      points: {
        SL: c.pointsSL ?? 0,
        SG: c.pointsSG ?? 0,
        GS: c.pointsGS ?? 0,
        DH: c.pointsDH ?? 0,
        AC: c.pointsAC ?? 0,
      },
      codexNumbers: codexMap[c.competitorid] || [],
      addedBy: addedByMap[c.competitorid] || "Unknown",
      addedByEmail: userEmailMap[addedByMap[c.competitorid]] || "Unknown",
      createdAt: createdAtMap[c.competitorid] || null,
    }));

  type ResultType = typeof result[0];
  const filteredResult = result.filter((c: ResultType) => Array.isArray(c.codexNumbers) && c.codexNumbers.length > 0);

  return NextResponse.json(filteredResult);
};
