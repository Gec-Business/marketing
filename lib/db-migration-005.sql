-- Migration 005: Billing automation + reports
-- Adds subscription/billing fields to tenants and creates the tenant_reports table.
-- Run: sudo -u postgres psql -d marketing_db -f lib/db-migration-005.sql

-- Billing fields on tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_currency TEXT DEFAULT 'GEL';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_start_date DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_duration_months INT;  -- NULL = ongoing
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_day INT DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_reports BOOLEAN DEFAULT true;

-- Reports generated for tenants (visible in portal, optionally emailed later)
CREATE TABLE IF NOT EXISTS tenant_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly','monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL,
  sent_to_tenant_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, report_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_reports_tenant ON tenant_reports(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_day ON tenants(billing_day) WHERE auto_invoice = true;
