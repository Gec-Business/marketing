/**
 * Sanitize user-provided strings before inserting into AI prompts.
 * Prevents prompt injection by stripping control characters and limiting length.
 */
export function sanitizeForPrompt(input: string | undefined | null, maxLength = 500): string {
  if (!input) return '';
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .replace(/```/g, '') // strip code fences that could break prompt format
    .replace(/\bignore\s+(previous|above|all)\s+(instructions?|prompts?)\b/gi, '[filtered]')
    .replace(/\b(system|assistant)\s*:/gi, '[filtered]')
    .slice(0, maxLength)
    .trim();
}

export function sanitizeTenantForPrompt(tenant: {
  name?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  website?: string | null;
}) {
  return {
    name: sanitizeForPrompt(tenant.name, 200),
    industry: sanitizeForPrompt(tenant.industry, 100),
    city: sanitizeForPrompt(tenant.city, 100),
    country: sanitizeForPrompt(tenant.country, 100),
    description: sanitizeForPrompt(tenant.description, 1000),
    website: sanitizeForPrompt(tenant.website, 200),
  };
}
