import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }
  const user = await verifyPassword(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const session = await getSession();
  session.user_id = user.id;
  session.role = user.role;
  session.tenant_id = user.tenant_id;
  session.is_logged_in = true;
  await session.save();
  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, tenant_id: user.tenant_id } });
}
