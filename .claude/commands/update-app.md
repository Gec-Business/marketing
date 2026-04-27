---
name: update-app
description: Update dependencies, fix deprecations and warnings
---

# Dependency Update & Deprecation Fix

## Step 1: Check for Updates

```bash
cd /var/www/marketing
npm outdated
```

## Step 2: Update Dependencies

```bash
npm update
npm audit fix
```

## Step 3: Check for Deprecations & Warnings

Run installation and check output:
```bash
rm -rf node_modules package-lock.json
npm install
```

Read ALL output carefully. Look for:
- Deprecation warnings
- Security vulnerabilities
- Peer dependency warnings
- Breaking changes

## Step 4: Fix Issues

For each warning/deprecation:
1. Research the recommended replacement or fix
2. Update code/dependencies accordingly
3. Re-run installation
4. Verify no warnings remain

## Step 5: Run Quality Checks

```bash
npm run lint
npm run typecheck
npm run test
```

Fix all errors before completing.

## Step 6: Verify Clean Install

Ensure a fresh install works:
1. Delete dependency folders/caches
2. Run clean install
3. Verify ZERO warnings/errors
4. Confirm all dependencies resolve correctly

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Step 7: After Build — Copy Static Assets

Next.js standalone build requires this after every build:
```bash
cp -r .next/static .next/standalone/.next/static
pm2 restart marketing
```
