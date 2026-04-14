import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

let warnedAboutFallback = false;

/**
 * Returns the encryption key. Prefers ENCRYPTION_KEY env var; falls back to
 * SESSION_SECRET (with a one-time warning) for backward compatibility during
 * the migration period. Both produce the same derived key for a given input.
 *
 * IMPORTANT: Rotating either secret makes all previously encrypted values
 * unrecoverable. There is no key versioning yet — if you must rotate, you
 * must clear the encrypted columns first and re-enter the API keys.
 */
function getKey(): Buffer {
  const dedicated = process.env.ENCRYPTION_KEY;
  if (dedicated) {
    return crypto.createHash('sha256').update(dedicated).digest();
  }
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error('ENCRYPTION_KEY or SESSION_SECRET must be set for crypto operations');
  }
  if (!warnedAboutFallback) {
    console.warn('[crypto] ENCRYPTION_KEY not set, falling back to SESSION_SECRET. Set ENCRYPTION_KEY in .env for proper key separation.');
    warnedAboutFallback = true;
  }
  return crypto.createHash('sha256').update(sessionSecret).digest();
}

/**
 * Encrypt a plaintext string. Returns a base64 string containing IV + tag + ciphertext.
 * Returns empty string for empty/falsy input.
 *
 * IV is randomly generated per call, so encrypting the same plaintext multiple
 * times produces different ciphertexts (defeats deterministic-encryption attacks).
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a base64 string previously produced by encrypt().
 * Returns empty string ONLY for empty input.
 * Throws DecryptError on actual decryption failures (corrupted ciphertext,
 * wrong key, auth tag mismatch). Callers should distinguish "no key set"
 * (empty input) from "decryption failed" (thrown error).
 */
export class DecryptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptError';
  }
}

export function decrypt(encoded: string | null | undefined): string {
  if (!encoded) return '';
  try {
    const data = Buffer.from(encoded, 'base64');
    if (data.length < IV_LENGTH + TAG_LENGTH + 1) {
      throw new DecryptError('Ciphertext too short');
    }
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (error) {
    if (error instanceof DecryptError) throw error;
    throw new DecryptError(`Decryption failed: ${(error as Error).message}`);
  }
}

/**
 * Mask a key for display (e.g., "sk-ant-...XYZ").
 */
export function maskKey(key: string): string {
  if (!key || key.length < 12) return '••••';
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}
