// Page of an event on the official FIS site. With a codex, the page opens on that race.
// Example: https://www.fis-ski.com/DB/general/event-details.html?sectorcode=AL&eventid=63670&seasoncode=2027&racecodex=0456
// The codex is written on 4 digits ("456" becomes "0456"), as the FIS site does.
// Without the event id or the season there is no reliable link, so none is built rather than a wrong one.
export const fisEventUrl = ({
  sectorCode,
  eventId,
  seasonCode,
  codex,
}: {
  sectorCode?: string;
  eventId?: number | string | null;
  seasonCode?: number | string | null;
  codex?: string | number | null;
}): string | undefined => {
  const event = String(eventId ?? "").trim();
  const season = String(seasonCode ?? "").trim();
  if (!event || !season) return undefined;
  const params = new URLSearchParams({
    sectorcode: sectorCode || "AL",
    eventid: event,
    seasoncode: season,
  });
  const race = String(codex ?? "").trim();
  if (race) params.set("racecodex", /^\d+$/.test(race) ? race.padStart(4, "0") : race);
  return `https://www.fis-ski.com/DB/general/event-details.html?${params.toString()}`;
};
