# MK Marketing Platform — Project Status

**Last updated:** 2026-04-14
**Live:** https://mk.gecbusiness.com
**Repository:** github.com/Gec-Business/marketing

---

## Platform Overview

Multi-tenant social media auto-poster with AI-powered content generation, assessment pipeline, and billing automation.

**Stack:** Next.js 16, React 19, PostgreSQL 16, Tailwind CSS 4, PM2, Nginx
**AI:** Anthropic Claude (assessments, content, monitoring), OpenAI DALL-E (images)
**Publishing:** Facebook, Instagram, LinkedIn, TikTok
**Monitoring:** 16 watchdog agents + email digest via Resend
**Deployment:** Contabo VPS, Let's Encrypt SSL, daily DB backups

---

## Completed Tasks (135)

### Infrastructure & Security
- [x] VPS setup (Node 22, PostgreSQL 16, Nginx, PM2, Certbot)
- [x] DNS + SSL (mk.gecbusiness.com → Let's Encrypt)
- [x] Session auth (iron-session, role-based: admin/operator/tenant)
- [x] Login rate limiting (5/15min per IP)
- [x] CRON_SECRET timing-safe comparison
- [x] Middleware strict path matching
- [x] File type validation on uploads
- [x] SESSION_SECRET length validation
- [x] Data deletion endpoint (GDPR/Meta compliance)
- [x] Privacy policy page
- [x] Audit log for sensitive actions
- [x] Encrypted API key storage (AES-256-GCM)

### AI Assessment Pipeline
- [x] 4-agent sequential pipeline (research → competitor → brand → strategy)
- [x] Background execution (no HTTP timeout)
- [x] Concurrent assessment prevention
- [x] Per-component re-run with operator feedback
- [x] Sub-block level re-run (26 blocks across 4 sections)
- [x] Robust JSON parser with truncation recovery
- [x] Visual assessment display (CBBE bars, SWOT grid, competitor cards, strategy pillars)
- [x] Manual competitor add/edit/remove
- [x] Prompt injection sanitization
- [x] Google Maps API integration for business research

### BYOK (Bring Your Own Keys)
- [x] 3-tier API key fallback: tenant override → operator default → GEC global
- [x] Operator settings page (Tea's default keys)
- [x] Per-tenant key override in tenant settings
- [x] Transaction-safe key updates (SELECT FOR UPDATE)

### Content Generation & Publishing
- [x] AI content batch generation (capped at 30 posts)
- [x] DALL-E image generation (optional, requires OpenAI key)
- [x] Multi-platform publishing (Facebook, Instagram, LinkedIn, TikTok)
- [x] Token refresh for LinkedIn + TikTok
- [x] Retry logic with HTTP status-based transient error detection
- [x] Partial publish tracking (partially_posted status)
- [x] Content engagement sync (likes/comments/shares every 4 hours)
- [x] Approval workflow: draft → tea_approved → pending_tenant → scheduled → posted

### Billing Automation
- [x] Auto-invoice generation (daily cron, billing_day match)
- [x] Atomic invoice numbering (PostgreSQL sequence)
- [x] Subscription expiry with PostgreSQL interval math
- [x] Manual "Generate Invoice Now" button
- [x] Billing settings UI (monthly_fee, currency, start date, duration, auto toggles)
- [x] Invoice PDF generation
- [x] Email invoice delivery via Resend
- [x] Cost tracking with billed_to attribution (gec/operator/tenant)

### Reports
- [x] Weekly + monthly auto-report generation (cron)
- [x] Manual report generation per tenant
- [x] Email report delivery
- [x] Engagement metrics in reports (likes, comments, shares)
- [x] Portal reports page with visual cards
- [x] Operator reports view with preview

### Monitoring System (16 agents)
- [x] 8 mechanical watchdogs: stuck-jobs, failed-publishes, token-expiry, cron-heartbeat, disk-memory, ssl-expiry, db-health, subscription-expiry
- [x] 6 AI-powered diagnostics: log-analyzer, cost-anomaly, content-quality, audit-analyzer, tenant-health, failed-assessment
- [x] 1 engagement sync (every 4 hours)
- [x] 1 email digest (daily 7am)
- [x] Self-healing: stuck jobs auto-recovered, expired tokens auto-flagged
- [x] System health table with atomic UPSERT dedup (no table bloat)
- [x] AlertsWidget on operator dashboard
- [x] TopBar alert badge

### Ads Management Foundation
- [x] DB schema: 6 ad tables (accounts, campaigns, ad_sets, ads, metrics, audiences)
- [x] TypeScript types for all ad entities
- [x] 5 AI agents: audience-suggester, copy-generator, budget-recommender, performance-analyzer, policy-checker
- [x] 15% management fee field on tenants
- [x] Privacy Policy + Data Deletion endpoints

### Database
- [x] 19 tables with proper indexes and FK cascades
- [x] 8 migrations (001-008) all idempotent
- [x] updated_at triggers on key tables
- [x] Transaction helper (withTransaction)
- [x] Connection pool with error logging

---

## Pending Tasks

### User Actions Required
- [ ] **Tea API Keys** — Tea creates Anthropic + OpenAI accounts, sets keys in /operator/settings
- [ ] **LinkedIn App** — Create at linkedin.com/developers (for LinkedIn publishing)
- [ ] **TikTok App** — Create at developers.tiktok.com (for TikTok publishing)
- [ ] **Resend Email** — Create account at resend.com for alert emails

### Ads System (blocked by Meta approval)
- [ ] Apply for Meta business verification
- [ ] Submit Meta App Review for ads_management permission
- [ ] Validate demand with 2-3 pilot tenants
- [ ] 25 code tasks: OAuth upgrade, Meta API client, campaign CRUD, operator UI, tenant portal, crons, billing integration, deploy, audit
- [ ] LinkedIn Ads (deferred 6+ months)

---

## Cron Jobs (20 total)

See `deploy/crontab.txt` for full schedule.

| Schedule | Endpoint | Purpose |
|----------|---------|---------|
| */15 min | /api/publish/cron | Auto-publish scheduled posts |
| Daily 9am | /api/invoices/auto-generate | Monthly invoice generation |
| Mon 9am | /api/reports/auto-generate (weekly) | Weekly tenant reports |
| 1st 9am | /api/reports/auto-generate (monthly) | Monthly tenant reports |
| */10 min | /api/system/check/stuck-jobs | Self-healing watchdog |
| Hourly | /api/system/check/failed-publishes | Publish failure detection |
| Daily | /api/system/check/token-expiry | Token refresh alerts |
| */30 min | /api/system/check/cron-heartbeat | Cron health verification |
| */15 min | /api/system/check/disk-memory | Resource monitoring |
| Daily 6am | /api/system/check/ssl-expiry | SSL certificate check |
| */5 min | /api/system/check/db-health | Database health |
| Daily 9am | /api/system/check/subscription-expiry | Billing alerts |
| Daily 7am | /api/system/check/log-analyzer | AI error analysis |
| Daily 8:30am | /api/system/check/cost-anomaly | AI cost spike detection |
| Sun 10am | /api/system/check/content-quality | AI content audit |
| Daily 7:30am | /api/system/check/audit-analyzer | Security pattern detection |
| Mon 10am | /api/system/check/tenant-health | Tenant churn scoring |
| Daily 7:15am | /api/system/check/failed-assessment | AI failure diagnosis |
| */4 hours | /api/system/check/engagement-sync | Social engagement fetch |
| Daily 7am | /api/system/digest | Email alert digest |

---

## Costs

| Component | Monthly Cost |
|-----------|-------------|
| VPS (Contabo) | ~$20 |
| Domain | ~$1 |
| SSL | $0 (Let's Encrypt) |
| GEC system AI (monitoring) | ~$3-5 |
| Tea content AI (per tenant) | ~$1-2/tenant |
| Social publishing APIs | $0 (free) |
| Resend email | $0 (free tier) |

**Per-tenant margin:** ~95% (revenue ~$75/tenant vs ~$3 cost/tenant)
