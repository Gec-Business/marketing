-- Multi-Tenant Marketing Platform Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    industry TEXT NOT NULL,
    description TEXT,
    city TEXT,
    country TEXT DEFAULT 'Georgia',
    website TEXT,
    google_maps_url TEXT,
    social_links JSONB DEFAULT '{}',
    brand_config JSONB DEFAULT '{}',
    channels TEXT[] DEFAULT '{}',
    posting_frequency TEXT DEFAULT 'daily',
    posts_per_week INT DEFAULT 5,
    video_ideas_per_month INT DEFAULT 4,
    primary_language TEXT DEFAULT 'ka',
    secondary_language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'onboarding'
        CHECK (status IN ('onboarding','assessing','strategy_review','active','paused','churned')),
    onboarding_data JSONB DEFAULT '{}',
    onboarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'tenant')),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','tiktok')),
    credentials JSONB NOT NULL,
    connected_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    UNIQUE(tenant_id, platform)
);

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','researching','analyzing','generating','review','approved','failed')),
    research_data JSONB,
    competitor_data JSONB,
    brand_audit JSONB,
    strategy_data JSONB,
    tea_approved BOOLEAN DEFAULT false,
    tenant_approved BOOLEAN DEFAULT false,
    tokens_used INT DEFAULT 0,
    cost_usd NUMERIC(8,4) DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assessment_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL CHECK (agent_type IN ('research','competitor','brand','strategy')),
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','running','completed','failed','retrying')),
    input_summary TEXT,
    output_summary TEXT,
    tokens_used INT,
    duration_ms INT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('image_post','carousel','reel','story','text_only','video')),
    platforms TEXT[] NOT NULL,
    copy_primary TEXT,
    copy_secondary TEXT,
    platform_copies JSONB DEFAULT '{}',
    hashtags TEXT[],
    media_urls TEXT[],
    video_idea JSONB,
    generated_image_url TEXT,
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','tea_approved','pending_tenant','tenant_approved','scheduled','publishing','posted','failed','rejected')),
    tea_approved_at TIMESTAMPTZ,
    tenant_approved_at TIMESTAMPTZ,
    publish_results JSONB DEFAULT '{}',
    batch_id UUID,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    component TEXT NOT NULL CHECK (component IN ('copy','hashtags','visual','video','general')),
    message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'GEL',
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('ai_content','ai_assessment','ai_images','infrastructure','api_calls')),
    description TEXT,
    amount_usd NUMERIC(8,4) NOT NULL,
    tokens_used INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_posts_tenant ON posts(tenant_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at);
CREATE INDEX idx_comments_post ON post_comments(post_id);
CREATE INDEX idx_media_tenant ON media_files(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_costs_tenant ON cost_tracking(tenant_id);
CREATE INDEX idx_assessments_tenant ON assessments(tenant_id);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_social_connections_tenant ON social_connections(tenant_id);
