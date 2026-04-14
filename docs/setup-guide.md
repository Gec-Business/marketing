# MK Marketing Platform — Setup & Access Guide

## Overview

Platform URL: https://mk.gecbusiness.com
VPS IP: 167.86.79.194
Stack: Next.js 16, PostgreSQL 16, PM2, Nginx, Ubuntu 24.04

---

## Step 1: DNS Record (IT Team)

Add this record in Hostinger DNS Zone Editor for `gecbusiness.com`:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | mk | 167.86.79.194 | 3600 |

This makes `mk.gecbusiness.com` point to the VPS.
Propagation: 5-30 minutes.

**After DNS is active**, Claude will run SSL setup on the VPS:
```
sudo certbot --nginx -d mk.gecbusiness.com
```

---

## Step 2: API Keys

Create these accounts and generate API keys. All should be under **it@gecbusiness.com** (GEC IT account).

### 2a. Anthropic (Claude AI — content generation + assessments)

1. Go to https://console.anthropic.com
2. Sign in or create account with it@gecbusiness.com
3. Go to API Keys → Create Key
4. Copy the key (starts with `sk-ant-`)

**Env var:** `ANTHROPIC_API_KEY=sk-ant-...`
**Cost:** ~$3-15 per 1M tokens (assessment ~$0.10-0.30 per tenant, content batch ~$0.05-0.15)

### 2b. OpenAI (DALL-E 3 — image generation)

1. Go to https://platform.openai.com
2. Sign in or create account with it@gecbusiness.com
3. Go to API Keys → Create new secret key
4. Copy the key (starts with `sk-`)

**Env var:** `OPENAI_API_KEY=sk-...`
**Cost:** $0.04 per image (1024x1024 standard quality)

### 2c. Google Maps (optional — business research during assessment)

1. Go to https://console.cloud.google.com
2. Create project: "MK Marketing"
3. Enable: Places API
4. Go to Credentials → Create API Key
5. Restrict to: Places API only

**Env var:** `GOOGLE_MAPS_API_KEY=AIza...`
**Cost:** $17 per 1,000 requests (only used during onboarding assessment)

---

## Step 3: Social Media Developer Apps

**Important: Create all apps under GEC business accounts (it@gecbusiness.com), NOT under Tea's personal accounts.**

Tea's role is to connect each tenant's social pages through the platform UI. The developer apps are backend infrastructure owned by GEC.

### 3a. Meta Developer App (Facebook + Instagram)

**Prerequisites:** Facebook account with admin access to at least one Facebook Page

1. Go to https://developers.facebook.com
2. Click **Create App**
3. Select app type: **Business**
4. App name: `MK Marketing Platform`
5. Business: Select GEC Business (or create one)

**After creation:**
6. Go to **Settings → Basic**
   - Copy **App ID** → `META_APP_ID`
   - Copy **App Secret** (click Show) → `META_APP_SECRET`

7. Go to **Add Product** → Add **Facebook Login**
8. Go to **Facebook Login → Settings**
   - Valid OAuth Redirect URIs: `https://mk.gecbusiness.com/api/connect/facebook/callback`
   - Save Changes

9. Go to **App Review → Permissions and Features** → Request:
   - `pages_manage_posts` — Post on behalf of Pages
   - `pages_read_engagement` — Read Page engagement data
   - `instagram_basic` — Access Instagram account info
   - `instagram_content_publish` — Publish to Instagram

**Note:** While in Development Mode, the app works only for accounts listed as app testers/admins. For production use with client accounts, you'll need to submit for App Review.

### 3b. LinkedIn Developer App

1. Go to https://www.linkedin.com/developers/
2. Click **Create App**
3. App name: `MK Marketing`
4. LinkedIn Page: Select your company page
5. Accept terms

**After creation:**
6. Go to **Auth** tab
   - Copy **Client ID** → `LINKEDIN_CLIENT_ID`
   - Copy **Client Secret** → `LINKEDIN_CLIENT_SECRET`
   - Under **Authorized Redirect URLs**, add:
     `https://mk.gecbusiness.com/api/connect/linkedin/callback`

7. Go to **Products** tab → Request access to:
   - **Share on LinkedIn**
   - **Sign In with LinkedIn using OpenID Connect**

8. Get your **Organization ID**:
   - Go to your LinkedIn Company Page
   - The URL looks like: `linkedin.com/company/12345678/`
   - That number is your Org ID → `LINKEDIN_ORG_ID`

### 3c. TikTok Developer App

1. Go to https://developers.tiktok.com
2. Sign in → Click **Manage Apps** → **Connect an app**
3. App name: `MK Marketing Platform`
4. Description: "Multi-tenant social media management platform"
5. Platform: **Web**
   - Website URL: `https://mk.gecbusiness.com`

**After creation:**
6. Copy from app dashboard:
   - **Client Key** → `TIKTOK_CLIENT_KEY`
   - **Client Secret** → `TIKTOK_CLIENT_SECRET`

7. Add redirect URI:
   `https://mk.gecbusiness.com/api/connect/tiktok/callback`

8. Request scopes:
   - `video.publish`
   - `video.upload`

---

## Step 4: Provide All Values

Once you have everything, share these values (paste in chat or send securely):

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_MAPS_API_KEY=
META_APP_ID=
META_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ORG_ID=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
```

Claude will add them to the VPS `.env` file and deploy.

---

## Step 5: After Deploy — What Tea Does

Once everything is live:

1. Tea logs in at https://mk.gecbusiness.com with `marketing@gecbusiness.com`
2. Tea creates a new tenant (e.g., "3 Shaurma")
3. Tea goes to tenant → Connect Accounts
4. Tea clicks "Connect Facebook" → logs in with **the tenant's** Facebook account
5. Same for LinkedIn, TikTok — each with the tenant's own credentials
6. Tea runs the AI assessment for the tenant
7. Tea generates content batches
8. Tea approves content → sends to tenant for approval
9. Approved content gets scheduled and auto-published

---

## Order of Operations

```
1. DNS record (IT team)           ← Do first
2. SSL certificate (Claude)       ← After DNS propagates
3. API keys (Anthropic, OpenAI)   ← Can do anytime
4. Social developer apps          ← After SSL (redirect URIs need HTTPS)
5. Deploy + configure (Claude)    ← After everything above
6. Tea onboards first tenant      ← Platform is live
```

---

## Login Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Tea (operator) | marketing@gecbusiness.com | tea-operator-2026 | operator |
| Admin | it@gecbusiness.com | (set during initial setup) | admin |

---

## Support

Platform code: github.com/gecbusiness/marketing (private)
VPS: ssh likuna@167.86.79.194
Logs: /var/www/marketing/logs/
Backups: /var/www/marketing/backups/ (daily, 30-day retention)
