#!/usr/bin/env node
const fs = require("fs");
const https = require("https");
const path = require("path");
const {parse} = require("csv-parse");
const {neon} = require("@neondatabase/serverless");

const EXPORT_URL =
  "https://www.fis-ski.com/DB/fis_athletes/ajax/fispointslistfunctions/export_fispointslist.html";
const SECTOR_CODE = "AL";
const USER_AGENT = "fis-inscriptions-web/import-competitors";
const LAST_LISTID_FILE = path.join(__dirname, ".last-listid");
const CSV_FILENAME = process.argv[2] || "FIS-points-list.csv";
const MAX_ATTEMPTS = 50; // Sécurité pour éviter une boucle infinie
const MAX_REDIRECTS = 5;

// FIS resolves a points list by its listid alone: the id is global and never
// reused across seasons. seasoncode is sent to mirror what the FIS website
// does, but it does not filter the result, so it is derived from the current
// date rather than pinned to a season that would silently go stale.
const currentSeasonCode = (date = new Date()) => {
  // A FIS season is named after the year it ends in and rolls over in July.
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= 6 ? year + 1 : year;
};

const buildExportUrl = (listid) =>
  `${EXPORT_URL}?export_csv=true&sectorcode=${SECTOR_CODE}` +
  `&seasoncode=${currentSeasonCode()}&listid=${listid}`;

// Check for database URL
defaultEnvCheck();

function defaultEnvCheck() {
  if (!process.env.NEON_DATABASE_URL) {
    console.error(
      "Error: No database URL environment variable is set. Need NEON_DATABASE_URL."
    );
    process.exit(1);
  }
}

// https.get does not follow redirects. FIS moved the export endpoint from
// data.fis-ski.com to www.fis-ski.com/DB behind a permanent redirect, so
// without this the response body is a 162 byte nginx page, not a CSV.
const httpGet = (url, redirectsLeft = MAX_REDIRECTS) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, {headers: {"User-Agent": USER_AGENT}}, (res) => {
        const {statusCode, headers} = res;
        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          res.resume();
          if (redirectsLeft === 0) {
            reject(new Error(`Too many redirects while fetching ${url}`));
            return;
          }
          const target = new URL(headers.location, url).toString();
          resolve(httpGet(target, redirectsLeft - 1));
          return;
        }
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({statusCode, body}));
      })
      .on("error", reject);
  });
};

// Describes what came back instead of a CSV, so a failure is diagnosable from
// the CI logs alone.
const describeResponse = (statusCode, body) => {
  const preview = body.replace(/\s+/g, " ").trim().slice(0, 200);
  return `HTTP ${statusCode}, ${body.length} bytes: ${preview || "<empty body>"}`;
};

const isValidCsv = (csv, expectedListid) => {
  if (!csv || csv.trim().length < 100) return false;
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return false;
  const header = lines[0];
  const firstData = lines[1];
  // Vérifie les colonnes clés
  if (
    !header.includes("Listid") ||
    !header.includes("Competitorid") ||
    !header.includes("Fiscode")
  )
    return false;
  // Vérifie la première valeur de la première ligne de données
  const firstCell = firstData.split(",")[0];
  if (String(firstCell).trim() !== String(expectedListid)) return false;
  return true;
};

const fetchList = async (listid) => {
  const url = buildExportUrl(listid);
  const {statusCode, body} = await httpGet(url);
  if (statusCode !== 200) {
    return {csv: null, reason: describeResponse(statusCode, body)};
  }
  if (!isValidCsv(body, listid)) {
    return {
      csv: null,
      reason: `response is not a points list for listid ${listid} (${describeResponse(statusCode, body)})`,
    };
  }
  return {csv: body, reason: null};
};

const readLastListId = () => {
  try {
    return parseInt(fs.readFileSync(LAST_LISTID_FILE, "utf8"), 10);
  } catch {
    return 417; // Valeur par défaut
  }
};

const writeLastListId = (listid) => {
  fs.writeFileSync(LAST_LISTID_FILE, String(listid), "utf8");
};

const sql = neon(process.env.NEON_DATABASE_URL);

