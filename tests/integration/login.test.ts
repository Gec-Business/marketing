/**
 * Integration tests for app/api/auth/login/route.ts
 *
 * The login route uses:
 *  - An in-memory Map for rate limiting (resets on module reload; each describe
 *    block uses a unique IP to stay isolated without module re-imports).
 *  - @/lib/auth.verifyPassword  — mocked via vi.mock
 *  - @/lib/auth.getSession      — mocked via vi.mock
 *  - iron-session               — mocked via vi.mock (per the spec)
 *
 * We never touch a real DB or real sessions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock DB (transitively used by @/lib/auth) ───────────────────────────────
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

// ─── Mock iron-session ───────────────────────────────────────────────────────
const mockSave = vi.fn();
const mockSession = {
  user_id: undefined as string | undefined,
  role: undefined as string | undefined,
  tenant_id: undefined as string | null | undefined,
  is_logged_in: false,
  save: mockSave,
};

vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockResolvedValue(mockSession),
}));

// ─── Mock next/headers (used by auth.getSession via cookies()) ───────────────
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

// ─── Mock @/lib/auth so we control verifyPassword and getSession directly ────
const mockVerifyPassword = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/auth', () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
  getSession: (...args: unknown[]) => mockGetSession(...args),
  sessionOptions: { password: 'test-password-32-chars-min!!!!!!!', cookieName: 'mk-session' },
}));

import { POST } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a NextRequest for POST /api/auth/login.
 * Each test that cares about rate limiting should pass a unique IP.
 */
function makeRequest(
  body: Record<string, unknown>,
  ip = '1.2.3.4',
  extraHeaders: Record<string, string> = {}
) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      ...extraHeaders,
    },
  });
}

