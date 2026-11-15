import {describe, it, expect} from "vitest";
import {fisEventUrl} from "@/app/lib/fisLinks";

describe("fisEventUrl", () => {
  it("builds the official FIS event page opened on a race, with the codex on 4 digits", () => {
    expect(fisEventUrl({sectorCode: "AL", eventId: 63670, seasonCode: 2027, codex: "456"})).toBe(
      "https://www.fis-ski.com/DB/general/event-details.html?sectorcode=AL&eventid=63670&seasoncode=2027&racecodex=0456"
    );
    expect(fisEventUrl({eventId: 63670, seasonCode: 2027, codex: 5446})).toContain("racecodex=5446");
  });

  it("builds the event page alone when there is no codex, and defaults the sector to alpine", () => {
    expect(fisEventUrl({eventId: 63670, seasonCode: 2027})).toBe(
      "https://www.fis-ski.com/DB/general/event-details.html?sectorcode=AL&eventid=63670&seasoncode=2027"
    );
    expect(fisEventUrl({sectorCode: "", eventId: 1, seasonCode: 2027, codex: ""})).not.toContain("racecodex");
  });

  it("builds no link rather than a wrong one when the event id or the season is missing", () => {
    expect(fisEventUrl({seasonCode: 2027, codex: "456"})).toBeUndefined();
    expect(fisEventUrl({eventId: 63670, codex: "456"})).toBeUndefined();
    expect(fisEventUrl({eventId: null, seasonCode: null})).toBeUndefined();
  });
});
