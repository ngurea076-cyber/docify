-- Add deactivation fields to creator_payouts and enforce unique national_id

BEGIN;

ALTER TABLE public.creator_payouts
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN deactivation_reason TEXT,
  ADD COLUMN deactivated_by UUID REFERENCES auth.users(id),
  ADD COLUMN deactivated_at TIMESTAMPTZ;

-- Ensure national_id is unique across non-null values so an ID can't be reused
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'creator_payouts_national_id_key'
  ) THEN
    CREATE UNIQUE INDEX creator_payouts_national_id_key ON public.creator_payouts (national_id) WHERE national_id IS NOT NULL;
  END IF;
END$$;

COMMIT;
