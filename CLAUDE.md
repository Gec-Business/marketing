# MK Marketing Platform

Multi-tenant SaaS platform for managing clients, AI-powered content assessments, social media publishing, invoicing, and PDF report generation. Operator (admin) and tenant (client) roles.

## Project Structure

```
app/
  ├── api/            # API routes — one file per resource
  ├── operator/       # Operator dashboard pages
  └── portal/         # Tenant portal pages
components/
  ├── assessment/     # Assessment UI components
  ├── operator/       # Operator dashboard components
  └── portal/         # Tenant portal components
lib/
  ├── ai/             # Anthropic/OpenAI integration
  ├── images/         # Image processing (sharp)
  ├── publishers/     # Facebook, Instagram, LinkedIn publishers
  ├── auth.ts         # Auth helpers (iron-session, bcrypt)
  ├── db.ts           # PostgreSQL query helpers
  ├── email.ts        # Resend email
  ├── storage.ts      # File storage
  └── types.ts        # Shared TypeScript types
tests/
  ├── unit/           # Vitest unit tests
  ├── integration/    # Vitest integration tests
  └── e2e/            # Playwright E2E (against https://mk.gecbusiness.com)
```

## Organization Rules

- API routes → `app/api/`, one `route.ts` per resource
- Components → `components/`, scoped by feature area
- Business logic → `lib/`, never inside components or API routes
- Types → `lib/types.ts` or co-located if single-use
- Tests → `tests/`, mirroring `unit/` / `integration/` / `e2e/`

## Code Quality — Zero Tolerance

After editing ANY file, run:

```bash
npm run lint
npm run typecheck
```

Fix ALL errors before continuing.

## After Every Production Build

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
pm2 restart marketing
```

The static copy step is required — skipping it breaks JS chunk loading in production.
