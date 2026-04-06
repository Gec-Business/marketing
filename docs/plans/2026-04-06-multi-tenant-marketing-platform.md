# Multi-Tenant Marketing Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant social media management platform where Tea (operations manager) manages multiple client tenants — from onboarding and AI-powered assessment through content generation, approval workflows, and automated publishing to Facebook, Instagram, LinkedIn, and TikTok.

**Architecture:** Next.js 16 App Router on VPS (167.86.79.194) with PostgreSQL, Nginx reverse proxy, and Let's Encrypt SSL. Three user roles: Admin (owner), Operator (Tea), Tenant (clients). AI engine uses Claude API for research, brand audits, strategy generation, and content creation. Image generation via DALL-E API. Publishing engine supports FB, IG, LinkedIn, TikTok with per-tenant OAuth credentials.

**Tech Stack:** Next.js 16, React 19, TypeScript, PostgreSQL 16, Tailwind CSS 4, Claude API, DALL-E API, Nginx, PM2, Let's Encrypt

**Domain:** mk.gecbusiness.com  
**VPS:** Ubuntu 24.04 | 6 CPU | 12 GB RAM | 190 GB disk  
**Repo:** github.com/Gec-Business/marketing

---

## File Structure

```
marketing/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing/login page
│   ├── globals.css                   # Global styles (Tailwind)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts        # POST login (operator + tenant)
│   │   │   ├── logout/route.ts       # POST logout
│   │   │   └── me/route.ts           # GET current session
│   │   ├── tenants/
│   │   │   ├── route.ts              # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET/PATCH/DELETE tenant
│   │   │       └── onboarding/route.ts  # POST onboarding data
│   │   ├── assessments/
│   │   │   ├── route.ts              # POST trigger assessment
│   │   │   ├── [id]/route.ts         # GET assessment status/result
│   │   │   └── [id]/pdf/route.ts     # GET download PDF
│   │   ├── strategies/
│   │   │   ├── route.ts              # POST generate strategy
│   │   │   ├── [id]/route.ts         # GET strategy
│   │   │   └── [id]/pdf/route.ts     # GET download PDF
│   │   ├── content/
│   │   │   ├── route.ts              # GET list, POST generate batch
│   │   │   ├── [id]/route.ts         # GET/PATCH post
│   │   │   ├── [id]/approve/route.ts # POST approve/reject
│   │   │   ├── [id]/comments/route.ts # GET/POST comments
│   │   │   └── upload/route.ts       # POST upload media
│   │   ├── publish/
│   │   │   ├── route.ts              # POST publish single post
│   │   │   └── cron/route.ts         # POST auto-publish (cron)
│   │   ├── connect/
│   │   │   ├── facebook/route.ts     # GET start FB OAuth
│   │   │   ├── facebook/callback/route.ts
│   │   │   ├── instagram/route.ts    # Uses same FB OAuth
│   │   │   ├── linkedin/route.ts     # GET start LI OAuth
│   │   │   ├── linkedin/callback/route.ts
│   │   │   ├── tiktok/route.ts       # GET start TT OAuth
│   │   │   └── tiktok/callback/route.ts
│   │   ├── invoices/
│   │   │   ├── route.ts              # GET list, POST create
│   │   │   ├── [id]/route.ts         # GET/PATCH invoice
│   │   │   └── [id]/pdf/route.ts     # GET download PDF
│   │   └── health/route.ts           # GET system health
│   ├── operator/                     # Tea's dashboard
│   │   ├── layout.tsx                # Sidebar + topbar
│   │   ├── page.tsx                  # Overview: all tenants summary
│   │   ├── tenants/
│   │   │   ├── page.tsx              # Tenant list
│   │   │   ├── new/page.tsx          # Onboarding wizard
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Tenant detail/overview
│   │   │       ├── assessment/page.tsx   # View/trigger assessment
│   │   │       ├── strategy/page.tsx     # View/approve strategy
│   │   │       ├── content/page.tsx      # Content calendar + mgmt
│   │   │       ├── connect/page.tsx      # Social account connections
│   │   │       ├── invoices/page.tsx     # Tenant invoices
│   │   │       └── settings/page.tsx     # Tenant settings
│   │   ├── invoices/page.tsx         # All invoices across tenants
│   │   └── settings/page.tsx         # Operator settings
│   └── portal/                       # Tenant portal (simple view)
│       ├── layout.tsx                # Minimal layout
│       ├── page.tsx                  # Tenant's content overview
│       ├── content/
│       │   ├── page.tsx              # Content list for approval
│       │   └── [id]/page.tsx         # Single post detail + comments
│       ├── upload/page.tsx           # Upload videos/visuals
│       ├── strategy/page.tsx         # View their strategy docs
│       └── invoices/page.tsx         # View their invoices
├── components/
│   ├── operator/                     # Tea's dashboard components
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── TenantCard.tsx
│   │   ├── OnboardingWizard.tsx
│   │   ├── ContentCalendar.tsx
│   │   ├── PostEditor.tsx
│   │   ├── ApprovalFlow.tsx
│   │   ├── ConnectWizard.tsx
│   │   ├── InvoiceForm.tsx
│   │   └── AssessmentView.tsx
│   ├── portal/                       # Tenant portal components
│   │   ├── PortalNav.tsx
│   │   ├── PostReview.tsx
│   │   ├── CommentThread.tsx
│   │   ├── MediaUploader.tsx
│   │   └── ApprovalButtons.tsx
│   └── ui/                           # Shared UI primitives
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Toast.tsx
│       ├── Badge.tsx
│       ├── Spinner.tsx
│       └── FileUpload.tsx
├── lib/
│   ├── db.ts                         # PostgreSQL client (pg)
│   ├── db-schema.sql                 # Full database schema
│   ├── db-seed.sql                   # Initial seed data
│   ├── auth.ts                       # iron-session config + helpers
│   ├── types.ts                      # All TypeScript interfaces
│   ├── constants.ts                  # Enums, platform configs
│   ├── utils.ts                      # Caption builder, date helpers
│   ├── ai/
│   │   ├── client.ts                 # Claude API client wrapper
│   │   ├── research-agent.ts         # Onboarding research (Google Maps, social)
│   │   ├── competitor-agent.ts       # Competitor analysis
│   │   ├── brand-agent.ts            # Brand audit (CBBE, SWOT, etc.)
│   │   ├── strategy-agent.ts         # Strategy document generation
│   │   ├── content-generator.ts      # Post content generation
│   │   ├── video-ideas-generator.ts  # Video scenario generation
│   │   └── onboarding-questions.ts   # Dynamic industry questions
│   ├── publishers/
│   │   ├── facebook.ts               # FB Graph API publishing
│   │   ├── instagram.ts              # IG Container API publishing
│   │   ├── linkedin.ts               # LI API publishing
│   │   ├── tiktok.ts                 # TT API publishing
│   │   └── engine.ts                 # Unified publish orchestrator
│   ├── images/
│   │   └── generator.ts              # DALL-E image generation
│   ├── pdf/
│   │   ├── assessment-report.ts      # Assessment PDF builder
│   │   ├── strategy-report.ts        # Strategy PDF builder
│   │   └── invoice.ts                # Invoice PDF builder
│   └── storage.ts                    # File upload to local disk
├── middleware.ts                      # Route protection + tenant context
├── next.config.ts
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── .env.example
├── .gitignore
└── deploy/
    ├── setup-vps.sh                  # VPS initial setup script
    ├── nginx.conf                    # Nginx site config
    ├── ecosystem.config.js           # PM2 process config
    └── backup.sh                     # Database backup script
```

---

## Database Schema

```sql
-- Core multi-tenant tables

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'tenant')),
    tenant_id UUID REFERENCES tenants(id),  -- NULL for admin/operator
    created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','tiktok')),
    credentials JSONB NOT NULL,  -- encrypted: tokens, page_id, etc.
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
    tokens_used INT DEFAULT 0,
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
    copy_primary TEXT,          -- Georgian
    copy_secondary TEXT,        -- English
    platform_copies JSONB DEFAULT '{}',  -- per-platform overrides
    hashtags TEXT[],
    media_urls TEXT[],          -- local file paths or URLs
    video_idea JSONB,           -- {concept, scenario, texts, duration}
    generated_image_url TEXT,   -- DALL-E generated image
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','tea_approved','pending_tenant','tenant_approved','scheduled','publishing','posted','failed','rejected')),
    tea_approved_at TIMESTAMPTZ,
    tenant_approved_at TIMESTAMPTZ,
    publish_results JSONB DEFAULT '{}',  -- per-platform results
    batch_id UUID,              -- links posts from same generation
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
    file_path TEXT NOT NULL,    -- local storage path
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    items JSONB NOT NULL,       -- [{description, amount}]
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
```

---

## Phases Overview

| Phase | Focus | Tasks |
|-------|-------|-------|
| **Phase 1** | VPS Setup + Database + Auth | Tasks 1-4 |
| **Phase 2** | Tenant Onboarding + AI Assessment | Tasks 5-8 |
| **Phase 3** | Content Generation + Approval Workflow | Tasks 9-12 |
| **Phase 4** | Publishing Engine (FB, IG, LI, TikTok) | Tasks 13-16 |
| **Phase 5** | Tenant Portal + Media Upload | Tasks 17-19 |
| **Phase 6** | Invoicing + PDF Reports | Tasks 20-22 |
| **Phase 7** | Deployment + DNS + SSL | Tasks 23-24 |

