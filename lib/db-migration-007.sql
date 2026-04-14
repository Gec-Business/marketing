-- Migration 007: Ads management system
-- 6 new tables for Meta/LinkedIn ads. Ad spend is paid directly by tenant to platforms;
-- GEC charges 15% management fee on top via auto-invoicing.
-- Run: sudo -u postgres psql -d marketing_db -f lib/db-migration-007.sql

-- Allow ads cost category in cost_tracking
ALTER TABLE cost_tracking DROP CONSTRAINT IF EXISTS cost_tracking_category_check;
ALTER TABLE cost_tracking ADD CONSTRAINT cost_tracking_category_check
  CHECK (category IN ('ai_content','ai_assessment','ai_images','ai_ads','infrastructure','api_calls'));

-- Add management fee % to tenants (default 15%)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ad_management_fee_pct NUMERIC(5,2) DEFAULT 15.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ads_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_ad_budget_cap NUMERIC(10,2);

-- 1. Ad accounts (one tenant can have multiple — Meta + LinkedIn separately)
CREATE TABLE IF NOT EXISTS ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta','linkedin')),
  external_account_id TEXT NOT NULL,  -- e.g., "act_123456789" for Meta
  account_name TEXT,
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','disabled','suspended','pending_deletion')),
  spend_cap NUMERIC(10,2),  -- optional hard ceiling
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, platform, external_account_id)
);

-- 2. Campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  external_id TEXT,  -- Meta campaign ID after creation
  name TEXT NOT NULL,
  objective TEXT NOT NULL CHECK (objective IN (
    'OUTCOME_AWARENESS','OUTCOME_TRAFFIC','OUTCOME_ENGAGEMENT',
    'OUTCOME_LEADS','OUTCOME_APP_PROMOTION','OUTCOME_SALES'
  )),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_review','tenant_approved','active','paused','completed','disapproved','archived')),
  budget_type TEXT CHECK (budget_type IN ('daily','lifetime')),
  daily_budget NUMERIC(10,2),
  lifetime_budget NUMERIC(10,2),
  bid_strategy TEXT,
  start_date DATE,
  end_date DATE,
  tea_approved_at TIMESTAMPTZ,
  tenant_approved_at TIMESTAMPTZ,
  disapproval_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Ad sets (targeting + budget at the ad set level)
CREATE TABLE IF NOT EXISTS ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  external_id TEXT,
  name TEXT NOT NULL,
  targeting JSONB NOT NULL DEFAULT '{}',  -- geo, age, gender, interests, behaviors, custom_audiences, exclusions
  optimization_goal TEXT,  -- LINK_CLICKS, IMPRESSIONS, REACH, CONVERSIONS, etc.
  billing_event TEXT,  -- IMPRESSIONS, LINK_CLICKS, etc.
  bid_amount NUMERIC(10,2),
  daily_budget NUMERIC(10,2),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Ads (the actual creative)
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id UUID NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  external_id TEXT,
  name TEXT NOT NULL,
  source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,  -- if boosting an organic post
  creative JSONB NOT NULL DEFAULT '{}',  -- {headline, body, cta, image_url, video_url, link_url}
  landing_url TEXT,
  status TEXT DEFAULT 'draft',
  effective_status TEXT,  -- ACTIVE, PAUSED, DISAPPROVED, PENDING_REVIEW, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Daily metrics (time-series, one row per ad per day)
CREATE TABLE IF NOT EXISTS ad_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC(10,4) DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  conversion_value NUMERIC(10,2) DEFAULT 0,
  ctr NUMERIC(7,4),  -- click-through rate
  cpc NUMERIC(10,4),  -- cost per click
  cpm NUMERIC(10,4),  -- cost per 1000 impressions
  reach BIGINT,
  frequency NUMERIC(7,4),
  raw_data JSONB DEFAULT '{}',  -- store the full API response for debugging
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ad_id, date)
);

-- 6. Audiences (saved, custom, lookalike)
CREATE TABLE IF NOT EXISTS ad_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  external_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('custom','lookalike','saved')),
  spec JSONB NOT NULL DEFAULT '{}',
  size_estimate BIGINT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_accounts_tenant ON ad_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_tenant ON ad_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_external ON ad_campaigns(external_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign ON ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_adset ON ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_ad_date ON ad_metrics(ad_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_audiences_tenant ON ad_audiences(tenant_id);

-- updated_at triggers
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['ad_accounts','ad_campaigns']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', tbl);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl);
  END LOOP;
END $$;
