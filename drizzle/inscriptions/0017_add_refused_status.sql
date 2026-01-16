-- Add refused status to the enum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'refused'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'ffs'))
    ) THEN
        ALTER TYPE "ffs"."status" ADD VALUE 'refused';
    END IF;
END$$;