---

## Phase 1: VPS Setup + Database + Auth

### Task 1: VPS Infrastructure Setup

**Files:**
- Create: `deploy/setup-vps.sh`
- Create: `deploy/nginx.conf`
- Create: `deploy/ecosystem.config.js`

- [ ] **Step 1: Create VPS setup script**

```bash
#!/bin/bash
# deploy/setup-vps.sh — Run on VPS as root/sudo

set -e

# System updates
apt update && apt upgrade -y

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Install PostgreSQL 16
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2 globally
npm install -g pm2

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Create app directory
mkdir -p /var/www/marketing
chown likuna:likuna /var/www/marketing

# Create uploads directory
mkdir -p /var/www/marketing/uploads
chown likuna:likuna /var/www/marketing/uploads

# PostgreSQL setup
sudo -u postgres psql -c "CREATE USER marketing WITH PASSWORD 'mk_gec_2026_secure';"
sudo -u postgres psql -c "CREATE DATABASE marketing_db OWNER marketing;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE marketing_db TO marketing;"

# Enable services
systemctl enable postgresql
systemctl enable nginx
systemctl start postgresql
systemctl start nginx

echo "VPS setup complete"
echo "Node: $(node --version)"
echo "PostgreSQL: $(psql --version)"
echo "Nginx: $(nginx -v 2>&1)"
```

- [ ] **Step 2: Create Nginx config**

```nginx
# deploy/nginx.conf
server {
    listen 80;
    server_name mk.gecbusiness.com;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    location /uploads {
        alias /var/www/marketing/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

- [ ] **Step 3: Create PM2 ecosystem config**

```javascript
// deploy/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'marketing',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/marketing',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/www/marketing/logs/error.log',
    out_file: '/var/www/marketing/logs/out.log',
  }]
};
```

- [ ] **Step 4: Run setup script on VPS**

```bash
scp deploy/setup-vps.sh likuna@167.86.79.194:/tmp/
ssh likuna@167.86.79.194 "sudo bash /tmp/setup-vps.sh"
```

- [ ] **Step 5: Commit**

```bash
git add deploy/
git commit -m "feat: add VPS infrastructure setup scripts"
```

---

### Task 2: Project Scaffold + Database Schema

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `lib/db.ts`
- Create: `lib/db-schema.sql`
- Create: `lib/types.ts`

- [ ] **Step 1: Initialize Next.js project**

```json
// package.json
{
  "name": "marketing-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "db:push": "psql $DATABASE_URL -f lib/db-schema.sql",
    "db:seed": "psql $DATABASE_URL -f lib/db-seed.sql"
  },
  "dependencies": {
    "next": "^16.1.4",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "pg": "^8.13",
    "iron-session": "^8.0.4",
    "@anthropic-ai/sdk": "^0.39",
    "openai": "^4.77",
    "bcryptjs": "^3.0",
    "pdf-lib": "^1.17",
    "fontkit": "^2.0",
    "sharp": "^0.33",
    "uuid": "^11"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/pg": "^8",
    "@types/bcryptjs": "^3",
    "@types/uuid": "^10",
    "eslint": "^9",
    "eslint-config-next": "^16.1.4"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create Next.js config**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pg', 'sharp', 'pdf-lib'],
};

export default nextConfig;
```

- [ ] **Step 4: Create PostCSS config**

```javascript
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

- [ ] **Step 5: Create .env.example**

```bash
# .env.example

# Database
DATABASE_URL=postgresql://marketing:mk_gec_2026_secure@localhost:5432/marketing_db

# Auth
SESSION_SECRET=at-least-32-characters-long-random-string-here
ADMIN_PASSWORD=change-this-admin-password

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (DALL-E image generation)
OPENAI_API_KEY=sk-...

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...

# Meta (Facebook + Instagram) — per-tenant, stored in DB
# LinkedIn — per-tenant, stored in DB
# TikTok — per-tenant, stored in DB

# App
APP_URL=https://mk.gecbusiness.com
CRON_SECRET=random-cron-secret-here
UPLOAD_DIR=/var/www/marketing/uploads
```

- [ ] **Step 6: Create .gitignore**

```
# .gitignore
node_modules/
.next/
.env
.env.local
*.log
uploads/
.DS_Store
```

- [ ] **Step 7: Create database connection module**

```typescript
// lib/db.ts
import { Pool, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export { pool };
```

- [ ] **Step 8: Create full database schema**

Write the full SQL schema from the Database Schema section above into `lib/db-schema.sql`.

- [ ] **Step 9: Create TypeScript types**

```typescript
// lib/types.ts

export type UserRole = 'admin' | 'operator' | 'tenant';
export type TenantStatus = 'onboarding' | 'assessing' | 'strategy_review' | 'active' | 'paused' | 'churned';
export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
export type ContentType = 'image_post' | 'carousel' | 'reel' | 'story' | 'text_only' | 'video';
export type PostStatus = 'draft' | 'tea_approved' | 'pending_tenant' | 'tenant_approved' | 'scheduled' | 'publishing' | 'posted' | 'failed' | 'rejected';
export type CommentComponent = 'copy' | 'hashtags' | 'visual' | 'video' | 'general';
export type AssessmentStatus = 'pending' | 'researching' | 'analyzing' | 'generating' | 'review' | 'approved' | 'failed';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type AgentType = 'research' | 'competitor' | 'brand' | 'strategy';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string | null;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  description: string | null;
  city: string | null;
  country: string;
  website: string | null;
  google_maps_url: string | null;
  social_links: Record<string, string>;
  brand_config: Record<string, unknown>;
  channels: Platform[];
  posting_frequency: string;
  posts_per_week: number;
  video_ideas_per_month: number;
  primary_language: string;
  secondary_language: string;
  status: TenantStatus;
  onboarding_data: Record<string, unknown>;
  onboarded_at: string | null;
  created_at: string;
}

export interface SocialConnection {
  id: string;
  tenant_id: string;
  platform: Platform;
  credentials: Record<string, unknown>;
  connected_at: string;
  expires_at: string | null;
  status: string;
}

export interface Post {
  id: string;
  tenant_id: string;
  content_type: ContentType;
  platforms: Platform[];
  copy_primary: string | null;
  copy_secondary: string | null;
  platform_copies: Record<string, { primary: string; secondary: string }>;
  hashtags: string[];
  media_urls: string[];
  video_idea: { concept: string; scenario: string; texts: string[]; duration: string } | null;
  generated_image_url: string | null;
  scheduled_at: string | null;
  status: PostStatus;
  tea_approved_at: string | null;
  tenant_approved_at: string | null;
  publish_results: Record<string, unknown>;
  batch_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  component: CommentComponent;
  message: string;
  resolved: boolean;
  created_at: string;
  user_name?: string;
}

export interface Assessment {
  id: string;
  tenant_id: string;
  status: AssessmentStatus;
  research_data: Record<string, unknown> | null;
  competitor_data: Record<string, unknown> | null;
  brand_audit: Record<string, unknown> | null;
  strategy_data: Record<string, unknown> | null;
  tea_approved: boolean;
  tenant_approved: boolean;
  tokens_used: number;
  cost_usd: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  items: { description: string; amount: number }[];
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface SessionData {
  user_id: string;
  role: UserRole;
  tenant_id: string | null;
  is_logged_in: boolean;
}
```

- [ ] **Step 10: Run `npm install`**

```bash
npm install
```

- [ ] **Step 11: Push schema to VPS database**

```bash
ssh likuna@167.86.79.194 "sudo -u postgres psql marketing_db" < lib/db-schema.sql
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: project scaffold with database schema, types, and config"
```

---

### Task 3: Authentication System

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/me/route.ts`
- Create: `middleware.ts`
- Create: `lib/db-seed.sql`

- [ ] **Step 1: Create auth helpers**

```typescript
// lib/auth.ts
import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { query, queryOne } from './db';
import type { SessionData, User } from './types';
import bcrypt from 'bcryptjs';

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'mk-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session.is_logged_in || !session.user_id) return null;
  return queryOne<User>('SELECT id, email, name, role, tenant_id, created_at FROM users WHERE id = $1', [session.user_id]);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireOperator(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'operator' && user.role !== 'admin') throw new Error('Forbidden');
  return user;
}

