import { queryOne, withTransaction } from './db';
import { encrypt, decrypt, DecryptError } from './crypto';
import type { ApiKeysJson } from './types';

export type { ApiKeysJson };
export type KeySource = 'tenant' | 'operator' | 'global';

/**
 * Validate that an unknown JSONB value matches the ApiKeysJson shape.
 * Returns a clean object even if the input is malformed.
 */
function parseApiKeysJson(data: unknown): ApiKeysJson {
  if (!data || typeof data !== 'object') return {};
  const obj = data as Record<string, unknown>;
  const result: ApiKeysJson = {};
  if (typeof obj.anthropic === 'string' && obj.anthropic) result.anthropic = obj.anthropic;
  if (typeof obj.openai === 'string' && obj.openai) result.openai = obj.openai;
  return result;
}

/**
 * Try to decrypt an encrypted key. Returns empty string and logs a warning
 * if decryption fails (corrupted ciphertext, wrong key, etc.) — caller will
 * fall back to the next tier in the chain.
 */
function tryDecrypt(encoded: string | undefined, context: string): string {
  if (!encoded) return '';
  try {
    return decrypt(encoded);
  } catch (error) {
    if (error instanceof DecryptError) {
      console.warn(`[api-keys] ${context} decryption failed:`, error.message);
    } else {
      console.error(`[api-keys] ${context} unexpected error:`, error);
    }
    return '';
  }
}

/**
 * Returns the API keys to use for a given tenant, following the 3-tier fallback chain:
 *
 *   1. Tenant override (tenants.api_keys) — for heavy tenants billed directly
 *   2. Operator default (users.api_keys for the most recent operator with keys set)
 *   3. GEC global (process.env) — system fallback
 */
export async function getApiKeysForTenant(tenantId: string): Promise<{
  anthropic: string;
  openai: string;
  source: { anthropic: KeySource; openai: KeySource };
}> {
  // Tier 1: Tenant override
  const tenantRow = await queryOne<{ api_keys: unknown }>(
    'SELECT api_keys FROM tenants WHERE id = $1',
    [tenantId]
  );
  const tenantKeys = parseApiKeysJson(tenantRow?.api_keys);
  const tenantAnthropic = tryDecrypt(tenantKeys.anthropic, `tenant=${tenantId} anthropic`);
  const tenantOpenai = tryDecrypt(tenantKeys.openai, `tenant=${tenantId} openai`);

  // Tier 2: Operator (Tea) default
  // Pick the MOST RECENT operator/admin who has any encrypted key set
  const operatorRow = await queryOne<{ api_keys: unknown }>(
    `SELECT api_keys FROM users
     WHERE role IN ('operator','admin')
       AND api_keys IS NOT NULL
       AND (api_keys ? 'anthropic' OR api_keys ? 'openai')
     ORDER BY created_at DESC
     LIMIT 1`
  );
  const operatorKeys = parseApiKeysJson(operatorRow?.api_keys);
  const operatorAnthropic = tryDecrypt(operatorKeys.anthropic, 'operator anthropic');
  const operatorOpenai = tryDecrypt(operatorKeys.openai, 'operator openai');

  // Tier 3: GEC global fallback
  const globalAnthropic = process.env.ANTHROPIC_API_KEY || '';
  const globalOpenai = process.env.OPENAI_API_KEY || '';

  return {
    anthropic: tenantAnthropic || operatorAnthropic || globalAnthropic,
    openai: tenantOpenai || operatorOpenai || globalOpenai,
    source: {
      anthropic: tenantAnthropic ? 'tenant' : operatorAnthropic ? 'operator' : 'global',
      openai: tenantOpenai ? 'tenant' : operatorOpenai ? 'operator' : 'global',
    },
  };
}

/**
 * Encrypt and persist API keys for a tenant override.
 * Pass empty string to clear a key (revert to operator/global fallback).
 * Uses SELECT FOR UPDATE in a transaction to prevent lost concurrent updates.
 */
export async function setApiKeysForTenant(
  tenantId: string,
  keys: { anthropic?: string; openai?: string }
): Promise<void> {
  await withTransaction(async (client) => {
    const result = await client.query(
      'SELECT api_keys FROM tenants WHERE id = $1 FOR UPDATE',
      [tenantId]
    );
    if (result.rowCount === 0) throw new Error(`Tenant ${tenantId} not found`);

    const current = parseApiKeysJson(result.rows[0].api_keys);
    const updated: ApiKeysJson = { ...current };

    if (keys.anthropic !== undefined) {
      if (keys.anthropic) updated.anthropic = encrypt(keys.anthropic);
      else delete updated.anthropic;
    }
    if (keys.openai !== undefined) {
      if (keys.openai) updated.openai = encrypt(keys.openai);
      else delete updated.openai;
    }

    await client.query(
      'UPDATE tenants SET api_keys = $1 WHERE id = $2',
      [JSON.stringify(updated), tenantId]
    );
  });
}

/**
 * Encrypt and persist API keys for an operator user.
 * Pass empty string to clear a key (revert to GEC global fallback).
 */
export async function setApiKeysForOperator(
  userId: string,
  keys: { anthropic?: string; openai?: string }
): Promise<void> {
  await withTransaction(async (client) => {
    const result = await client.query(
      'SELECT api_keys FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (result.rowCount === 0) throw new Error(`User ${userId} not found`);

    const current = parseApiKeysJson(result.rows[0].api_keys);
    const updated: ApiKeysJson = { ...current };

    if (keys.anthropic !== undefined) {
      if (keys.anthropic) updated.anthropic = encrypt(keys.anthropic);
      else delete updated.anthropic;
    }
    if (keys.openai !== undefined) {
      if (keys.openai) updated.openai = encrypt(keys.openai);
      else delete updated.openai;
    }

    await client.query(
      'UPDATE users SET api_keys = $1 WHERE id = $2',
      [JSON.stringify(updated), userId]
    );
  });
}

/**
 * Returns whether a tenant has any custom keys set (for UI display).
 */
export async function getKeyStatusForTenant(tenantId: string): Promise<{
  anthropic_set: boolean;
  openai_set: boolean;
}> {
  const row = await queryOne<{ api_keys: unknown }>(
    'SELECT api_keys FROM tenants WHERE id = $1',
    [tenantId]
  );
  const keys = parseApiKeysJson(row?.api_keys);
  return { anthropic_set: !!keys.anthropic, openai_set: !!keys.openai };
}

/**
 * Returns whether an operator user has any custom keys set (for UI display).
 */
export async function getKeyStatusForOperator(userId: string): Promise<{
  anthropic_set: boolean;
  openai_set: boolean;
}> {
  const row = await queryOne<{ api_keys: unknown }>(
    'SELECT api_keys FROM users WHERE id = $1',
    [userId]
  );
  const keys = parseApiKeysJson(row?.api_keys);
  return { anthropic_set: !!keys.anthropic, openai_set: !!keys.openai };
}
