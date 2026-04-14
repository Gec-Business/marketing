'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function OperatorReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    try {
      const res = await fetch(`/api/reports?tenant_id=${id}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.error('Fetch reports error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function generateNow(reportType: 'weekly' | 'monthly') {
    if (!confirm(`Generate a ${reportType} report now for this tenant?`)) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/reports/generate-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: id, report_type: reportType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Failed: ' + (err.error || res.statusText));
        return;
      }
      const data = await res.json();
      alert(`Report generated. ${data.message || ''}`);
      fetchReports();
    } catch (e) {
      alert('Network error.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/operator/tenants/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-2xl font-bold">Reports</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => generateNow('weekly')} disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {generating ? 'Generating...' : 'Generate Weekly Now'}
          </button>
          <button onClick={() => generateNow('monthly')} disabled={generating} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            Generate Monthly Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          {reports.length === 0 ? (
            <p className="text-gray-400 text-sm">No reports yet. Click &quot;Generate&quot; above or wait for the weekly cron.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left bg-white rounded-lg p-3 shadow-sm hover:shadow transition border ${selected?.id === r.id ? 'border-blue-500' : 'border-transparent'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{r.report_type}</span>
                    {r.sent_to_tenant_at ? (
                      <span className="text-xs text-green-600">✓ sent</span>
                    ) : (
                      <span className="text-xs text-gray-400">draft</span>
                    )}
                  </div>
                  <p className="text-sm font-medium mt-1">{r.period_start} – {r.period_end}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2">
          {selected ? (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-1 capitalize">{selected.report_type} Report</h2>
              <p className="text-sm text-gray-500 mb-6">{selected.period_start} – {selected.period_end}</p>

              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-700">{selected.data?.posts_published ?? 0}</p>
                  <p className="text-xs text-gray-500">Published</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-indigo-700">{selected.data?.posts_scheduled ?? 0}</p>
                  <p className="text-xs text-gray-500">Scheduled</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-yellow-700">{selected.data?.posts_pending_approval ?? 0}</p>
                  <p className="text-xs text-gray-500">Pending Approval</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-700">{selected.data?.posts_drafts ?? 0}</p>
                  <p className="text-xs text-gray-500">Drafts</p>
                </div>
              </div>

              {selected.data?.platforms_active?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Active Platforms</h3>
                  <div className="flex gap-2">
                    {selected.data.platforms_active.map((p: string) => (
                      <span key={p} className="text-xs px-2 py-1 bg-gray-100 rounded capitalize">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {selected.data?.upcoming_posts?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Upcoming</h3>
                  <div className="space-y-2">
                    {selected.data.upcoming_posts.map((p: any, i: number) => (
                      <div key={i} className="border-l-2 border-blue-300 pl-3 py-1">
                        <p className="text-xs text-gray-400">{new Date(p.scheduled_at).toLocaleString()}</p>
                        <p className="text-sm">{(p.copy_primary || '').slice(0, 100)}...</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">Select a report from the left to preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}
