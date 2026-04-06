import PortalNav from '@/components/portal/PortalNav';
import { getCurrentUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { redirect } from 'next/navigation';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'tenant') redirect('/');

  const tenant = await queryOne('SELECT name FROM tenants WHERE id = $1', [user.tenant_id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNav tenantName={(tenant as any)?.name || 'Portal'} />
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
