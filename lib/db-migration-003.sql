-- Migration 003: Operator-level API keys (Tea's default keys for tenant content generation)
-- Fallback chain:
--   1. tenants.api_keys (per-tenant override for heavy tenants)
--   2. users.api_keys for the operator (Tea's default for content generation)
--   3. process.env (GEC system keys, only used for non-tenant operations like onboarding questions)
-- Run: sudo -u postgres psql -d marketing_db -f lib/db-migration-003.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS api_keys JSONB DEFAULT '{}';

COMMENT ON COLUMN users.api_keys IS 'Per-operator API key defaults (encrypted). Used by Tea for all tenant content generation unless overridden per-tenant.';
