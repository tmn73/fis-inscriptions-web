import { db } from "@/app/db/inscriptionsDB";
import { getDbTables } from "@/app/lib/getDbTables";
import { isNull } from "drizzle-orm";

export interface Competition {
  codex?: string | number;
  seasonCode?: string | number;
  competitions?: Competition[];
}

export interface CodexCheckResult {
  exists: boolean;
  inscriptionId?: number;
  competition?: Competition;
}

/**
 * Checks if a codex already exists in any inscription for the given season
 *
 * @param codex - The codex number to check
 * @param seasonCode - The season code to filter by (optional)
 * @param excludeInscriptionId - Inscription ID to exclude from the check (useful for updates)
 * @returns Promise<CodexCheckResult>
 */
export async function checkDuplicateCodex(
  codex: string | number,
  seasonCode?: string | number,
  excludeInscriptionId?: string | number
): Promise<CodexCheckResult> {
  const { inscriptions } = getDbTables();

  // Fetch all non-deleted inscriptions
  const result = await db
    .select({
      id: inscriptions.id,
      eventData: inscriptions.eventData,
    })
    .from(inscriptions)
    .where(isNull(inscriptions.deletedAt));

  // Iterate through inscriptions to find matching codex
  for (const row of result) {
    // Skip the excluded inscription
    if (excludeInscriptionId && String(row.id) === String(excludeInscriptionId)) {
      continue;
    }

    const eventData = row.eventData as Competition;
    const competitions = eventData?.competitions;

    if (Array.isArray(competitions)) {
      const matchingCompetition = competitions.find((c) => {
        const codexMatch = String(c.codex) === String(codex);

        // If no seasonCode is provided, don't consider as duplicate
        // (allows reuse of old codex from different seasons)
        if (!seasonCode) {
          return false;
        }

        // If seasonCode is provided, check that both match
        return codexMatch && String(c.seasonCode) === String(seasonCode);
      });

      if (matchingCompetition) {
        return {
          exists: true,
          inscriptionId: row.id,
          competition: matchingCompetition,
        };
      }
    }
  }

  return { exists: false };
}