export async function requireTenantAccess(tenantId: string): Promise<User> {
  const user = await requireUser();
  if (user.role === 'operator' || user.role === 'admin') return user;
  if (user.role === 'tenant' && user.tenant_id === tenantId) return user;
  throw new Error('Forbidden');
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const row = await queryOne<User & { password_hash: string }>(
    'SELECT id, email, name, role, tenant_id, created_at, password_hash FROM users WHERE email = $1',
    [email]
  );
  if (!row) return null;
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;
  const { password_hash, ...user } = row;
  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
```

- [ ] **Step 2: Create login API route**

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }
  const user = await verifyPassword(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const session = await getSession();
  session.user_id = user.id;
  session.role = user.role;
  session.tenant_id = user.tenant_id;
  session.is_logged_in = true;
  await session.save();
  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, tenant_id: user.tenant_id } });
}
```

- [ ] **Step 3: Create logout and me routes**

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
```

```typescript
// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
```

- [ ] **Step 4: Create middleware for route protection**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import type { SessionData } from '@/lib/types';

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'mk-session',
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req.cookies as any, sessionOptions);

  const path = req.nextUrl.pathname;

  // Protect operator routes
  if (path.startsWith('/operator')) {
    if (!session.is_logged_in || (session.role !== 'operator' && session.role !== 'admin')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Protect tenant portal routes
  if (path.startsWith('/portal')) {
    if (!session.is_logged_in || session.role !== 'tenant') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Protect API routes (except auth and health)
  if (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/health')) {
    if (!session.is_logged_in) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return res;
}

export const config = {
  matcher: ['/operator/:path*', '/portal/:path*', '/api/((?!auth|health).*)'],
};
```

- [ ] **Step 5: Create seed data with default users**

```sql
-- lib/db-seed.sql
-- Default operator (Tea) and admin accounts
-- Passwords are bcrypt hashes

-- Admin (owner) — password: change-this-admin-password
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@gecbusiness.com', '$2a$12$placeholder_hash_replace_at_seed_time', 'Admin', 'admin');

-- Operator (Tea) — password: set during first deployment
INSERT INTO users (email, password_hash, name, role) VALUES
('tea@gecbusiness.com', '$2a$12$placeholder_hash_replace_at_seed_time', 'Tea', 'operator');
```

Note: Actual password hashes will be generated at deploy time using a seed script.

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts app/api/auth/ middleware.ts lib/db-seed.sql
git commit -m "feat: authentication system with login, logout, session, middleware"
```

---

### Task 4: Login Page + Layout Shell

**Files:**
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/operator/layout.tsx`
- Create: `app/operator/page.tsx`
- Create: `app/portal/layout.tsx`
- Create: `app/portal/page.tsx`
- Create: `components/operator/Sidebar.tsx`
- Create: `components/operator/TopBar.tsx`
- Create: `components/portal/PortalNav.tsx`
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Spinner.tsx`

- [ ] **Step 1: Create global styles**

```css
/* app/globals.css */
@import "tailwindcss";
```

- [ ] **Step 2: Create root layout**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketing Platform',
  description: 'Multi-tenant social media management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create login page**

```tsx
// app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }
    if (data.user.role === 'tenant') {
      router.push('/portal');
    } else {
      router.push('/operator');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Marketing Platform</h1>
        <p className="text-gray-500 text-center text-sm mb-6">Sign in to continue</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create operator layout with sidebar**

```tsx
// components/operator/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/operator', label: 'Overview', icon: '◇' },
  { href: '/operator/tenants', label: 'Tenants', icon: '◈' },
  { href: '/operator/invoices', label: 'Invoices', icon: '◆' },
  { href: '/operator/settings', label: 'Settings', icon: '◉' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-gray-700">
        <h2 className="text-lg font-bold">MK Platform</h2>
        <p className="text-xs text-gray-400">Operations</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/operator' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

```tsx
// components/operator/TopBar.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function TopBar({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{userName}</span>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500">
          Log out
        </button>
      </div>
    </header>
  );
}
```

```tsx
// app/operator/layout.tsx
import Sidebar from '@/components/operator/Sidebar';
import TopBar from '@/components/operator/TopBar';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'operator' && user.role !== 'admin')) redirect('/');

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar userName={user.name} />
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create operator overview page (placeholder)**

```tsx
// app/operator/page.tsx
import { query } from '@/lib/db';

export default async function OperatorOverview() {
  const tenants = await query('SELECT id, name, status FROM tenants ORDER BY created_at DESC');
  const postCount = await query('SELECT COUNT(*) as count FROM posts');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active Tenants</p>
          <p className="text-3xl font-bold">{tenants.filter((t: any) => t.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Tenants</p>
          <p className="text-3xl font-bold">{tenants.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Posts</p>
          <p className="text-3xl font-bold">{(postCount[0] as any)?.count || 0}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create tenant portal layout**

```tsx
// components/portal/PortalNav.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const nav = [
  { href: '/portal', label: 'Content' },
  { href: '/portal/upload', label: 'Upload' },
  { href: '/portal/strategy', label: 'Strategy' },
  { href: '/portal/invoices', label: 'Invoices' },
];

