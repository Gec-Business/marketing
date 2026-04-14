-- Migration 002: Per-tenant API key override
-- Allows tenants to use their own Anthropic/OpenAI keys instead of the GEC global keys
-- Run: sudo -u postgres psql -d marketing_db -f lib/db-migration-002.sql

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS api_keys JSONB DEFAULT '{}';

COMMENT ON COLUMN tenants.api_keys IS 'Per-tenant API key overrides (encrypted). Format: { "anthropic": "encrypted_string", "openai": "encrypted_string" }';
