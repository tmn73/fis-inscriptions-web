import {
  competitors,
  inscriptionCompetitors,
  inscriptionCoaches,
  inscriptions,
  inscriptionStatus,
} from "@/drizzle/schemaInscriptions";

export type Inscription = typeof inscriptions.$inferSelect;

export type InscriptionWithCounts = Inscription & {
  menCount: number;
  womenCount: number;
};

export type Competitor = typeof competitors.$inferSelect;

export type InscriptionCompetitor =
  typeof inscriptionCompetitors.$inferSelect & {
    points: number;
    addedByEmail?: string;
  } & Competitor;

export type InscriptionCoach = typeof inscriptionCoaches.$inferSelect & {
  addedByEmail?: string;
};

export type Status = typeof inscriptionStatus.$inferSelect;

export type Country = {
  name: {
    common: string;
  };
  cca2: string;
  flags: {
    svg: string;
    png: string;
  };
};

export type Competition = {
  id: number;
  name: string;
  organiserNationCode: string;
  place: string;
  placeNationCode: string;
  disciplineCode: string;
  seasonCode: number;
  startDate: string;
  endDate: string;
  timeZone: string;
  comment: string;
  categoryCodes: string[];
  eventCodes: Record<string, number>;
  genderCodes: string[];
  hasResultsOrStartList: boolean;
  hasPdfs: boolean;
  isCancelled: boolean;
  hasMedals: boolean;
  hasChanges: boolean;
  contactInformation: {
    line1: string;
    line2: string;
    line4: string;
    phone: string;
    emailGeneral: string;
    emailEntries: string;
    website: string;
  };
  hasPastLiveResults: boolean;
  hasLiveResults: boolean;
  hasLiveVideo: boolean;
  hasLiveGps: boolean;
  hasActiveLiveResults: boolean;
  hasActiveLiveVideo: boolean;
  hasActiveLiveGps: boolean;
  hasActivePreLiveResults: boolean;
  sponsor: {
    link: string;
    name: string;
    type: string;
    prefix: string;
    logoUrl: string;
  } | null;
  competitions: CompetitionItem[];
  modified: string;
};

export type CompetitionItem = {
  id: number;
  eventId: number;
  place: string;
  placeNationCode: string;
  seasonCode: number;
  date: string;
  times: string[];
  timeZone: string;
  codex: number;
  displayCodex: string;
  status: string;
  categoryCode: string;
  categoryDescription: string;
  eventCode: string;
  eventDescription: string;
  eventDescriptionWithGender: string;
  genderCode: "W" | "M";
  comment: string | null;
  hasResults: boolean;
  hasStartList: boolean;
  resultsOrStartListModifiedAt: string;
  hasPdfs: boolean;
  hasChanges: boolean;
  isCancelled: boolean;
  unitName: string;
  isValidForFisPoints: boolean;
  appliedPenalty: number;
  isOfficial: boolean;
  hasMedals: boolean;
  hasPastLiveResults: boolean;
  hasLiveResults: boolean;
  hasLiveVideo: boolean;
  hasLiveGps: boolean;
  hasActiveLiveResults: boolean;
  hasActiveLiveVideo: boolean;
  hasActiveLiveGps: boolean;
  hasActivePreLiveResults: boolean;
  liveResultsStatus: string;
  liveResultsInformation: string;
  liveResultsUrl: string;
  jury: JuryMember[];
  competitionInfo: CompetitionInfo[];
  sponsor: {
    link: string;
    name: string;
    type: string;
    prefix: string;
    logoUrl: string;
  } | null;
  schedule: CompetitionSchedule[];
};

export type JuryMember = {
  function: string;
  displayFunction?: string;
  lastName: string;
  firstName: string;
  nationCode: string;
  id: number | null;
};

export type CompetitionInfo = {
  title: string;
  displayOrder: number;
  data: CompetitionInfoData[];
};

export type CompetitionInfoData = {
  displayOrder: number;
  title: string;
  items: CompetitionInfoItem[];
};

export type CompetitionInfoItem = {
  title: string;
  displayOrder: number;
  value: string;
};

export type CompetitionSchedule = {
  displayOrder: number;
  startTime: string;
  unitName: string;
  status: string | null;
};

export type CodexItem = {
  displayCodex: string;
  eventCode: string;
};

export type CompetitorInscriptionDetail = {
  inscriptionId: string | number;
  eventPlace: string;
  eventStartDate: string;
  codexList: CodexItem[];
};
