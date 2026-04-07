-- Migration for external Neon/Postgres DB: transactions ledger for donations

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS transactions_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference TEXT UNIQUE,
  document_id UUID,
  buyer_email TEXT,
  amount BIGINT NOT NULL,
  currency TEXT DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'pending',
  platform_fee BIGINT,
  creator_earning BIGINT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_ledger_reference ON transactions_ledger (paystack_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_ledger_document ON transactions_ledger (document_id);