export default function PortalNav({ tenantName }: { tenantName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6">
      <div className="flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <h1 className="font-bold text-lg">{tenantName}</h1>
          <nav className="flex gap-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm rounded-lg ${active ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500">
          Log out
        </button>
      </div>
    </header>
  );
}
```

```tsx
// app/portal/layout.tsx
import PortalNav from '@/components/portal/PortalNav';
import { getCurrentUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { redirect } from 'next/navigation';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'tenant') redirect('/');

  const tenant = await queryOne('SELECT name FROM tenants WHERE id = $1', [user.tenant_id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNav tenantName={tenant?.name || 'Portal'} />
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
```

```tsx
// app/portal/page.tsx
export default function PortalHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Your Content</h1>
      <p className="text-gray-500">Content awaiting your review will appear here.</p>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/ components/
git commit -m "feat: login page, operator dashboard layout, tenant portal layout"
```

---

## Phase 2: Tenant Onboarding + AI Assessment

### Task 5: Tenant CRUD API

**Files:**
- Create: `app/api/tenants/route.ts`
- Create: `app/api/tenants/[id]/route.ts`
- Create: `app/operator/tenants/page.tsx`

- [ ] **Step 1: Create tenant list and create API**

```typescript
// app/api/tenants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function GET() {
  await requireOperator();
  const tenants = await query(
    'SELECT * FROM tenants ORDER BY created_at DESC'
  );
  return NextResponse.json({ tenants });
}

export async function POST(req: NextRequest) {
  await requireOperator();
  const body = await req.json();
  const { name, slug, industry, city, channels, posting_frequency, posts_per_week, video_ideas_per_month, primary_language, tenant_email, tenant_password } = body;

  if (!name || !slug || !industry || !tenant_email || !tenant_password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const existing = await queryOne('SELECT id FROM tenants WHERE slug = $1', [slug]);
  if (existing) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
  }

  const tenant = await queryOne(
    `INSERT INTO tenants (name, slug, industry, city, channels, posting_frequency, posts_per_week, video_ideas_per_month, primary_language)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [name, slug, industry, city || 'Tbilisi', channels || [], posting_frequency || 'daily', posts_per_week || 5, video_ideas_per_month || 4, primary_language || 'ka']
  );

  // Create tenant user account
  const passwordHash = await hashPassword(tenant_password);
  await query(
    `INSERT INTO users (email, password_hash, name, role, tenant_id)
     VALUES ($1, $2, $3, 'tenant', $4)`,
    [tenant_email, passwordHash, name, tenant!.id]
  );

  return NextResponse.json({ tenant }, { status: 201 });
}
```

- [ ] **Step 2: Create tenant detail API**

```typescript
// app/api/tenants/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [id]);
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ tenant });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const body = await req.json();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = ['name', 'industry', 'description', 'city', 'website', 'google_maps_url', 'social_links', 'brand_config', 'channels', 'posting_frequency', 'posts_per_week', 'video_ideas_per_month', 'primary_language', 'secondary_language', 'status', 'onboarding_data'];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(key === 'social_links' || key === 'brand_config' || key === 'onboarding_data' ? JSON.stringify(body[key]) : body[key]);
      idx++;
    }
  }

  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  values.push(id);
  const tenant = await queryOne(
    `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return NextResponse.json({ tenant });
}
```

- [ ] **Step 3: Create tenant list page**

```tsx
// app/operator/tenants/page.tsx
import Link from 'next/link';
import { query } from '@/lib/db';

const statusColors: Record<string, string> = {
  onboarding: 'bg-yellow-100 text-yellow-700',
  assessing: 'bg-blue-100 text-blue-700',
  strategy_review: 'bg-purple-100 text-purple-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-gray-100 text-gray-500',
  churned: 'bg-red-100 text-red-700',
};

export default async function TenantsPage() {
  const tenants = await query('SELECT * FROM tenants ORDER BY created_at DESC');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Link href="/operator/tenants/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Tenant
        </Link>
      </div>
      <div className="grid gap-4">
        {tenants.map((t: any) => (
          <Link key={t.id} href={`/operator/tenants/${t.id}`} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{t.name}</h3>
              <p className="text-sm text-gray-500">{t.industry} — {t.city || 'Tbilisi'}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {(t.channels || []).map((ch: string) => (
                  <span key={ch} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{ch}</span>
                ))}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[t.status] || ''}`}>
                {t.status}
              </span>
            </div>
          </Link>
        ))}
        {tenants.length === 0 && (
          <p className="text-gray-400 text-center py-12">No tenants yet. Click "+ New Tenant" to onboard your first client.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/tenants/ app/operator/tenants/
git commit -m "feat: tenant CRUD API and tenant list page"
```

---

### Task 6: Onboarding Wizard

**Files:**
- Create: `app/operator/tenants/new/page.tsx`
- Create: `components/operator/OnboardingWizard.tsx`
- Create: `lib/ai/client.ts`
- Create: `lib/ai/onboarding-questions.ts`
- Create: `app/api/tenants/[id]/onboarding/route.ts`

- [ ] **Step 1: Create Claude API client**

```typescript
// lib/ai/client.ts
import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function askClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ text: string; tokensUsed: number }> {
  const claude = getClaudeClient();
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature ?? 0.3,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
  return { text, tokensUsed };
}
```

- [ ] **Step 2: Create dynamic onboarding question generator**

```typescript
// lib/ai/onboarding-questions.ts
import { askClaude } from './client';

export interface OnboardingQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

const BASE_QUESTIONS: OnboardingQuestion[] = [
  { id: 'name', label: 'Business Name', type: 'text', required: true, placeholder: '3 Shaurma' },
  { id: 'industry', label: 'Industry / Category', type: 'text', required: true, placeholder: 'Fast food, Real estate, Beauty...' },
  { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Tbilisi' },
  { id: 'website', label: 'Website URL', type: 'text', required: false, placeholder: 'https://...' },
  { id: 'google_maps_url', label: 'Google Maps Link', type: 'text', required: false, placeholder: 'https://maps.google.com/...' },
  { id: 'facebook_url', label: 'Facebook Page URL', type: 'text', required: false },
  { id: 'instagram_handle', label: 'Instagram Handle', type: 'text', required: false, placeholder: '@...' },
  { id: 'linkedin_url', label: 'LinkedIn Page URL', type: 'text', required: false },
  { id: 'tiktok_handle', label: 'TikTok Handle', type: 'text', required: false, placeholder: '@...' },
  { id: 'channels', label: 'Which channels should we post to?', type: 'multiselect', required: true, options: ['facebook', 'instagram', 'linkedin', 'tiktok'] },
  { id: 'posting_frequency', label: 'Posting Frequency', type: 'select', required: true, options: ['daily', '5x/week', '3x/week', '2x/week'] },
  { id: 'posts_per_week', label: 'Text/Image Posts per Week', type: 'number', required: true, placeholder: '5' },
  { id: 'video_ideas_per_month', label: 'Video Ideas per Month', type: 'number', required: true, placeholder: '4' },
  { id: 'primary_language', label: 'Primary Language', type: 'select', required: true, options: ['ka', 'en', 'ru'] },
  { id: 'target_audience', label: 'Target Audience Description', type: 'textarea', required: false, placeholder: '18-40 year olds in residential areas...' },
  { id: 'tenant_email', label: 'Client Login Email', type: 'text', required: true, placeholder: 'client@example.com' },
  { id: 'tenant_password', label: 'Client Login Password', type: 'text', required: true, placeholder: 'Simple password for client' },
];

export function getBaseQuestions(): OnboardingQuestion[] {
  return BASE_QUESTIONS;
}

export async function getIndustryQuestions(industry: string, businessName: string): Promise<{ questions: OnboardingQuestion[]; tokensUsed: number }> {
  const systemPrompt = `You are a marketing consultant onboarding a new client. Generate 5-8 industry-specific questions that would help understand this business for social media marketing and brand strategy. Return ONLY valid JSON array.`;

  const userPrompt = `Business: "${businessName}"
Industry: "${industry}"

Generate questions specific to ${industry} businesses. Each question should have:
- id: snake_case identifier
- label: the question text
- type: "text" | "textarea" | "select" | "number"
- options: array of options (only for select type)
- required: boolean
- placeholder: example answer

Examples for a restaurant: delivery platforms, menu highlights, branches count, price range
Examples for real estate: property types, service areas, price range, target buyers
Examples for beauty: services offered, booking system, specialties

Return JSON array only, no markdown.`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt);

  try {
    const questions = JSON.parse(text.trim());
    return { questions, tokensUsed };
  } catch {
    return { questions: [], tokensUsed };
  }
}
```

- [ ] **Step 3: Create onboarding wizard component**

```tsx
// components/operator/OnboardingWizard.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingQuestion } from '@/lib/ai/onboarding-questions';

export default function OnboardingWizard({ baseQuestions }: { baseQuestions: OnboardingQuestion[] }) {
  const [step, setStep] = useState<'basics' | 'industry' | 'review'>('basics');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [industryQuestions, setIndustryQuestions] = useState<OnboardingQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  function updateAnswer(id: string, value: any) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleBasicsNext() {
    if (!answers.name || !answers.industry) {
      setError('Business name and industry are required');
      return;
    }
    setLoading(true);
    setError('');
    const res = await fetch('/api/tenants/' + 'generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry: answers.industry, businessName: answers.name }),
    });
    const data = await res.json();
    setIndustryQuestions(data.questions || []);
    setLoading(false);
    setStep('industry');
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    const slug = answers.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const body = {
      name: answers.name,
      slug,
      industry: answers.industry,
      city: answers.city || 'Tbilisi',
      website: answers.website,
      google_maps_url: answers.google_maps_url,
      channels: answers.channels || [],
      posting_frequency: answers.posting_frequency || 'daily',
      posts_per_week: parseInt(answers.posts_per_week) || 5,
      video_ideas_per_month: parseInt(answers.video_ideas_per_month) || 4,
      primary_language: answers.primary_language || 'ka',
      tenant_email: answers.tenant_email,
      tenant_password: answers.tenant_password,
      social_links: {
        facebook: answers.facebook_url || null,
        instagram: answers.instagram_handle || null,
        linkedin: answers.linkedin_url || null,
        tiktok: answers.tiktok_handle || null,
      },
      onboarding_data: {
        target_audience: answers.target_audience,
        industry_answers: Object.fromEntries(
          industryQuestions.map((q) => [q.id, answers[q.id]])
        ),
      },
    };

    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create tenant');
      setLoading(false);
      return;
    }

    const { tenant } = await res.json();
    router.push(`/operator/tenants/${tenant.id}`);
  }

  function renderQuestion(q: OnboardingQuestion) {
    if (q.type === 'select') {
      return (
        <select
          value={answers[q.id] || ''}
          onChange={(e) => updateAnswer(q.id, e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select...</option>
          {q.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    if (q.type === 'multiselect') {
      return (
        <div className="flex flex-wrap gap-2">
          {q.options?.map((opt) => {
            const selected = (answers[q.id] || []).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = answers[q.id] || [];
                  updateAnswer(q.id, selected ? current.filter((v: string) => v !== opt) : [...current, opt]);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm border ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    if (q.type === 'textarea') {
      return (
        <textarea
          value={answers[q.id] || ''}
          onChange={(e) => updateAnswer(q.id, e.target.value)}
          placeholder={q.placeholder}
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    }
    return (
      <input
        type={q.type === 'number' ? 'number' : 'text'}
        value={answers[q.id] || ''}
        onChange={(e) => updateAnswer(q.id, e.target.value)}
        placeholder={q.placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 mb-8">
        {['basics', 'industry', 'review'].map((s, i) => (
          <div key={s} className={`flex-1 h-1.5 rounded ${step === s || ['basics', 'industry', 'review'].indexOf(step) > i ? 'bg-blue-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {step === 'basics' && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold">Basic Information</h2>
          {baseQuestions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {q.label} {q.required && <span className="text-red-400">*</span>}
              </label>
              {renderQuestion(q)}
            </div>
          ))}
          <button
            onClick={handleBasicsNext}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating industry questions...' : 'Next'}
          </button>
        </div>
      )}

      {step === 'industry' && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold">Industry-Specific Details</h2>
          <p className="text-sm text-gray-500">These questions are tailored for {answers.industry} businesses.</p>
          {industryQuestions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {q.label} {q.required && <span className="text-red-400">*</span>}
              </label>
              {renderQuestion(q)}
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setStep('basics')} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Back
            </button>
            <button onClick={() => setStep('review')} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Review
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold">Review & Create</h2>
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
            <div><span className="text-sm text-gray-500">Business:</span> <span className="font-medium">{answers.name}</span></div>
            <div><span className="text-sm text-gray-500">Industry:</span> <span>{answers.industry}</span></div>
            <div><span className="text-sm text-gray-500">City:</span> <span>{answers.city || 'Tbilisi'}</span></div>
            <div><span className="text-sm text-gray-500">Channels:</span> <span>{(answers.channels || []).join(', ')}</span></div>
            <div><span className="text-sm text-gray-500">Posts/week:</span> <span>{answers.posts_per_week || 5}</span></div>
            <div><span className="text-sm text-gray-500">Client email:</span> <span>{answers.tenant_email}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('industry')} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Tenant & Start Assessment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create onboarding page**

```tsx
// app/operator/tenants/new/page.tsx
import OnboardingWizard from '@/components/operator/OnboardingWizard';
import { getBaseQuestions } from '@/lib/ai/onboarding-questions';

export default function NewTenantPage() {
  const baseQuestions = getBaseQuestions();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Onboard New Tenant</h1>
      <OnboardingWizard baseQuestions={baseQuestions} />
    </div>
  );
}
```

- [ ] **Step 5: Create industry questions API endpoint**

```typescript
// app/api/tenants/generate-questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { getIndustryQuestions } from '@/lib/ai/onboarding-questions';

export async function POST(req: NextRequest) {
  await requireOperator();
  const { industry, businessName } = await req.json();
  if (!industry || !businessName) {
    return NextResponse.json({ error: 'Industry and business name required' }, { status: 400 });
  }
  const { questions, tokensUsed } = await getIndustryQuestions(industry, businessName);
  return NextResponse.json({ questions, tokensUsed });
}
```

- [ ] **Step 6: Commit**

```bash
git add app/operator/tenants/new/ components/operator/OnboardingWizard.tsx lib/ai/ app/api/tenants/generate-questions/
git commit -m "feat: tenant onboarding wizard with AI-generated industry questions"
```

---

### Task 7: AI Assessment Pipeline (Research + Competitor + Brand + Strategy Agents)

**Files:**
- Create: `lib/ai/research-agent.ts`
- Create: `lib/ai/competitor-agent.ts`
- Create: `lib/ai/brand-agent.ts`
- Create: `lib/ai/strategy-agent.ts`
- Create: `app/api/assessments/route.ts`
- Create: `app/api/assessments/[id]/route.ts`

- [ ] **Step 1: Create Research Agent**

```typescript
// lib/ai/research-agent.ts
import { askClaude } from './client';
import { queryOne } from '../db';
import type { Tenant } from '../types';

export async function runResearchAgent(tenant: Tenant): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  let totalTokens = 0;

  // Step 1: Research via Google Maps if URL provided
  let googleMapsData = null;
  if (tenant.google_maps_url && process.env.GOOGLE_MAPS_API_KEY) {
    try {
      // Extract place ID or search query from URL
      const placeId = extractPlaceId(tenant.google_maps_url);
      if (placeId) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,formatted_address,opening_hours,reviews,price_level,types,website,formatted_phone_number&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        const data = await res.json();
        if (data.result) googleMapsData = data.result;
      }
    } catch (e) {
      console.error('Google Maps API error:', e);
    }
  }

  // Step 2: AI analysis of available data
  const systemPrompt = `You are a marketing research agent. Analyze the business information provided and generate a comprehensive research profile. Return ONLY valid JSON.`;

  const userPrompt = `Analyze this business for a social media marketing strategy:

Business: ${tenant.name}
Industry: ${tenant.industry}
City: ${tenant.city}, ${tenant.country}
Website: ${tenant.website || 'none'}
Description: ${tenant.description || 'none'}

Social Media Presence:
${JSON.stringify(tenant.social_links, null, 2)}

Google Maps Data:
${googleMapsData ? JSON.stringify(googleMapsData, null, 2) : 'Not available'}

Onboarding Data:
${JSON.stringify(tenant.onboarding_data, null, 2)}

Generate a JSON research profile with these sections:
{
  "business_profile": { "name", "industry", "city", "branches" (if applicable), "operating_hours", "contact" },
  "online_presence": { "website_status", "social_media" (per platform: url, estimated_activity, followers_estimate), "delivery_platforms" },
  "ratings": { per platform ratings if available },
  "review_sentiment": { "positive_themes": [], "negative_themes": [], "overall_sentiment" },
  "target_audience": { "demographics", "psychographics", "behaviors" },
  "market_context": { "city", "sector", "market_size_estimate", "growth_trend" },
  "initial_observations": [ list of 5-8 key observations ]
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 4096 });
  totalTokens += tokensUsed;

  try {
    const data = JSON.parse(text.trim());
    return { data, tokensUsed: totalTokens };
  } catch {
    return { data: { raw_text: text, error: 'Failed to parse JSON' }, tokensUsed: totalTokens };
  }
}

