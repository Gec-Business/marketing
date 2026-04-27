# Test Commands — MK Marketing Platform

## Run all tests
```bash
cd /var/www/marketing

# Unit + integration (Vitest)
npx vitest run

# With coverage report
npx vitest run --coverage

# E2E (Playwright) — runs against https://mk.gecbusiness.com
npx playwright test
```

## Watch mode (during development)
```bash
npx vitest
```

## Filter to specific file or test name
```bash
npx vitest run tests/unit/crypto.test.ts
npx vitest run --reporter=verbose -t "hashPassword"
npx playwright test tests/e2e/auth.spec.ts
```

## Coverage
```bash
npx vitest run --coverage
# Report at: coverage/index.html
```

## Fix failing tests with parallel agents

If tests fail after a code change, spawn agents in parallel:

```
Spawn 3 agents in a single response:
- Agent 1: Read failing test output, fix tests/unit/* failures
- Agent 2: Read failing test output, fix tests/integration/* failures  
- Agent 3: Read failing test output, fix tests/e2e/* failures
Each agent: read the relevant test file + source, understand the failure, fix it.
```

## Test locations
| Suite | Path | Count |
|-------|------|-------|
| Unit | `tests/unit/` | ~97 tests |
| Integration | `tests/integration/` | ~55 tests |
| E2E | `tests/e2e/` | ~7 tests |

## After deploying
Always copy static assets before PM2 restart:
```bash
cd /var/www/marketing
npm run build
cp -r .next/static .next/standalone/.next/static
pm2 restart marketing
```
