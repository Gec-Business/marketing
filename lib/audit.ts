import { query } from './db';

export type AuditAction =
  | 'set_tenant_api_keys'
  | 'set_operator_api_keys'
  | 'clear_tenant_api_keys'
  | 'clear_operator_api_keys';

/**
 * Log an action to the audit_log table. Failures are swallowed (logged) to
 * never block the actual operation.
 */
export async function logAudit(params: {
  userId: string | null;
  action: AuditAction;
  resourceType: 'tenant' | 'user' | 'post' | 'invoice';
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.userId,
        params.action,
        params.resourceType,
        params.resourceId || null,
        JSON.stringify(params.details || {}),
        params.ipAddress || null,
      ]
    );
  } catch (error) {
    console.error('[audit] Failed to log action:', error);
  }
}
