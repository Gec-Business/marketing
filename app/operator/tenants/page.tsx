import Link from 'next/link';
import { query } from '@/lib/db';

const statusColors: Record<string, string> = {
  onboarding: 'bg-yellow-100 text-yellow-700',
  assessing: 'bg-blue-100 text-blue-700',
  strategy_review: 'bg-purple-100 text-purple-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-gray-100 text-gray-500',
  churned: 'bg-red-100 text-red-700',
};

export default async function TenantsPage() {
  const tenants = await query('SELECT * FROM tenants ORDER BY created_at DESC');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Link href="/operator/tenants/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Tenant
        </Link>
      </div>
      <div className="grid gap-4">
        {tenants.map((t: any) => (
          <Link key={t.id} href={`/operator/tenants/${t.id}`} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{t.name}</h3>
              <p className="text-sm text-gray-500">{t.industry} — {t.city || 'Tbilisi'}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {(t.channels || []).map((ch: string) => (
                  <span key={ch} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{ch}</span>
                ))}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[t.status] || ''}`}>
                {t.status}
              </span>
            </div>
          </Link>
        ))}
        {tenants.length === 0 && (
          <p className="text-gray-400 text-center py-12">No tenants yet. Click &quot;+ New Tenant&quot; to onboard your first client.</p>
        )}
      </div>
    </div>
  );
}
