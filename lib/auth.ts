import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { query, queryOne } from './db';
import type { SessionData, User } from './types';
import bcrypt from 'bcryptjs';

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be set and at least 32 characters long');
}

export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: 'mk-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session.is_logged_in || !session.user_id) return null;
  return queryOne<User>('SELECT id, email, name, role, tenant_id, api_keys, created_at FROM users WHERE id = $1', [session.user_id]);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireOperator(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'operator' && user.role !== 'admin') throw new Error('Forbidden');
  return user;
}

export async function requireTenantAccess(tenantId: string): Promise<User> {
  const user = await requireUser();
  if (user.role === 'operator' || user.role === 'admin') return user;
  if (user.role === 'tenant' && user.tenant_id === tenantId) return user;
  throw new Error('Forbidden');
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const row = await queryOne<User & { password_hash: string }>(
    'SELECT id, email, name, role, tenant_id, created_at, password_hash FROM users WHERE email = $1',
    [email]
  );
  if (!row) return null;
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;
  const { password_hash, ...user } = row;
  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