function extractPlaceId(url: string): string | null {
  // Handle various Google Maps URL formats
  const patterns = [
    /place_id[=:]([A-Za-z0-9_-]+)/,
    /!1s(0x[0-9a-f]+:[0-9a-fx]+)/,
    /ftid=(0x[0-9a-f]+:[0-9a-fx]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

- [ ] **Step 2: Create Competitor Agent**

```typescript
// lib/ai/competitor-agent.ts
import { askClaude } from './client';
import type { Tenant } from '../types';

export async function runCompetitorAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  const systemPrompt = `You are a competitive analysis agent for social media marketing. Analyze the competitive landscape for the given business. Use your knowledge of the ${tenant.city} market in ${tenant.country}. Return ONLY valid JSON.`;

  const userPrompt = `Analyze competitors for:

Business: ${tenant.name}
Industry: ${tenant.industry}
City: ${tenant.city}, ${tenant.country}

Research data:
${JSON.stringify(researchData, null, 2)}

Generate JSON with:
{
  "competitors": [
    {
      "name": "competitor name",
      "type": "chain|single|franchise|premium|budget",
      "estimated_branches": number,
      "estimated_rating": number or null,
      "price_positioning": "budget|mid|premium",
      "social_media_presence": { "facebook": "active|inactive|unknown", "instagram": "...", "tiktok": "...", "linkedin": "..." },
      "strengths": ["..."],
      "weaknesses": ["..."],
      "geographic_overlap": "high|medium|low"
    }
  ] (8-12 competitors),
  "market_segments": [
    { "name": "segment", "price_range": "...", "estimated_share": "...", "key_players": ["..."] }
  ],
  "tenant_position": {
    "segment": "...",
    "rank_estimate": number,
    "geographic_advantage": "...",
    "differentiation_gaps": ["..."],
    "competitive_advantages": ["..."]
  },
  "competitive_threats": [
    { "threat": "...", "probability": "low|moderate|high", "impact": "low|medium|high" }
  ],
  "opportunities": ["..."]
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 6144 });

  try {
    return { data: JSON.parse(text.trim()), tokensUsed };
  } catch {
    return { data: { raw_text: text }, tokensUsed };
  }
}
```

- [ ] **Step 3: Create Brand Agent**

```typescript
// lib/ai/brand-agent.ts
import { askClaude } from './client';
import type { Tenant } from '../types';

export async function runBrandAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>,
  competitorData: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  const systemPrompt = `You are a brand audit agent. Perform a comprehensive brand analysis using established frameworks (Keller CBBE, Kapferer Prism, SWOT). Score each dimension honestly. Return ONLY valid JSON.`;

  const userPrompt = `Brand audit for:

Business: ${tenant.name}
Industry: ${tenant.industry}
City: ${tenant.city}

Research: ${JSON.stringify(researchData, null, 2)}
Competitors: ${JSON.stringify(competitorData, null, 2)}

Generate JSON:
{
  "cbbe_scores": {
    "identity": { "score": n, "max": 50, "status": "critical|weak|moderate|strong", "notes": "..." },
    "meaning": { "score": n, "max": 60, "status": "...", "notes": "..." },
    "response": { "score": n, "max": 50, "status": "...", "notes": "..." },
    "resonance": { "score": n, "max": 30, "status": "...", "notes": "..." },
    "total": { "score": n, "max": 190, "percentage": n }
  },
  "kapferer_prism": {
    "physique": "...", "personality": "...", "culture": "...",
    "relationship": "...", "reflection": "...", "self_image": "..."
  },
  "swot": {
    "strengths": ["..."], "weaknesses": ["..."],
    "opportunities": ["..."], "threats": ["..."]
  },
  "online_reputation_score": { "score": n, "max": 100, "breakdown": {} },
  "social_media_audit": {
    "platforms": { "facebook": { "presence": true, "quality": "...", "engagement": "..." }, ... },
    "content_quality_score": n,
    "posting_consistency": "..."
  },
  "key_findings": ["..."],
  "priority_actions": [
    { "action": "...", "timeframe": "0-3 months|1-3 months|3-6 months", "impact": "high|medium|low", "effort": "high|medium|low" }
  ]
}`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 6144 });

  try {
    return { data: JSON.parse(text.trim()), tokensUsed };
  } catch {
    return { data: { raw_text: text }, tokensUsed };
  }
}
```

- [ ] **Step 4: Create Strategy Agent**

```typescript
// lib/ai/strategy-agent.ts
import { askClaude } from './client';
import type { Tenant } from '../types';

export async function runStrategyAgent(
  tenant: Tenant,
  researchData: Record<string, unknown>,
  competitorData: Record<string, unknown>,
  brandAudit: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
  let totalTokens = 0;

  // Generate in 2 calls to stay within output limits

  // Call 1: Strategic Framework + Channel Strategy
  const { text: text1, tokensUsed: t1 } = await askClaude(
    `You are a social media strategy consultant. Generate a strategic framework and channel strategy. Use Georgian as primary language where applicable. Return ONLY valid JSON.`,
    `Business: ${tenant.name} | Industry: ${tenant.industry} | City: ${tenant.city}
Channels: ${tenant.channels.join(', ')}
Posting: ${tenant.posts_per_week} posts/week, ${tenant.video_ideas_per_month} video ideas/month
Language: ${tenant.primary_language} primary, ${tenant.secondary_language} secondary

Research: ${JSON.stringify(researchData, null, 2)}
Competitors: ${JSON.stringify(competitorData, null, 2)}
Brand Audit: ${JSON.stringify(brandAudit, null, 2)}

Generate JSON:
{
  "strategic_framework": {
    "vision": "...",
    "mission": "...",
    "strategic_pillars": [{ "name": "...", "description": "...", "kpis": ["..."] }],
    "quarterly_goals": [{ "quarter": "Q2 2026", "goals": ["..."] }]
  },
  "channel_strategy": {
    "channels": {
      "facebook": { "role": "...", "content_types": ["..."], "posting_frequency": "...", "best_times": ["..."], "tone": "..." },
      (repeat for each active channel)
    },
    "content_mix": [{ "type": "...", "percentage": n, "description": "..." }]
  }
}`,
    { maxTokens: 4096 }
  );
  totalTokens += t1;

  // Call 2: Messaging Strategy + Action Plan + Video Ideas
  const { text: text2, tokensUsed: t2 } = await askClaude(
    `You are a social media strategy consultant. Generate messaging strategy, action plan, and video content ideas. Use ${tenant.primary_language === 'ka' ? 'Georgian' : 'English'} for example copy. Return ONLY valid JSON.`,
    `Business: ${tenant.name} | Industry: ${tenant.industry}
Channels: ${tenant.channels.join(', ')}
Video ideas needed: ${tenant.video_ideas_per_month} per month

Previous strategy context:
${text1}

Generate JSON:
{
  "messaging_strategy": {
    "brand_voice": { "tone": "...", "personality": "...", "do": ["..."], "dont": ["..."] },
    "content_pillars": [{ "name": "...", "percentage": n, "description": "...", "example_topics": ["..."] }],
    "hashtag_strategy": { "branded": ["..."], "industry": ["..."], "local": ["..."] }
  },
  "action_plan": {
    "month_1": [{ "week": 1, "tasks": ["..."] }],
    "month_2": [{ "week": 1, "tasks": ["..."] }],
    "month_3": [{ "week": 1, "tasks": ["..."] }]
  },
  "video_ideas": [
    { "concept": "...", "scenario": "...", "platform": "tiktok|instagram|facebook", "duration": "15s|30s|60s", "texts_on_screen": ["..."], "call_to_action": "..." }
  ],
  "disruptive_innovations": [
    { "idea": "...", "cost": "low|medium|high", "impact": "high|medium", "description": "..." }
  ]
}`,
    { maxTokens: 6144 }
  );
  totalTokens += t2;

  try {
    const part1 = JSON.parse(text1.trim());
    const part2 = JSON.parse(text2.trim());
    return { data: { ...part1, ...part2 }, tokensUsed: totalTokens };
  } catch {
    return { data: { part1: text1, part2: text2 }, tokensUsed: totalTokens };
  }
}
```

- [ ] **Step 5: Create assessment orchestrator API**

```typescript
// app/api/assessments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { runResearchAgent } from '@/lib/ai/research-agent';
import { runCompetitorAgent } from '@/lib/ai/competitor-agent';
import { runBrandAgent } from '@/lib/ai/brand-agent';
import { runStrategyAgent } from '@/lib/ai/strategy-agent';
import type { Tenant } from '@/lib/types';