const importCsvToDb = async (csvFilePath) => {
  try {
    console.log(`Reading CSV file: ${csvFilePath}`);
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Error: CSV file not found at path: ${csvFilePath}`);
      process.exit(1);
    }
    const records = [];
    const parser = fs.createReadStream(csvFilePath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    );
    parser.on("readable", function () {
      let record;
      while ((record = parser.read()) !== null) {
        const competitorData = {
          listid: parseInt(record.Listid) || null,
          listname: record.Listname,
          listpublished: parseInt(record.listPublished) || null,
          published: parseInt(record.Published) || null,
          sectorcode: record.Sectorcode,
          status: record.Status,
          competitorid: parseInt(record.Competitorid),
          fiscode: record.Fiscode,
          lastname: record.Lastname,
          firstname: record.Firstname,
          nationcode: record.Nationcode,
          gender: record.Gender,
          birthdate: record.Birthdate,
          skiclub: record.Skiclub,
          nationalcode: record.Nationalcode,
          competitorname: record.Competitorname,
          birthyear: parseInt(record.Birthyear) || null,
          calculationdate: record.Calculationdate,
          dhpoints: record.DHpoints,
          dhpos: record.DHpos,
          dhsta: record.DHSta,
          slpoints: record.SLpoints,
          slpos: record.SLpos,
          slsta: record.SLSta,
          gspoints: record.GSpoints,
          gspos: record.GSpos,
          gssta: record.GSSta,
          sgpoints: record.SGpoints,
          sgpos: record.SGpos,
          sgsta: record.SGSta,
          acpoints: record.ACpoints,
          acpos: record.ACpos,
          acsta: record.ACSta,
        };
        records.push(competitorData);
      }
    });
    parser.on("error", function (err) {
      console.error("Error parsing CSV:", err.message);
      process.exit(1);
    });
    parser.on("end", async function () {
      console.log(`Parsed ${records.length} records from CSV.`);
      if (records.length === 0) {
        console.log("No records to import.");
        return;
      }
      try {
        console.log("Starting database upsert...");
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records
            .slice(i, i + batchSize)
            .filter((r) => r.competitorid);
          console.log(
            `Processing batch ${i / batchSize + 1} of ${Math.ceil(records.length / batchSize)}...`
          );
          if (batch.length === 0) continue;
          const columns = [
            "listid",
            "listname",
            "listpublished",
            "published",
            "sectorcode",
            "status",
            "competitorid",
            "fiscode",
            "lastname",
            "firstname",
            "nationcode",
            "gender",
            "birthdate",
            "skiclub",
            "nationalcode",
            "competitorname",
            "birthyear",
            "calculationdate",
            "dhpoints",
            "dhpos",
            "dhsta",
            "slpoints",
            "slpos",
            "slsta",
            "gspoints",
            "gspos",
            "gssta",
            "sgpoints",
            "sgpos",
            "sgsta",
            "acpoints",
            "acpos",
            "acsta",
          ];
          const values = batch.map((record) =>
            columns.map((col) => record[col])
          );
          const updateSet = columns
            .filter((col) => col !== "competitorid")
            .map((col) => `"${col}" = EXCLUDED."${col}"`)
            .join(", ");
          const flatValues = values.flat();
          const valuePlaceholders = values
            .map(
              (_, rowIdx) =>
                `(${columns
                  .map(
                    (_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`
                  )
                  .join(", ")})`
            )
            .join(", ");
          const sqlText = `INSERT INTO "ffs"."competitors" (
            ${columns.map((col) => `"${col}"`).join(", ")}
          ) VALUES ${valuePlaceholders}
          ON CONFLICT (competitorid) DO UPDATE SET ${updateSet}`;
          await sql.query(sqlText, flatValues);
        }
        console.log(`Successfully processed ${records.length} records.`);
      } catch (error) {
        console.error("Error upserting data to database:", error);
        process.exit(1);
      }
      console.log("CSV file successfully processed.");
    });
  } catch (error) {
    console.error("Unhandled error:", error);
    process.exit(1);
  }
};

const main = async () => {
  // 1. Recherche du dernier listid valide et téléchargement du CSV
  const knownListId = readLastListId();

  // The list imported last time must always still be downloadable. When it is
  // not, the endpoint is broken rather than simply having no newer list, and
  // the two cases need to be distinguished: treating an outage as "nothing new"
  // is what let a moved URL look like a missing points list.
  const known = await fetchList(knownListId);
  if (!known.csv) {
    throw new Error(
      `Could not download the last known FIS points list (listid ${knownListId}).\n` +
        `URL: ${buildExportUrl(knownListId)}\n` +
        `Response: ${known.reason}`
    );
  }

  let lastValidListId = knownListId;
  let lastValidCsv = known.csv;

  // 2. Avance tant que FIS publie des listes plus récentes
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
    const nextListId = lastValidListId + 1;
    const next = await fetchList(nextListId);
    if (!next.csv) {
      console.log(
        `No points list beyond listid ${lastValidListId} yet (${next.reason})`
      );
      break;
    }
    lastValidListId = nextListId;
    lastValidCsv = next.csv;
  }

  // Nothing new since the last import: the robot runs every hour on
  // Tuesdays, so most runs end here without rewriting 11 000 rows.
  // FORCE_IMPORT=1 re-imports the current list anyway.
  if (lastValidListId === knownListId && process.env.FORCE_IMPORT !== "1") {
    console.log(
      `Listid ${knownListId} is still the latest FIS points list: nothing to import.`
    );
    return;
  }

  fs.writeFileSync(CSV_FILENAME, lastValidCsv, "utf8");
  writeLastListId(lastValidListId);
  console.log(
    `Latest valid listid: ${lastValidListId}. CSV saved to ${CSV_FILENAME}`
  );
  // 3. Import du CSV dans la base de données
  await importCsvToDb(CSV_FILENAME);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
