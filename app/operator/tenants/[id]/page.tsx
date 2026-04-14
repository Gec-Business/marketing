import Link from 'next/link';
import { queryOne, query } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [id]);
  if (!tenant) notFound();

  const t = tenant as any;
  const assessment = await queryOne('SELECT id, status, tea_approved, tenant_approved FROM assessments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1', [id]);
  const postCount = await queryOne('SELECT COUNT(*) as count FROM posts WHERE tenant_id = $1', [id]);

  const actions = [
    { href: `/operator/tenants/${id}/assessment`, label: 'Assessment', desc: assessment ? `Status: ${(assessment as any).status}` : 'Not started' },
    { href: `/operator/tenants/${id}/strategy`, label: 'Strategy', desc: 'View & approve strategy' },
    { href: `/operator/tenants/${id}/content`, label: 'Content', desc: `${(postCount as any)?.count || 0} posts` },
    { href: `/operator/tenants/${id}/connect`, label: 'Connect Accounts', desc: 'Social media accounts' },
    { href: `/operator/tenants/${id}/reports`, label: 'Reports', desc: 'Weekly + monthly summaries' },
    { href: `/operator/tenants/${id}/invoices`, label: 'Invoices', desc: 'Billing' },
    { href: `/operator/tenants/${id}/settings`, label: 'Settings', desc: 'Configuration & billing' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/operator/tenants" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-2xl font-bold">{t.name}</h1>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{t.status}</span>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Industry:</span> {t.industry}</div>
          <div><span className="text-gray-500">City:</span> {t.city}</div>
          <div><span className="text-gray-500">Channels:</span> {(t.channels || []).join(', ')}</div>
          <div><span className="text-gray-500">Posts/week:</span> {t.posts_per_week}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <h3 className="font-semibold mb-1">{a.label}</h3>
            <p className="text-sm text-gray-500">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
