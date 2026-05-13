-- Migration 009: Extended onboarding fields for richer AI assessment inputs
-- Adds: sub_category, neighborhood, price_positioning, usp, marketing_goal, delivery_platforms
-- Run: sudo -u postgres psql -d marketing_db -f lib/db-migration-009.sql

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS price_positioning TEXT
  CHECK (price_positioning IN ('budget','mid-range','premium','luxury'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS usp TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS marketing_goal TEXT
  CHECK (marketing_goal IN ('awareness','followers','leads','sales','retention'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS delivery_platforms TEXT[] DEFAULT '{}';
