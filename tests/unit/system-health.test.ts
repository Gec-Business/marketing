import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We only test verifyCronSecret from system-health.ts.
// The rest of the module (recordHealth, resolveCheck) requires a live database
// connection via pg, which we do not spin up in unit tests.
//
// We mock './db' and './email' so the module-level imports do not throw when
// the module is loaded in a Node environment without a DB.

vi.mock('../../lib/db', () => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  queryOne: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../lib/email', () => ({
  sendAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

const originalEnv = { ...process.env };

describe('verifyCronSecret', () => {
  beforeEach(() => {
    // Reset env before each test
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    if (originalEnv.CRON_SECRET !== undefined) {
      process.env.CRON_SECRET = originalEnv.CRON_SECRET;
    }
  });

  // --- Happy path ---

  it('returns true when header exactly matches CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'my-super-secret-cron-token';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('my-super-secret-cron-token')).toBe(true);
  });

  it('returns true for a longer complex secret', async () => {
    process.env.CRON_SECRET = 'v3ry-$3cur3-t0k3n-with-special-chars!@#';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('v3ry-$3cur3-t0k3n-with-special-chars!@#')).toBe(true);
  });

  // --- Wrong secret ---

  it('returns false when header has a different value', async () => {
    process.env.CRON_SECRET = 'correct-secret-token';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('wrong-secret-token!')).toBe(false);
  });

  it('returns false when header is one character off (prevents timing leak check)', async () => {
    // Different length → rejected before timing-safe comparison
    process.env.CRON_SECRET = 'secret123';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('secret124')).toBe(false);
  });

  // The length check guards timingSafeEqual from blowing up on mismatched buffers.
  it('returns false when header is longer than CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'short';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('short-and-then-some')).toBe(false);
  });

  it('returns false when header is shorter than CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'longer-secret-value';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('short')).toBe(false);
  });

  // --- Empty / null / undefined header ---

  it('returns false for an empty-string header', async () => {
    process.env.CRON_SECRET = 'valid-secret';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('')).toBe(false);
  });

  it('returns false for a null header', async () => {
    process.env.CRON_SECRET = 'valid-secret';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret(null)).toBe(false);
  });

  // --- Missing / empty env var ---

  it('returns false when CRON_SECRET env var is not set, regardless of header', async () => {
    delete process.env.CRON_SECRET;
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('any-header-value')).toBe(false);
  });

  it('returns false when CRON_SECRET is an empty string even if header is also empty', async () => {
    // Both empty — the `!expected` guard should reject this
    process.env.CRON_SECRET = '';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('')).toBe(false);
  });

  it('returns false when CRON_SECRET is empty and header has a value', async () => {
    process.env.CRON_SECRET = '';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('some-value')).toBe(false);
  });

  // --- Case sensitivity ---

  it('returns false for header that matches only in wrong case (secrets are case-sensitive)', async () => {
    process.env.CRON_SECRET = 'MySecret';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret('mysecret')).toBe(false);
  });

  it('returns false for header with extra whitespace', async () => {
    process.env.CRON_SECRET = 'clean-secret';
    const { verifyCronSecret } = await import('../../lib/system-health');
    expect(verifyCronSecret(' clean-secret')).toBe(false);
    expect(verifyCronSecret('clean-secret ')).toBe(false);
  });
});
