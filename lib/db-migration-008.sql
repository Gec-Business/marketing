-- Migration 008: Hardening fixes after deep audit
-- - Fix migration 007 idempotency for cost_tracking_category_check
-- - Backfill ad_management_fee_pct for existing tenants
-- - Add invoices.sent_at column (separate from status)
-- - Add unique partial index on system_health for atomic dedup
-- - Add invoice number sequence per year (replaces MAX-based generation)
-- - Add failed_assessment_analyzed_at to assessments
-- Run: sudo -u postgres psql -d marketing_db -f lib/db-migration-008.sql

-- 1. Backfill ad_management_fee_pct (in case migration 007 left NULLs)
UPDATE tenants SET ad_management_fee_pct = 15.00 WHERE ad_management_fee_pct IS NULL;

-- 2. Make migration 007's category constraint truly idempotent
DO $$ BEGIN
  ALTER TABLE cost_tracking DROP CONSTRAINT IF EXISTS cost_tracking_category_check;
  ALTER TABLE cost_tracking ADD CONSTRAINT cost_tracking_category_check
    CHECK (category IN ('ai_content','ai_assessment','ai_images','ai_ads','infrastructure','api_calls'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add sent_at to invoices (separate from status to avoid losing send timestamp)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- 4. Atomic dedup for system_health: normalize NULL to '' and create partial unique index
UPDATE system_health SET affected_resource = '' WHERE affected_resource IS NULL;
ALTER TABLE system_health ALTER COLUMN affected_resource SET DEFAULT '';
ALTER TABLE system_health ALTER COLUMN affected_resource SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_health_unique_active
  ON system_health(check_name, affected_resource)
  WHERE resolved = false;

-- 5. Track which failed assessments have been AI-analyzed to prevent re-analysis
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS failure_analyzed_at TIMESTAMPTZ;

-- 6. Per-year invoice sequence (atomic, replaces MAX-based numbering)
-- We use one sequence and a year prefix in code; reset is manual annually if desired.
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;
