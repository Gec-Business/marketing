---
name: fix
description: Run typechecking and linting, then spawn parallel agents to fix all issues
---

# Project Code Quality Check

## Step 1: Run Linting and Typechecking

```bash
cd /var/www/marketing
npm run lint
npm run typecheck
```

## Step 2: Collect and Parse Errors

Parse the output. Group errors by domain:
- **Type errors**: TypeScript (`tsc --noEmit`) failures
- **Lint errors**: ESLint rule violations (errors only, not warnings)

Create a list of all files with issues and the specific problems in each.

## Step 3: Spawn Parallel Agents

For each domain with errors, spawn an agent in parallel using the Task tool in a SINGLE response:

- **type-fixer agent**: receives all TypeScript error files + messages, fixes them, re-runs `npm run typecheck`
- **lint-fixer agent**: receives all ESLint error files + messages, fixes them, re-runs `npm run lint`

Each agent should:
1. Read the affected file(s)
2. Fix the specific errors listed
3. Re-run the relevant check to verify
4. Report completion

## Step 4: Verify All Fixes

After all agents complete, run the full check:
```bash
npm run lint
npm run typecheck
```

Confirm: **0 errors** before marking done. Warnings are acceptable.
