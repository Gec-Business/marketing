-- Migration 006: System health monitoring
-- Tracks all health check results, alerts, and notifications.
-- Run: sudo -u postgres psql -d marketing_db -f lib/db-migration-006.sql

CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  status TEXT NOT NULL CHECK (status IN ('ok','warn','fail')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  affected_resource TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_unresolved
  ON system_health(created_at DESC) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_system_health_severity
  ON system_health(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_check
  ON system_health(check_name, created_at DESC);
