type RaceLike = {date?: string | null; codex: number};

// Date of a race as sortable text (yyyy-MM-dd), or null when it has none or it is not a date.
const dayOf = (race: RaceLike): string | null => {
  const day = String(race.date ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
};

// Chronological order of races: by date, then by codex. A race without a date goes last.
export const compareRacesChronologically = (a: RaceLike, b: RaceLike): number => {
  const dayA = dayOf(a);
  const dayB = dayOf(b);
  if (dayA !== dayB) {
    if (dayA === null) return 1;
    if (dayB === null) return -1;
    return dayA < dayB ? -1 : 1;
  }
  return a.codex - b.codex;
};

// Sorted copy: the list it receives (often shared cached data) is never modified.
export const sortRacesChronologically = <T extends RaceLike>(races: readonly T[]): T[] =>
  [...races].sort(compareRacesChronologically);
