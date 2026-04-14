'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PortalContentPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  async function rejectPost(postId: string) {
    try {
      const res = await fetch(`/api/content/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      if (!res.ok) { alert('Failed to reject post'); return; }
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
                    <button onClick={() => rejectPost(post.id)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Reject</button>
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
    </div>
  );
}
