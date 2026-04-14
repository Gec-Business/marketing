-- Migration 001: Add compound indexes, updated_at, FK fixes, unique constraints
-- Run on VPS: psql -U marketing -d marketing_db -f lib/db-migration-001.sql

-- Compound indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_tenant_status ON posts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_scheduled ON posts(tenant_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_tenant_status ON social_connections(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_costs_tenant_created ON cost_tracking(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agents_assessment_type ON assessment_agents(assessment_id, agent_type);

-- Unique constraint on assessment_agents
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_assessment_agent_type'
  ) THEN
    ALTER TABLE assessment_agents ADD CONSTRAINT uq_assessment_agent_type UNIQUE(assessment_id, agent_type);
  END IF;
END $$;

-- Fix post_comments FK cascade
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add updated_at columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tenants','users','posts','assessments','invoices','social_connections']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', tbl);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl);
  END LOOP;
END $$;
