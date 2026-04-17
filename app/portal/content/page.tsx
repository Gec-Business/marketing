'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function RejectModal({ postId, onReject, onCancel }: { postId: string; onReject: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  const [component, setComponent] = useState('general');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-lg mb-2">Why are you rejecting this post?</h3>
        <p className="text-sm text-gray-500 mb-4">Your feedback helps the marketing team improve the content for you.</p>

        <div className="flex gap-2 mb-3">
          {[
            { id: 'copy', label: 'Text/Copy' },
            { id: 'hashtags', label: 'Hashtags' },
            { id: 'visual', label: 'Visual' },
            { id: 'video', label: 'Video' },
            { id: 'general', label: 'General' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setComponent(c.id)}
              className={`text-xs px-2.5 py-1.5 rounded-lg ${component === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain what needs to change — e.g., 'tone is too casual', 'wrong product mentioned', 'hashtags not relevant'..."
          rows={4}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          autoFocus
        />

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => {
              if (!reason.trim()) { alert('Please explain why you are rejecting this post.'); return; }
              onReject(reason.trim());
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            Reject with Feedback
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PortalContentPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/content');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (e) {
      console.error('Fetch posts error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function approvePost(postId: string) {
    try {
      const res = await fetch(`/api/content/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) { alert('Failed to approve post'); return; }
      fetchPosts();
    } catch (e) { alert('Network error.'); }
  }

  async function rejectPost(postId: string, reason?: string) {
    try {
      // Save rejection reason as a comment first
      if (reason) {
        await fetch(`/api/content/${postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ component: 'general', message: `REJECTION REASON: ${reason}` }),
        });
      }
      const res = await fetch(`/api/content/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      if (!res.ok) { alert('Failed to reject post'); return; }
      setRejectingPostId(null);
      fetchPosts();
    } catch (e) { alert('Network error.'); }
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;

  const pending = posts.filter((p) => p.status === 'pending_tenant');
  const others = posts.filter((p) => p.status !== 'pending_tenant');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Content</h1>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-yellow-700">Awaiting Your Approval ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map((post: any) => (
              <div key={post.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-yellow-400">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400">{post.content_type}</span>
                      {(post.platforms || []).map((p: string) => (
                        <span key={p} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p}</span>
                      ))}
                      {post.scheduled_at && <span className="text-xs text-gray-400">{new Date(post.scheduled_at).toLocaleDateString()}</span>}
                    </div>
                    <p className="text-sm text-gray-700">{post.copy_primary}</p>
                    {post.copy_secondary && <p className="text-xs text-gray-500 mt-1">{post.copy_secondary}</p>}
                    {post.hashtags?.length > 0 && <p className="text-xs text-blue-500 mt-1">{post.hashtags.join(' ')}</p>}
                    <Link href={`/portal/content/${post.id}`} className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                      View details & comment
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {post.generated_image_url && (
                      <img src={post.generated_image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <button onClick={() => approvePost(post.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">Approve</button>
                    <button onClick={() => setRejectingPostId(post.id)} className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs hover:bg-red-50">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">All Posts ({others.length})</h2>
          <div className="space-y-3">
            {others.map((post: any) => (
              <div key={post.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{post.status}</span>
                  <span className="text-xs text-gray-400">{post.content_type}</span>
                  {post.scheduled_at && <span className="text-xs text-gray-400">{new Date(post.scheduled_at).toLocaleDateString()}</span>}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{post.copy_primary}</p>
                <Link href={`/portal/content/${post.id}`} className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                  View details
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 && <p className="text-gray-400 text-center py-12">No content ready for review yet.</p>}

      {/* Rejection reason modal */}
      {rejectingPostId && (
        <RejectModal
          postId={rejectingPostId}
          onReject={(reason) => rejectPost(rejectingPostId, reason)}
          onCancel={() => setRejectingPostId(null)}
        />
      )}
    </div>
  );
}
