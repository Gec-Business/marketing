-- Migration 004: Schema improvements after deep audit
-- - Add 'partially_posted' to posts.status enum
-- - Add error_message to assessments
-- - Add billed_to to cost_tracking
-- - Add audit_log table
-- Run: sudo -u postgres psql -d marketing_db -f lib/db-migration-004.sql

-- 1. Allow 'partially_posted' status on posts
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft','tea_approved','pending_tenant','tenant_approved','scheduled','publishing','posted','partially_posted','failed','rejected'));

-- 2. Persist background pipeline errors
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 3. Track who pays for AI costs
ALTER TABLE cost_tracking ADD COLUMN IF NOT EXISTS billed_to TEXT
  CHECK (billed_to IN ('gec','operator','tenant')) DEFAULT 'gec';

-- 4. Audit log for sensitive actions (key changes, role changes, etc.)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id, created_at DESC);
