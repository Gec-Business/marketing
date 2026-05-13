-- Migration 010: assets table + seasonal_posting flag

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  category TEXT CHECK (category IN ('venue', 'product', 'team', 'event', 'brand', 'other')) DEFAULT 'other',
  tags TEXT[] DEFAULT '{}',
  alt_text TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_category ON assets (tenant_id, category);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seasonal_posting BOOLEAN DEFAULT false;
