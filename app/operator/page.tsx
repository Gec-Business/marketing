import { query } from '@/lib/db';
import AlertsWidget from '@/components/operator/AlertsWidget';

export default async function OperatorOverview() {
  const tenants = await query('SELECT id, name, status FROM tenants ORDER BY created_at DESC');
  const postCount = await query('SELECT COUNT(*) as count FROM posts');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active Tenants</p>
          <p className="text-3xl font-bold">{tenants.filter((t: any) => t.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Tenants</p>
          <p className="text-3xl font-bold">{tenants.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Posts</p>
          <p className="text-3xl font-bold">{(postCount[0] as any)?.count || 0}</p>
        </div>
      </div>

      <AlertsWidget />
    </div>
  );
}