export async function POST(req: NextRequest) {
  await requireOperator();
  const { tenant_id } = await req.json();

  const tenant = await queryOne<Tenant>('SELECT * FROM tenants WHERE id = $1', [tenant_id]);
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // Create assessment record
  const assessment = await queryOne(
    `INSERT INTO assessments (tenant_id, status, started_at) VALUES ($1, 'researching', now()) RETURNING *`,
    [tenant_id]
  );

  // Update tenant status
  await query(`UPDATE tenants SET status = 'assessing' WHERE id = $1`, [tenant_id]);

  // Run pipeline (sequential — each agent depends on previous)
  const assessmentId = assessment!.id;
  let totalTokens = 0;
  let totalCost = 0;

  try {
    // Agent 1: Research
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'research', 'running', now())`, [assessmentId]);
    const research = await runResearchAgent(tenant);
    totalTokens += research.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'research'`, [research.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET research_data = $1 WHERE id = $2`, [JSON.stringify(research.data), assessmentId]);

    // Agent 2: Competitor
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'competitor', 'running', now())`, [assessmentId]);
    const competitor = await runCompetitorAgent(tenant, research.data);
    totalTokens += competitor.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'competitor'`, [competitor.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET competitor_data = $1 WHERE id = $2`, [JSON.stringify(competitor.data), assessmentId]);

    // Agent 3: Brand
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'brand', 'running', now())`, [assessmentId]);
    const brand = await runBrandAgent(tenant, research.data, competitor.data);
    totalTokens += brand.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'brand'`, [brand.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET brand_audit = $1 WHERE id = $2`, [JSON.stringify(brand.data), assessmentId]);

    // Agent 4: Strategy
    await query(`INSERT INTO assessment_agents (assessment_id, agent_type, status, started_at) VALUES ($1, 'strategy', 'running', now())`, [assessmentId]);
    const strategy = await runStrategyAgent(tenant, research.data, competitor.data, brand.data);
    totalTokens += strategy.tokensUsed;
    await query(`UPDATE assessment_agents SET status = 'completed', tokens_used = $1, completed_at = now() WHERE assessment_id = $2 AND agent_type = 'strategy'`, [strategy.tokensUsed, assessmentId]);
    await query(`UPDATE assessments SET strategy_data = $1 WHERE id = $2`, [JSON.stringify(strategy.data), assessmentId]);

    // Calculate cost (rough estimate: $3 per 1M input tokens, $15 per 1M output tokens for Sonnet)
    totalCost = (totalTokens / 1_000_000) * 5; // blended rate

    await query(
      `UPDATE assessments SET status = 'review', tokens_used = $1, cost_usd = $2, completed_at = now() WHERE id = $3`,
      [totalTokens, totalCost, assessmentId]
    );

    // Track cost
    await query(
      `INSERT INTO cost_tracking (tenant_id, category, description, amount_usd, tokens_used) VALUES ($1, 'ai_assessment', 'Full assessment pipeline', $2, $3)`,
      [tenant_id, totalCost, totalTokens]
    );

    await query(`UPDATE tenants SET status = 'strategy_review' WHERE id = $1`, [tenant_id]);

    return NextResponse.json({ assessment: { id: assessmentId, status: 'review', tokensUsed: totalTokens, costUsd: totalCost } });

  } catch (error: any) {
    await query(`UPDATE assessments SET status = 'failed' WHERE id = $1`, [assessmentId]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Create assessment detail API**

```typescript
// app/api/assessments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const assessment = await queryOne('SELECT * FROM assessments WHERE id = $1', [id]);
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Tenant users can only see their own assessment
  if (user.role === 'tenant' && user.tenant_id !== (assessment as any).tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const agents = await query('SELECT * FROM assessment_agents WHERE assessment_id = $1 ORDER BY started_at', [id]);

  return NextResponse.json({ assessment, agents });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { action } = await req.json();

  if (action === 'tea_approve') {
    if (user.role !== 'operator' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await queryOne('UPDATE assessments SET tea_approved = true WHERE id = $1 RETURNING *', [id]);
  }

  if (action === 'tenant_approve') {
    const assessment = await queryOne('SELECT tenant_id FROM assessments WHERE id = $1', [id]);
    if (user.role !== 'tenant' || user.tenant_id !== (assessment as any)?.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await queryOne('UPDATE assessments SET tenant_approved = true, status = $1 WHERE id = $2 RETURNING *', ['approved', id]);
    // Move tenant to active
    await query('UPDATE tenants SET status = $1 WHERE id = $2', ['active', (assessment as any).tenant_id]);
  }

  const updated = await queryOne('SELECT * FROM assessments WHERE id = $1', [id]);
  return NextResponse.json({ assessment: updated });
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/ai/ app/api/assessments/
git commit -m "feat: AI assessment pipeline with research, competitor, brand, and strategy agents"
```

---

### Task 8: Assessment View Page

**Files:**
- Create: `app/operator/tenants/[id]/page.tsx`
- Create: `app/operator/tenants/[id]/assessment/page.tsx`
- Create: `components/operator/AssessmentView.tsx`

- [ ] **Step 1: Create tenant detail page**

```tsx
// app/operator/tenants/[id]/page.tsx
import Link from 'next/link';
import { queryOne, query } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [id]);
  if (!tenant) notFound();

  const t = tenant as any;
  const assessment = await queryOne('SELECT id, status, tea_approved, tenant_approved FROM assessments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1', [id]);
  const postCount = await queryOne('SELECT COUNT(*) as count FROM posts WHERE tenant_id = $1', [id]);

  const actions = [
    { href: `/operator/tenants/${id}/assessment`, label: 'Assessment', desc: assessment ? `Status: ${(assessment as any).status}` : 'Not started' },
    { href: `/operator/tenants/${id}/strategy`, label: 'Strategy', desc: 'View & approve strategy' },
    { href: `/operator/tenants/${id}/content`, label: 'Content', desc: `${(postCount as any)?.count || 0} posts` },
    { href: `/operator/tenants/${id}/connect`, label: 'Connect Accounts', desc: 'Social media accounts' },
    { href: `/operator/tenants/${id}/invoices`, label: 'Invoices', desc: 'Billing' },
    { href: `/operator/tenants/${id}/settings`, label: 'Settings', desc: 'Configuration' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/operator/tenants" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-2xl font-bold">{t.name}</h1>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{t.status}</span>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Industry:</span> {t.industry}</div>
          <div><span className="text-gray-500">City:</span> {t.city}</div>
          <div><span className="text-gray-500">Channels:</span> {(t.channels || []).join(', ')}</div>
          <div><span className="text-gray-500">Posts/week:</span> {t.posts_per_week}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <h3 className="font-semibold mb-1">{a.label}</h3>
            <p className="text-sm text-gray-500">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create assessment page with trigger and view**

```tsx
// app/operator/tenants/[id]/assessment/page.tsx
'use client';

import { useState, useEffect, use } from 'react';

export default function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchAssessment();
  }, []);

  async function fetchAssessment() {
    setLoading(true);
    const res = await fetch(`/api/assessments?tenant_id=${id}`);
    if (res.ok) {
      const data = await res.json();
      // Find latest assessment for this tenant
      if (data.assessment) {
        setAssessment(data.assessment);
        setAgents(data.agents || []);
      }
    }
    setLoading(false);
  }

  async function startAssessment() {
    setRunning(true);
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: id }),
    });
    const data = await res.json();
    if (data.assessment) {
      setAssessment(data.assessment);
    }
    setRunning(false);
    fetchAssessment();
  }

  async function approveAssessment() {
    if (!assessment) return;
    await fetch(`/api/assessments/${assessment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tea_approve' }),
    });
    fetchAssessment();
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">No Assessment Yet</h2>
        <p className="text-gray-500 mb-4">Run the AI assessment pipeline to analyze this business.</p>
        <button
          onClick={startAssessment}
          disabled={running}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? 'Running Assessment (this takes 1-2 minutes)...' : 'Start Assessment'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Assessment</h1>
        <div className="flex gap-2">
          <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700">{assessment.status}</span>
          {assessment.status === 'review' && !assessment.tea_approved && (
            <button onClick={approveAssessment} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm">
              Approve
            </button>
          )}
          <a href={`/api/assessments/${assessment.id}/pdf`} className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Download PDF
          </a>
        </div>
      </div>

      {/* Agent progress */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h3 className="font-semibold mb-3">Pipeline Progress</h3>
        <div className="space-y-2">
          {['research', 'competitor', 'brand', 'strategy'].map((type) => {
            const agent = agents.find((a: any) => a.agent_type === type);
            const status = agent?.status || 'pending';
            return (
              <div key={type} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'running' ? 'bg-yellow-500 animate-pulse' : status === 'failed' ? 'bg-red-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium capitalize w-24">{type}</span>
                <span className="text-xs text-gray-400">{status}</span>
                {agent?.tokens_used && <span className="text-xs text-gray-400 ml-auto">{agent.tokens_used.toLocaleString()} tokens</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Research Data */}
      {assessment.research_data && (
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <h3 className="font-semibold mb-3">Research</h3>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(assessment.research_data, null, 2)}</pre>
        </div>
      )}

      {/* Competitor Data */}
      {assessment.competitor_data && (
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <h3 className="font-semibold mb-3">Competitor Analysis</h3>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(assessment.competitor_data, null, 2)}</pre>
        </div>
      )}

      {/* Brand Audit */}
      {assessment.brand_audit && (
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <h3 className="font-semibold mb-3">Brand Audit</h3>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(assessment.brand_audit, null, 2)}</pre>
        </div>
      )}

      {/* Strategy */}
      {assessment.strategy_data && (
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <h3 className="font-semibold mb-3">Strategy</h3>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(assessment.strategy_data, null, 2)}</pre>
        </div>
      )}

      {/* Cost */}
      <div className="text-xs text-gray-400 text-right">
        Tokens: {assessment.tokens_used?.toLocaleString()} | Cost: ${assessment.cost_usd?.toFixed(2)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/operator/tenants/[id]/
git commit -m "feat: tenant detail and assessment view pages"
```

---

## Phase 3: Content Generation + Approval Workflow

### Task 9: Content Generator

**Files:**
- Create: `lib/ai/content-generator.ts`
- Create: `lib/ai/video-ideas-generator.ts`
- Create: `lib/images/generator.ts`
- Create: `app/api/content/route.ts`

- [ ] **Step 1: Create content generator**

```typescript
// lib/ai/content-generator.ts
import { askClaude } from './client';
import type { Tenant, Assessment } from '../types';

export async function generateContentBatch(
  tenant: Tenant,
  assessment: Assessment,
  count: number,
  weekStart: string
): Promise<{ posts: any[]; tokensUsed: number }> {
  const strategy = assessment.strategy_data;

  const systemPrompt = `You are a social media content creator. Generate ${count} social media posts for the given business. Each post must be bilingual: ${tenant.primary_language === 'ka' ? 'Georgian' : 'English'} primary, ${tenant.secondary_language === 'ka' ? 'Georgian' : 'English'} secondary. Return ONLY valid JSON array.`;

  const userPrompt = `Generate ${count} posts for:

Business: ${tenant.name}
Industry: ${tenant.industry}
Channels: ${tenant.channels.join(', ')}
Week starting: ${weekStart}

Strategy context:
${JSON.stringify(strategy, null, 2)}

For each post, generate:
{
  "content_type": "image_post" | "carousel" | "reel" | "video",
  "platforms": ["facebook", "instagram", ...],
  "copy_primary": "Georgian text (or primary language)",
  "copy_secondary": "English text (or secondary language)",
  "platform_copies": {
    "facebook": { "primary": "FB-optimized Georgian", "secondary": "FB-optimized English" },
    "instagram": { "primary": "IG-optimized Georgian", "secondary": "IG-optimized English" },
    (only for platforms in channels)
  },
  "hashtags": ["#tag1", "#tag2", ...],
  "visual_description": "Detailed description for AI image generation — describe the exact image to create",
  "video_idea": null or { "concept": "...", "scenario": "...", "texts": ["text overlay 1", "..."], "duration": "15s|30s|60s", "call_to_action": "..." },
  "suggested_date": "YYYY-MM-DD",
  "sort_order": 1
}

Mix content types according to the strategy. Include video posts where appropriate.
Make copy engaging, on-brand, and appropriate for each platform.
Visual descriptions should be specific enough for DALL-E to generate.`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt, { maxTokens: 8192 });

  try {
    const posts = JSON.parse(text.trim());
    return { posts, tokensUsed };
  } catch {
    return { posts: [], tokensUsed };
  }
}
```

- [ ] **Step 2: Create image generator**

```typescript
// lib/images/generator.ts
import OpenAI from 'openai';
import { query } from '../db';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePostImage(
  tenantId: string,
  description: string,
  brandConfig: Record<string, unknown>
): Promise<{ url: string; localPath: string; cost: number }> {
  const prompt = `${description}. Style: professional social media post, clean modern design. ${brandConfig.colors ? `Brand colors: ${brandConfig.colors}` : ''}`;

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });

  const imageUrl = response.data[0].url!;

  // Download and save locally
  const imageRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  const uploadDir = process.env.UPLOAD_DIR || '/var/www/marketing/uploads';
  const filename = `${tenantId}_${Date.now()}.png`;
  const filePath = path.join(uploadDir, 'generated', filename);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);

  const cost = 0.04; // DALL-E 3 standard 1024x1024

  // Track cost
  await query(
    `INSERT INTO cost_tracking (tenant_id, category, description, amount_usd) VALUES ($1, 'ai_images', 'Generated post image', $2)`,
    [tenantId, cost]
  );

  return { url: `/uploads/generated/${filename}`, localPath: filePath, cost };
}
```

- [ ] **Step 3: Create content API**

```typescript
// app/api/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireOperator, requireUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { generateContentBatch } from '@/lib/ai/content-generator';
import { generatePostImage } from '@/lib/images/generator';
import { v4 as uuid } from 'uuid';
import type { Tenant, Assessment } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  const status = req.nextUrl.searchParams.get('status');

  let sql = 'SELECT * FROM posts WHERE 1=1';
  const params: unknown[] = [];
  let idx = 1;

  if (user.role === 'tenant') {
    sql += ` AND tenant_id = $${idx}`;
    params.push(user.tenant_id);
    idx++;
    // Tenants only see tea_approved or later statuses
    sql += ` AND status NOT IN ('draft')`;
  } else if (tenantId) {
    sql += ` AND tenant_id = $${idx}`;
    params.push(tenantId);
    idx++;
  }

  if (status) {
    sql += ` AND status = $${idx}`;
    params.push(status);
    idx++;
  }

  sql += ' ORDER BY scheduled_at ASC NULLS LAST, sort_order ASC';

  const posts = await query(sql, params);
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  await requireOperator();
  const { tenant_id, count, week_start, generate_images } = await req.json();

  const tenant = await queryOne<Tenant>('SELECT * FROM tenants WHERE id = $1', [tenant_id]);
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const assessment = await queryOne<Assessment>(
    'SELECT * FROM assessments WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
    [tenant_id, 'approved']
  );
  if (!assessment) return NextResponse.json({ error: 'No approved assessment found' }, { status: 400 });

  // Generate content
  const { posts: generated, tokensUsed } = await generateContentBatch(tenant, assessment, count || tenant.posts_per_week, week_start);

  const batchId = uuid();
  const createdPosts = [];

  for (const post of generated) {
    // Optionally generate image
    let generatedImageUrl = null;
    if (generate_images && post.visual_description && post.content_type === 'image_post') {
      try {
        const { url } = await generatePostImage(tenant_id, post.visual_description, tenant.brand_config);
        generatedImageUrl = url;
      } catch (e) {
        console.error('Image generation failed:', e);
      }
    }

    const created = await queryOne(
      `INSERT INTO posts (tenant_id, content_type, platforms, copy_primary, copy_secondary, platform_copies, hashtags, media_urls, video_idea, generated_image_url, scheduled_at, batch_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        tenant_id,
        post.content_type,
        post.platforms,
        post.copy_primary,
        post.copy_secondary,
        JSON.stringify(post.platform_copies || {}),
        post.hashtags || [],
        generatedImageUrl ? [generatedImageUrl] : [],
        post.video_idea ? JSON.stringify(post.video_idea) : null,
        generatedImageUrl,
        post.suggested_date || null,
        batchId,
        post.sort_order || 0,
      ]
    );
    createdPosts.push(created);
  }

  // Track AI cost
  const aiCost = (tokensUsed / 1_000_000) * 5;
  await query(
    `INSERT INTO cost_tracking (tenant_id, category, description, amount_usd, tokens_used) VALUES ($1, 'ai_content', $2, $3, $4)`,
    [tenant_id, `Generated ${generated.length} posts`, aiCost, tokensUsed]
  );

  return NextResponse.json({ posts: createdPosts, batchId, tokensUsed });
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/ai/content-generator.ts lib/ai/video-ideas-generator.ts lib/images/generator.ts app/api/content/
git commit -m "feat: AI content generation with image generation and cost tracking"
```

---

### Task 10: Post Detail, Edit, Comments API

**Files:**
- Create: `app/api/content/[id]/route.ts`
- Create: `app/api/content/[id]/approve/route.ts`
- Create: `app/api/content/[id]/comments/route.ts`
- Create: `app/api/content/upload/route.ts`
- Create: `lib/storage.ts`

- [ ] **Step 1: Create post detail and update API**

```typescript
// app/api/content/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireTenantAccess } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const post = await queryOne('SELECT * FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await requireTenantAccess((post as any).tenant_id);

  const comments = await query(
    `SELECT c.*, u.name as user_name FROM post_comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
    [id]
  );

  return NextResponse.json({ post, comments });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const post = await queryOne('SELECT * FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await requireTenantAccess((post as any).tenant_id);

  const body = await req.json();
  const allowed = ['copy_primary', 'copy_secondary', 'platform_copies', 'hashtags', 'media_urls', 'scheduled_at', 'content_type', 'platforms', 'video_idea'];
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(['platform_copies', 'video_idea'].includes(key) ? JSON.stringify(body[key]) : body[key]);
      idx++;
    }
  }

  if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });

  values.push(id);
  const updated = await queryOne(`UPDATE posts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  return NextResponse.json({ post: updated });
}
```

- [ ] **Step 2: Create approval API**

```typescript
// app/api/content/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { action } = await req.json(); // 'approve' or 'reject'

  const post = await queryOne('SELECT * FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const p = post as any;

  if (user.role === 'operator' || user.role === 'admin') {
    if (action === 'approve') {
      const updated = await queryOne(
        `UPDATE posts SET status = 'pending_tenant', tea_approved_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json({ post: updated });
    }
    if (action === 'reject') {
      const updated = await queryOne(
        `UPDATE posts SET status = 'draft' WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json({ post: updated });
    }
  }

  if (user.role === 'tenant' && user.tenant_id === p.tenant_id) {
    if (p.status !== 'pending_tenant') {
      return NextResponse.json({ error: 'Post not ready for tenant approval' }, { status: 400 });
    }
    if (action === 'approve') {
      const updated = await queryOne(
        `UPDATE posts SET status = 'scheduled', tenant_approved_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json({ post: updated });
    }
    if (action === 'reject') {
      const updated = await queryOne(
        `UPDATE posts SET status = 'rejected' WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json({ post: updated });
    }
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

- [ ] **Step 3: Create comments API**

```typescript
// app/api/content/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireTenantAccess } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const post = await queryOne('SELECT tenant_id FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await requireTenantAccess((post as any).tenant_id);

  const comments = await query(
    `SELECT c.*, u.name as user_name, u.role as user_role FROM post_comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
    [id]
  );
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { component, message } = await req.json();

  if (!component || !message) {
    return NextResponse.json({ error: 'Component and message required' }, { status: 400 });
  }

  const post = await queryOne('SELECT tenant_id FROM posts WHERE id = $1', [id]);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await requireTenantAccess((post as any).tenant_id);

  const comment = await queryOne(
    `INSERT INTO post_comments (post_id, user_id, component, message) VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, user.id, component, message]
  );

  return NextResponse.json({ comment }, { status: 201 });
}
```

- [ ] **Step 4: Create file upload API and storage helper**

```typescript
// lib/storage.ts
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/www/marketing/uploads';

export async function saveUploadedFile(
  tenantId: string,
  file: File
): Promise<{ filename: string; filePath: string; size: number }> {
  const ext = path.extname(file.name) || '.bin';
  const filename = `${tenantId}_${uuid()}${ext}`;
  const dir = path.join(UPLOAD_DIR, tenantId);
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return { filename, filePath: `/uploads/${tenantId}/${filename}`, size: buffer.length };
}
```

```typescript
// app/api/content/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { saveUploadedFile } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const tenantId = formData.get('tenant_id') as string;

  if (!file || !tenantId) {
    return NextResponse.json({ error: 'File and tenant_id required' }, { status: 400 });
  }

  // Verify access
  if (user.role === 'tenant' && user.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { filename, filePath, size } = await saveUploadedFile(tenantId, file);

  const media = await queryOne(
    `INSERT INTO media_files (tenant_id, uploaded_by, filename, original_name, mime_type, size_bytes, file_path)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [tenantId, user.id, filename, file.name, file.type, size, filePath]
  );

  return NextResponse.json({ media }, { status: 201 });
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/content/ lib/storage.ts
git commit -m "feat: post CRUD, approval workflow, comments, and file upload APIs"
```

---

### Task 11-12: Content Management UI (Operator + Portal)

These tasks build the operator content calendar page and tenant portal content review page. They follow the same patterns as Tasks 4 and 8 — React pages consuming the APIs built in Tasks 9-10. Detailed component code follows the same structure shown above.

Key pages:
- `app/operator/tenants/[id]/content/page.tsx` — Calendar view, generate batch, approve posts
- `app/portal/content/page.tsx` — Tenant sees tea-approved posts, can approve/reject/comment
- `app/portal/content/[id]/page.tsx` — Single post detail with per-component comment threads
- `app/portal/upload/page.tsx` — Simple drag-and-drop media upload

---

## Phase 4: Publishing Engine

### Task 13: Facebook + Instagram Publisher

**Files:**
- Create: `lib/publishers/facebook.ts`
- Create: `lib/publishers/instagram.ts`

Ported from the existing `social-auto-poster/lib/social-publisher.ts` with tenant-aware credential loading from the `social_connections` table. Same Meta Graph API v25.0 implementation.

---

### Task 14: LinkedIn Publisher

**Files:**
- Create: `lib/publishers/linkedin.ts`

Ported from existing code. OAuth flow reads/writes to `social_connections` table per tenant.

---

### Task 15: TikTok Publisher

**Files:**
- Create: `lib/publishers/tiktok.ts`

TikTok Content Posting API implementation:
- OAuth 2.0 via TikTok Login Kit
- Video upload via `POST /v2/post/publish/video/init/`
- Photo upload via `POST /v2/post/publish/content/init/`
- Requires TikTok developer app (user to create at developers.tiktok.com)

---

### Task 16: Unified Publishing Engine + Cron

**Files:**
- Create: `lib/publishers/engine.ts`
- Create: `app/api/publish/route.ts`
- Create: `app/api/publish/cron/route.ts`

Orchestrator that:
1. Queries all posts with `status = 'scheduled'` and `scheduled_at <= now()`
2. For each post, loads tenant's social credentials
3. Publishes to each platform
4. Updates post status and `publish_results`
5. Tracks costs

Cron endpoint called by systemd timer or external cron.

---

## Phase 5: Tenant Portal + Connect Accounts

### Task 17: Social Account Connection Wizard

**Files:**
- Create: `app/api/connect/facebook/route.ts`
- Create: `app/api/connect/facebook/callback/route.ts`
- Create: `app/api/connect/linkedin/route.ts`
- Create: `app/api/connect/linkedin/callback/route.ts`
- Create: `app/api/connect/tiktok/route.ts`
- Create: `app/api/connect/tiktok/callback/route.ts`
- Create: `app/operator/tenants/[id]/connect/page.tsx`
- Create: `components/operator/ConnectWizard.tsx`

Guided wizard for Tea: "Click Connect Facebook → login to client's account → grant permissions → done". Each connection stores encrypted tokens in `social_connections`.

---

### Task 18-19: Tenant Portal Pages

Complete the portal pages for content review, commenting, uploading, and viewing strategy/invoices. Following the same patterns.

---

## Phase 6: Invoicing + PDF Reports

### Task 20: Invoice System

**Files:**
- Create: `app/api/invoices/route.ts`
- Create: `app/api/invoices/[id]/route.ts`
- Create: `app/api/invoices/[id]/pdf/route.ts`
- Create: `lib/pdf/invoice.ts`

Invoice features:
- Tea creates invoices for tenants (custom line items, total amount, no cost breakdown)
- PDF generation with pdf-lib
- Status tracking: draft → sent → paid → overdue
- Admin sees full cost breakdown via `cost_tracking` table

---

### Task 21: Assessment PDF Report

**Files:**
- Create: `app/api/assessments/[id]/pdf/route.ts`
- Create: `lib/pdf/assessment-report.ts`

Generates a branded PDF with:
- Cover page with tenant name
- Research summary
- Competitor analysis with tables
- Brand audit scores with visual charts
- SWOT matrix
- Strategy recommendations
- Action plan
- Georgian first, English second

---

### Task 22: Strategy PDF Report

**Files:**
- Create: `app/api/strategies/[id]/pdf/route.ts`
- Create: `lib/pdf/strategy-report.ts`

Similar to assessment PDF but focused on the strategy deliverables.

---

## Phase 7: Deployment

### Task 23: Deploy to VPS

- [ ] Build and deploy Next.js app to VPS
- [ ] Configure Nginx with SSL via Certbot
- [ ] Set up PM2 process manager
- [ ] Configure systemd timer for cron (auto-publishing)
- [ ] Set up database backups

### Task 24: DNS + SSL

- [ ] Point mk.gecbusiness.com to VPS IP (167.86.79.194) in Hostinger DNS
- [ ] Run `certbot --nginx -d mk.gecbusiness.com` for SSL
- [ ] Verify HTTPS works

---

## Post-Launch

- Onboard GEC as first tenant
- Onboard 3 Shaurma as second tenant
- Monitor costs and performance
- Iterate based on Tea's feedback
