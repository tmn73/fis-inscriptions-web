import {neon} from "@neondatabase/serverless";
import {parse} from "csv-parse/sync";

// Server side version of scripts/import-competitors.cjs, run on demand from the
// admin menu. The nightly GitHub job keeps running as before; both upsert into
// the same table, so running one after the other is harmless.

const EXPORT_URL =
  "https://www.fis-ski.com/DB/fis_athletes/ajax/fispointslistfunctions/export_fispointslist.html";
const SECTOR_CODE = "AL";
const USER_AGENT = "fis-inscriptions-web/import-competitors";
// How many list ids past the current one are tried before giving up
const MAX_LOOKAHEAD = 10;
// 33 columns x 500 rows stays well under Postgres' 65535 parameter limit
const BATCH_SIZE = 500;

const currentSeasonCode = (date = new Date()) => {
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= 6 ? year + 1 : year;
};

const buildExportUrl = (listid: number) =>
  `${EXPORT_URL}?export_csv=true&sectorcode=${SECTOR_CODE}` +
  `&seasoncode=${currentSeasonCode()}&listid=${listid}`;

// Returns the CSV of a points list, or null when FIS has not published it
const fetchList = async (listid: number): Promise<string | null> => {
  const res = await fetch(buildExportUrl(listid), {
    headers: {"User-Agent": USER_AGENT},
    cache: "no-store",
  });
  if (!res.ok) return null;
  const csv = await res.text();
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const header = lines[0];
  if (
    !header.includes("Listid") ||
    !header.includes("Competitorid") ||
    !header.includes("Fiscode")
  )
    return null;
  if (lines[1].split(",")[0].trim() !== String(listid)) return null;
  return csv;
};

const COLUMNS = [
  "listid", "listname", "listpublished", "published", "sectorcode", "status",
  "competitorid", "fiscode", "lastname", "firstname", "nationcode", "gender",
  "birthdate", "skiclub", "nationalcode", "competitorname", "birthyear",
  "calculationdate", "dhpoints", "dhpos", "dhsta", "slpoints", "slpos", "slsta",
  "gspoints", "gspos", "gssta", "sgpoints", "sgpos", "sgsta", "acpoints",
  "acpos", "acsta",
] as const;

const toRow = (r: Record<string, string>) => {
  const int = (v: string | undefined) => parseInt(v ?? "") || null;
  const row: Record<(typeof COLUMNS)[number], string | number | null> = {
    listid: int(r.Listid),
    listname: r.Listname,
    listpublished: int(r.listPublished),
    published: int(r.Published),
    sectorcode: r.Sectorcode,
    status: r.Status,
    competitorid: int(r.Competitorid),
    fiscode: r.Fiscode,
    lastname: r.Lastname,
    firstname: r.Firstname,
    nationcode: r.Nationcode,
    gender: r.Gender,
    birthdate: r.Birthdate,
    skiclub: r.Skiclub,
    nationalcode: r.Nationalcode,
    competitorname: r.Competitorname,
    birthyear: int(r.Birthyear),
    calculationdate: r.Calculationdate,
    dhpoints: r.DHpoints,
    dhpos: r.DHpos,
    dhsta: r.DHSta,
    slpoints: r.SLpoints,
    slpos: r.SLpos,
    slsta: r.SLSta,
    gspoints: r.GSpoints,
    gspos: r.GSpos,
    gssta: r.GSSta,
    sgpoints: r.SGpoints,
    sgpos: r.SGpos,
    sgsta: r.SGSta,
    acpoints: r.ACpoints,
    acpos: r.ACpos,
    acsta: r.ACSta,
  };
  return COLUMNS.map((c) => row[c]);
};

export type FisImportResult = {
  updated: boolean;
  listid: number;
  listname: string | null;
  count: number;
};

export async function importLatestFisPointsList(): Promise<FisImportResult> {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) throw new Error("NEON_DATABASE_URL is not set");
  const sql = neon(databaseUrl);

  const [current] = (await sql.query(
    `SELECT listid, listname FROM "ffs"."competitors"
     WHERE listid IS NOT NULL ORDER BY listid DESC LIMIT 1`
  )) as {listid: number; listname: string | null}[];
  if (!current) throw new Error("No FIS points list in the database yet");

  // Find the newest published list after the current one
  let latestId = current.listid;
  let latestCsv: string | null = null;
  for (let id = current.listid + 1; id <= current.listid + MAX_LOOKAHEAD; id++) {
    const csv = await fetchList(id);
    if (!csv) break;
    latestId = id;
    latestCsv = csv;
  }

  if (!latestCsv) {
    return {updated: false, listid: current.listid, listname: current.listname, count: 0};
  }

  const records: Record<string, string>[] = parse(latestCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  const rows = records.map(toRow).filter((row) => row[COLUMNS.indexOf("competitorid")]);

  const updateSet = COLUMNS.filter((c) => c !== "competitorid")
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(", ");
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const placeholders = batch
      .map(
        (_, r) =>
          `(${COLUMNS.map((_, c) => `$${r * COLUMNS.length + c + 1}`).join(", ")})`
      )
      .join(", ");
    await sql.query(
      `INSERT INTO "ffs"."competitors" (${COLUMNS.map((c) => `"${c}"`).join(", ")})
       VALUES ${placeholders}
       ON CONFLICT (competitorid) DO UPDATE SET ${updateSet}`,
      batch.flat()
    );
  }

  return {
    updated: true,
    listid: latestId,
    listname: records[0]?.Listname ?? null,
    count: rows.length,
  };
}