/** Minimal valid user returned by verifyPassword on success */
const validUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'tenant' as const,
  tenant_id: 'tenant-abc',
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Reset mockSession state between tests
  mockSession.user_id = undefined;
  mockSession.role = undefined;
  mockSession.tenant_id = undefined;
  mockSession.is_logged_in = false;

  // Default: getSession returns the shared mockSession
  mockGetSession.mockResolvedValue(mockSession);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — input validation', () => {
  it('returns 400 when email is missing', async () => {
    const req = makeRequest({ password: 'secret' }, '10.0.0.1');
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email and password required/i);
  });

  it('returns 400 when password is missing', async () => {
    const req = makeRequest({ email: 'user@test.com' }, '10.0.0.2');
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email and password required/i);
  });

  it('returns 400 when both email and password are missing', async () => {
    const req = makeRequest({}, '10.0.0.3');
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — authentication', () => {
  it('returns 401 when credentials are invalid', async () => {
    mockVerifyPassword.mockResolvedValueOnce(null); // wrong password

    const req = makeRequest(
      { email: 'user@test.com', password: 'wrongpassword' },
      '10.1.0.1'
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid credentials/i);
  });

  it('calls verifyPassword with the provided email and password', async () => {
    mockVerifyPassword.mockResolvedValueOnce(null);

    const req = makeRequest(
      { email: 'user@test.com', password: 'mypassword' },
      '10.1.0.2'
    );
    await POST(req);

    expect(mockVerifyPassword).toHaveBeenCalledWith('user@test.com', 'mypassword');
  });

  it('returns 200 with user data on successful login', async () => {
    mockVerifyPassword.mockResolvedValueOnce(validUser);

    const req = makeRequest(
      { email: validUser.email, password: 'correct-password' },
      '10.2.0.1'
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({
      id: validUser.id,
      name: validUser.name,
      role: validUser.role,
      tenant_id: validUser.tenant_id,
    });
    // password_hash must never appear in the response
    expect(body.user.password_hash).toBeUndefined();
  });

  it('does not include password_hash in the success response', async () => {
    mockVerifyPassword.mockResolvedValueOnce(validUser);

    const req = makeRequest(
      { email: validUser.email, password: 'correct-password' },
      '10.2.0.2'
    );
    const res = await POST(req);
    const body = await res.json();

    expect(JSON.stringify(body)).not.toContain('password_hash');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — iron-session', () => {
  it('creates and saves the session on successful login', async () => {
    mockVerifyPassword.mockResolvedValueOnce(validUser);

    const req = makeRequest(
      { email: validUser.email, password: 'correct-password' },
      '10.3.0.1'
    );
    await POST(req);

    // Session must be populated then saved
    expect(mockSession.user_id).toBe(validUser.id);
    expect(mockSession.role).toBe(validUser.role);
    expect(mockSession.tenant_id).toBe(validUser.tenant_id);
    expect(mockSession.is_logged_in).toBe(true);
    expect(mockSave).toHaveBeenCalledOnce();
  });

  it('does not call session.save() on failed login', async () => {
    mockVerifyPassword.mockResolvedValueOnce(null);

    const req = makeRequest(
      { email: 'bad@test.com', password: 'wrong' },
      '10.3.0.2'
    );
    await POST(req);

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('does not call session.save() when credentials are missing', async () => {
    const req = makeRequest({ email: 'only@test.com' }, '10.3.0.3');
    await POST(req);

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('calls getSession() to obtain the session object on success', async () => {
    mockVerifyPassword.mockResolvedValueOnce(validUser);

    const req = makeRequest(
      { email: validUser.email, password: 'password' },
      '10.3.0.4'
    );
    await POST(req);

    expect(mockGetSession).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — rate limiting', () => {
  /**
   * The route's in-memory Map persists for the lifetime of the module.
   * We use a dedicated IP block (10.9.x.x) and a fresh IP per test to
   * avoid cross-test contamination without needing to reload the module.
   *
   * The rate limit is 5 attempts per 15-minute window (MAX_ATTEMPTS = 5).
   * The counter increments on every call that passes the rate-limit check
   * (including the first allowed attempt). Once count >= 5, subsequent
   * calls return 429.
   */

  it('returns 429 after 5 failed login attempts from the same IP', async () => {
    const ip = '10.9.1.1';

    // Attempts 1-5: allowed but verifyPassword fails each time
    mockVerifyPassword.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ email: `u${i}@test.com`, password: 'x' }, ip));
      // Each attempt within the limit returns 401 (invalid credentials), not 429
      expect(res.status).toBe(401);
    }

    // Attempt 6: blocked by rate limiter
    const blockedRes = await POST(makeRequest({ email: 'user@test.com', password: 'x' }, ip));
    expect(blockedRes.status).toBe(429);
  });

  it('returns a meaningful error message when rate limited', async () => {
    const ip = '10.9.2.1';

    mockVerifyPassword.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: `u${i}@test.com`, password: 'x' }, ip));
    }

    const res = await POST(makeRequest({ email: 'user@test.com', password: 'x' }, ip));
    const body = await res.json();
    expect(body.error).toMatch(/too many login attempts/i);
  });

  it('does not call verifyPassword when rate limit is exceeded', async () => {
    const ip = '10.9.3.1';

    mockVerifyPassword.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: `u${i}@test.com`, password: 'x' }, ip));
    }

    vi.clearAllMocks(); // reset call counts

    await POST(makeRequest({ email: 'user@test.com', password: 'x' }, ip));

    // Rate limit fires before verifyPassword is called
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  it('uses x-forwarded-for for the client IP, splitting on comma', async () => {
    // The route does: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    // so "1.2.3.4, 5.6.7.8" should be treated as IP "1.2.3.4"
    const ip = '10.9.4.1';

    mockVerifyPassword.mockResolvedValue(null);
    // Exhaust the limit for IP 10.9.4.1 via a forwarded chain header
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest(
        { email: `u${i}@test.com`, password: 'x' },
        `${ip}, 172.16.0.1` // proxy appended, first part is real client IP
      ));
    }

    const res = await POST(makeRequest(
      { email: 'user@test.com', password: 'x' },
      `${ip}, 172.16.0.99`
    ));
    expect(res.status).toBe(429);
  });

  it('allows successful login for a different IP while another is rate-limited', async () => {
    const blockedIp  = '10.9.5.1';
    const allowedIp  = '10.9.5.2';

    mockVerifyPassword.mockResolvedValue(null);

    // Block the first IP
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: `u${i}@test.com`, password: 'x' }, blockedIp));
    }

    // A different IP with valid credentials should still succeed
    mockVerifyPassword.mockResolvedValueOnce(validUser);
    const res = await POST(makeRequest(
      { email: validUser.email, password: 'correct-password' },
      allowedIp
    ));

    expect(res.status).toBe(200);
  });
});
