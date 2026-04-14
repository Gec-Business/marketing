'use client';

import { useState, useEffect } from 'react';

const SEVERITY_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'CRITICAL' },
  error: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'ERROR' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'WARN' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'INFO' },
};

export default function AlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ critical: 0, error: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/system/alerts');
      if (!res.ok) return;
      const data = await res.json();
      setAlerts(data.alerts || []);
      setCounts(data.counts || {});
    } catch (e) {
      console.error('Fetch alerts error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function resolve(id: string) {
    try {
      await fetch('/api/system/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchAlerts();
    } catch {}
  }

  if (loading) return null;

  const total = (counts.critical || 0) + (counts.error || 0) + (counts.warning || 0);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">System Alerts</h3>
        <div className="flex gap-2 text-xs">
          {counts.critical > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{counts.critical} critical</span>}
          {counts.error > 0 && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{counts.error} error</span>}
          {counts.warning > 0 && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">{counts.warning} warn</span>}
          {total === 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">All systems healthy</span>}
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-gray-400">No active alerts.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-auto">
          {alerts.slice(0, 10).map((a) => {
            const style = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info;
            return (
              <div key={a.id} className={`${style.bg} ${style.border} border rounded-lg p-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${style.text}`}>{style.label}</span>
                      <span className="text-xs text-gray-500 truncate">{a.check_name}</span>
                    </div>
                    <p className="text-sm text-gray-800">{a.message}</p>
                    {a.affected_resource && <p className="text-xs text-gray-400 mt-1">{a.affected_resource}</p>}
                  </div>
                  <button
                    onClick={() => resolve(a.id)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                    title="Mark resolved"
                  >
                    ✓
                  </button>
                </div>
              </div>
            );
          })}
          {alerts.length > 10 && (
            <p className="text-xs text-gray-400 text-center pt-2">+ {alerts.length - 10} more</p>
          )}
        </div>
      )}
    </div>
  );
}
