import {NextResponse} from "next/server";
import {desc, isNotNull} from "drizzle-orm";
import {db} from "@/app/db/inscriptionsDB";
import {getDbTables} from "@/app/lib/getDbTables";

// "20th FIS points list 2026/27" -> "20-27" (shown under a "FIS list" label)
const shortListLabel = (listname: string | null) => {
  const match = listname?.match(/^(\d+)\D.*?\d{4}\/(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
};

// The FIS points list the competitor search runs on: the newest list imported
// by scripts/import-competitors.cjs (the highest listid in the table).
export async function GET() {
  try {
    const {competitors} = getDbTables();
    const [latest] = await db
      .select({listid: competitors.listid, listname: competitors.listname})
      .from(competitors)
      .where(isNotNull(competitors.listid))
      .orderBy(desc(competitors.listid))
      .limit(1);

    if (!latest) return NextResponse.json(null);
    return NextResponse.json({
      ...latest,
      label: shortListLabel(latest.listname) ?? latest.listname ?? `${latest.listid}`,
    });
  } catch (error) {
    console.error("Erreur lors de la lecture de la liste FIS:", error);
    return new NextResponse("Erreur interne du serveur", {status: 500});
  }
}
