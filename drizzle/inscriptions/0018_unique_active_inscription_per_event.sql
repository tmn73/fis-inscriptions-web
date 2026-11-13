-- One active (not soft-deleted) inscription per FIS event.
-- Prevents duplicates created by concurrent POST requests (double click, retry).
-- Existing active duplicates must be soft-deleted before this runs.
CREATE UNIQUE INDEX IF NOT EXISTS "inscriptions_event_id_active_unique"
  ON "ffs"."inscriptions" ("event_id")
  WHERE "deleted_at" IS NULL;
