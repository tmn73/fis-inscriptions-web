import {Competition} from "@/app/types";
import {
  serial,
  text,
  pgSchema,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const inscriptionsSchema = pgSchema("ffs");

export const inscriptionStatus = inscriptionsSchema.enum("status", [
  "open",
  "validated",
  "email_sent",
  "cancelled",
  "not_concerned",
]);

export const inscriptions = inscriptionsSchema.table("inscriptions", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  eventData: jsonb("event_data").$type<Competition>().notNull(),
  status: inscriptionStatus("status").default("open"),
  menStatus: inscriptionStatus("men_status"),
  womenStatus: inscriptionStatus("women_status"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  emailSentAt: timestamp("email_sent_at"),
  menEmailSentAt: timestamp("men_email_sent_at"),
  womenEmailSentAt: timestamp("women_email_sent_at"),
  deletedAt: timestamp("deleted_at"),
});

export const inscriptionCompetitors = inscriptionsSchema.table(
  "inscription_competitors",
  {
    id: serial("id").primaryKey(),
    inscriptionId: integer("inscription_id")
      .notNull()
      .references(() => inscriptions.id, {
        onDelete: "cascade",
      }),
    competitorId: integer("competitor_id")
      .notNull()
      .references(() => competitors.competitorid, {
        onDelete: "cascade",
      }),
    codexNumber: text("codex_number").notNull(),
    addedBy: text("added_by").default("Unknown"),
    createdAt: timestamp("created_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  }
);

export const competitors = inscriptionsSchema.table("competitors", {
  listid: integer("listid"),
  listname: text("listname"),
  listpublished: integer("listpublished"),
  published: integer("published"),
  sectorcode: text("sectorcode"),
  status: text("status"),
  competitorid: integer("competitorid").primaryKey(),
  fiscode: text("fiscode"),
  lastname: text("lastname"),
  firstname: text("firstname"),
  nationcode: text("nationcode"),
  gender: text("gender"),
  birthdate: text("birthdate"),
  skiclub: text("skiclub"),
  nationalcode: text("nationalcode"),
  competitorname: text("competitorname"),
  birthyear: integer("birthyear"),
  calculationdate: text("calculationdate"),
  dhpoints: text("dhpoints"),
  dhpos: text("dhpos"),
  dhsta: text("dhsta"),
  slpoints: text("slpoints"),
  slpos: text("slpos"),
  slsta: text("slsta"),
  gspoints: text("gspoints"),
  gspos: text("gspos"),
  gssta: text("gssta"),
  sgpoints: text("sgpoints"),
  sgpos: text("sgpos"),
  sgsta: text("sgsta"),
  acpoints: text("acpoints"),
  acpos: text("acpos"),
  acsta: text("acsta"),
});

export const coachGender = inscriptionsSchema.enum("coach_gender", [
  "M",
  "W",
  "BOTH",
]);

export const inscriptionCoaches = inscriptionsSchema.table(
  "inscription_coaches",
  {
    id: serial("id").primaryKey(),
    inscriptionId: integer("inscription_id")
      .notNull()
      .references(() => inscriptions.id, {
        onDelete: "cascade",
      }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    team: text("team"),
    gender: coachGender("gender").default("BOTH").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    whatsappPhone: text("whatsapp_phone"),
    addedBy: text("added_by").default("Unknown"),
    createdAt: timestamp("created_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  }
);
