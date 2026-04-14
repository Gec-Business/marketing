'use client';

import { useState, useEffect } from 'react';

export default function PortalReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.error('Fetch reports error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1">
        <h1 className="text-2xl font-bold mb-4">Reports</h1>
        {reports.length === 0 ? (
          <p className="text-gray-400 text-sm">No reports yet. Reports are generated weekly.</p>
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
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
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
                <p className="text-2xl font-bold text-green-700">{selected.data.posts_published}</p>
                <p className="text-xs text-gray-500">Published</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-indigo-700">{selected.data.posts_scheduled}</p>
                <p className="text-xs text-gray-500">Scheduled</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-yellow-700">{selected.data.posts_pending_approval}</p>
                <p className="text-xs text-gray-500">Pending Approval</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-700">{selected.data.posts_drafts}</p>
                <p className="text-xs text-gray-500">Drafts</p>
              </div>
            </div>

            {selected.data.engagement && (selected.data.engagement.total_likes > 0 || selected.data.engagement.total_comments > 0 || selected.data.engagement.total_shares > 0) && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-pink-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-pink-700">{selected.data.engagement.total_likes}</p>
                  <p className="text-xs text-gray-500">Likes</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-700">{selected.data.engagement.total_comments}</p>
                  <p className="text-xs text-gray-500">Comments</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-teal-700">{selected.data.engagement.total_shares}</p>
                  <p className="text-xs text-gray-500">Shares</p>
                </div>
              </div>
            )}

            {selected.data.platforms_active?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Active Platforms</h3>
                <div className="flex gap-2">
                  {selected.data.platforms_active.map((p: string) => (
                    <span key={p} className="text-xs px-2 py-1 bg-gray-100 rounded capitalize">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.data.upcoming_posts?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Upcoming This Week</h3>
                <div className="space-y-2">
                  {selected.data.upcoming_posts.map((p: any, i: number) => (
                    <div key={i} className="border-l-2 border-blue-300 pl-3 py-1">
                      <p className="text-xs text-gray-400">{new Date(p.scheduled_at).toLocaleString()}</p>
                      <p className="text-sm">{p.copy_primary?.slice(0, 80)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-12">Select a report from the left to view details.</p>
        )}
      </div>
    </div>
  );
}
