import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Capture original env so we can restore it
const originalEnv = { ...process.env };

// Helper: set only the given keys, clearing ENCRYPTION_KEY and SESSION_SECRET first
function setEnv(vars: Record<string, string | undefined>) {
  delete process.env.ENCRYPTION_KEY;
  delete process.env.SESSION_SECRET;
  Object.assign(process.env, vars);
}

describe('crypto — encrypt / decrypt', () => {
  beforeEach(() => {
    // Provide a known ENCRYPTION_KEY for most tests
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-abc!';
    delete process.env.SESSION_SECRET;
  });

  afterEach(() => {
    // Restore original env state
    delete process.env.ENCRYPTION_KEY;
    delete process.env.SESSION_SECRET;
    if (originalEnv.ENCRYPTION_KEY !== undefined) process.env.ENCRYPTION_KEY = originalEnv.ENCRYPTION_KEY;
    if (originalEnv.SESSION_SECRET !== undefined) process.env.SESSION_SECRET = originalEnv.SESSION_SECRET;
  });

  it('encrypt + decrypt roundtrip returns original plaintext', async () => {
    const { encrypt, decrypt } = await import('../../lib/crypto');
    const plaintext = 'super-secret-api-key-12345';
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('roundtrip works with unicode / multibyte characters', async () => {
    const { encrypt, decrypt } = await import('../../lib/crypto');
    const plaintext = 'გამარჯობა! 🔐 こんにちは';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('roundtrip works with a long string', async () => {
    const { encrypt, decrypt } = await import('../../lib/crypto');
    const plaintext = 'x'.repeat(10_000);
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('encrypt("") returns empty string', async () => {
    const { encrypt } = await import('../../lib/crypto');
    expect(encrypt('')).toBe('');
  });

  it('decrypt("") returns empty string', async () => {
    const { decrypt } = await import('../../lib/crypto');
    expect(decrypt('')).toBe('');
  });

  it('decrypt(null) returns empty string', async () => {
    const { decrypt } = await import('../../lib/crypto');
    expect(decrypt(null)).toBe('');
  });

  it('decrypt(undefined) returns empty string', async () => {
    const { decrypt } = await import('../../lib/crypto');
    expect(decrypt(undefined)).toBe('');
  });

  it('different plaintexts produce different ciphertexts', async () => {
    const { encrypt } = await import('../../lib/crypto');
    const a = encrypt('hello');
    const b = encrypt('world');
    expect(a).not.toBe(b);
  });

  it('encrypting the same plaintext twice produces different ciphertexts (random IV)', async () => {
    const { encrypt } = await import('../../lib/crypto');
    const plaintext = 'same-text-every-time';
    const first = encrypt(plaintext);
    const second = encrypt(plaintext);
    // Both should decrypt correctly but ciphertexts must differ due to random IV
    expect(first).not.toBe(second);
  });

  it('encrypt output is a valid base64 string', async () => {
    const { encrypt } = await import('../../lib/crypto');
    const ct = encrypt('test-value');
    // base64 characters: A-Z a-z 0-9 + / =
    expect(ct).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

describe('crypto — DecryptError on tampered / wrong-key data', () => {
  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
    delete process.env.SESSION_SECRET;
    if (originalEnv.ENCRYPTION_KEY !== undefined) process.env.ENCRYPTION_KEY = originalEnv.ENCRYPTION_KEY;
    if (originalEnv.SESSION_SECRET !== undefined) process.env.SESSION_SECRET = originalEnv.SESSION_SECRET;
  });

  it('decrypt with wrong ENCRYPTION_KEY throws DecryptError', async () => {
    // Encrypt with key A
    setEnv({ ENCRYPTION_KEY: 'key-A-32-bytes-padding-xxxxxxxxxxx' });
    const { encrypt, decrypt, DecryptError } = await import('../../lib/crypto');
    const ciphertext = encrypt('secret');

    // Decrypt with key B
    setEnv({ ENCRYPTION_KEY: 'key-B-32-bytes-padding-xxxxxxxxxxx' });
    // Re-import to pick up new env — but since Node caches modules we call
    // the already-imported functions; the module reads env at call time via getKey()
    expect(() => decrypt(ciphertext)).toThrow(DecryptError);
  });

  it('decrypt throws DecryptError for truncated base64 payload', async () => {
    setEnv({ ENCRYPTION_KEY: 'test-encryption-key-32-bytes-abc!' });
    const { decrypt, DecryptError } = await import('../../lib/crypto');
    // A valid-looking base64 blob that is too short (< IV_LENGTH + TAG_LENGTH + 1 = 33 bytes)
    const tooShort = Buffer.alloc(20).toString('base64');
    expect(() => decrypt(tooShort)).toThrow(DecryptError);
  });

  it('decrypt throws DecryptError for completely garbled ciphertext', async () => {
    setEnv({ ENCRYPTION_KEY: 'test-encryption-key-32-bytes-abc!' });
    const { decrypt, DecryptError } = await import('../../lib/crypto');
    // 50 random bytes, definitely not a valid AES-GCM payload for this key
    const garbage = Buffer.alloc(50, 0xff).toString('base64');
    expect(() => decrypt(garbage)).toThrow(DecryptError);
  });

  it('DecryptError has name "DecryptError"', async () => {
    setEnv({ ENCRYPTION_KEY: 'test-encryption-key-32-bytes-abc!' });
    const { decrypt, DecryptError } = await import('../../lib/crypto');
    const garbage = Buffer.alloc(50, 0xaa).toString('base64');
    try {
      decrypt(garbage);
      // Should not reach here
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(DecryptError);
      expect((e as Error).name).toBe('DecryptError');
    }
  });
});

describe('crypto — env var selection (ENCRYPTION_KEY vs SESSION_SECRET)', () => {
  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
    delete process.env.SESSION_SECRET;
    if (originalEnv.ENCRYPTION_KEY !== undefined) process.env.ENCRYPTION_KEY = originalEnv.ENCRYPTION_KEY;
    if (originalEnv.SESSION_SECRET !== undefined) process.env.SESSION_SECRET = originalEnv.SESSION_SECRET;
  });

  it('uses SESSION_SECRET as fallback when ENCRYPTION_KEY is absent', async () => {
    setEnv({ SESSION_SECRET: 'session-secret-fallback-key-xyz123' });
    const { encrypt, decrypt } = await import('../../lib/crypto');
    const plaintext = 'fallback-key-test';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('throws when neither ENCRYPTION_KEY nor SESSION_SECRET is set', async () => {
    setEnv({});
    const { encrypt } = await import('../../lib/crypto');
    expect(() => encrypt('something')).toThrow('ENCRYPTION_KEY or SESSION_SECRET must be set');
  });

  it('ENCRYPTION_KEY takes precedence over SESSION_SECRET', async () => {
    // Encrypt with ENCRYPTION_KEY only
    setEnv({ ENCRYPTION_KEY: 'preferred-key-padding-xxxxxxxxxxxxx' });
    const { encrypt, decrypt } = await import('../../lib/crypto');
    const ciphertext = encrypt('priority-test');

    // Decrypt still works with same ENCRYPTION_KEY even when SESSION_SECRET also present
    setEnv({ ENCRYPTION_KEY: 'preferred-key-padding-xxxxxxxxxxxxx', SESSION_SECRET: 'some-session-secret-that-is-ignored' });
    expect(decrypt(ciphertext)).toBe('priority-test');
  });
});

describe('crypto — maskKey', () => {
  it('masks a normal API key showing first 7 and last 4 chars', async () => {
    const { maskKey } = await import('../../lib/crypto');
    const key = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRS';
    expect(maskKey(key)).toBe('sk-ant-...PQRS');
  });

  it('masks a 12-character key (minimum for real masking)', async () => {
    const { maskKey } = await import('../../lib/crypto');
    // exactly 12 chars — first 7 + ... + last 4 = "1234567...9012"
    expect(maskKey('123456789012')).toBe('1234567...9012');
  });

  it('returns bullet placeholder for a short key (length < 12)', async () => {
    const { maskKey } = await import('../../lib/crypto');
    expect(maskKey('short')).toBe('••••');
  });

  it('returns bullet placeholder for a key of exactly 11 characters', async () => {
    const { maskKey } = await import('../../lib/crypto');
    expect(maskKey('12345678901')).toBe('••••');
  });

  it('returns bullet placeholder for empty string', async () => {
    const { maskKey } = await import('../../lib/crypto');
    expect(maskKey('')).toBe('••••');
  });

  it('masks a longer typical API key correctly', async () => {
    const { maskKey } = await import('../../lib/crypto');
    const key = 'sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1234';
    const masked = maskKey(key);
    expect(masked).toBe('sk-proj...1234');
    // Should not expose the middle section
    expect(masked).not.toContain('XXXXXXXX');
  });
});
