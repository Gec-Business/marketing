'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import PostRegenerateButton from '@/components/operator/PostRegenerateButton';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  tea_approved: 'bg-blue-100 text-blue-700',
  pending_tenant: 'bg-yellow-100 text-yellow-700',
  tenant_approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  publishing: 'bg-orange-100 text-orange-700',
  posted: 'bg-green-100 text-green-700',
  partially_posted: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(5);
  const [weekStart, setWeekStart] = useState(new Date().toISOString().split('T')[0]);
  const [genImages, setGenImages] = useState(true);
  const [showBatchRegen, setShowBatchRegen] = useState(false);
  const [batchDirection, setBatchDirection] = useState('');
  const [regeneratingBatch, setRegeneratingBatch] = useState(false);

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/content?tenant_id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (e) {
      console.error('Fetch posts error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function generateBatch() {
    setGenerating(true);
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: id, count, week_start: weekStart, generate_images: genImages }),
      });
      if (!res.ok) { alert('Content generation failed. Please try again.'); return; }
      await fetchPosts();
    } catch (e) {
      alert('Network error during generation.');
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateBatch() {
    if (!batchDirection.trim()) { alert('Please describe what kind of content you want.'); return; }
    if (!confirm('This will delete all draft posts and generate new ones. Continue?')) return;
    setRegeneratingBatch(true);
    try {
      const res = await fetch('/api/content/regenerate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: id, count, week_start: weekStart, direction: batchDirection.trim(), delete_drafts: true }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert('Failed: ' + (err.error || res.statusText)); return; }
      setShowBatchRegen(false);
      setBatchDirection('');
      await fetchPosts();
    } catch (e) { alert('Network error.'); } finally { setRegeneratingBatch(false); }
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/operator/tenants/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-2xl font-bold">Content</h1>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h3 className="font-semibold mb-3">Generate Content Batch</h3>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Posts</label>
            <input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} min={1} max={30} className="w-20 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Week Start</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={genImages} onChange={(e) => setGenImages(e.target.checked)} />
            Generate images
          </label>
          <button onClick={generateBatch} disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {generating ? 'Generating...' : 'Generate'}
          </button>
          {posts.length > 0 && (
            <button onClick={() => setShowBatchRegen(!showBatchRegen)} className="px-4 py-2 border border-orange-300 text-orange-600 rounded-lg text-sm hover:bg-orange-50">
              Re-generate All
            </button>
          )}
        </div>
        {showBatchRegen && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm font-medium text-orange-800 mb-2">Re-generate entire content batch</p>
            <p className="text-xs text-orange-600 mb-3">This will delete all draft posts and generate fresh content based on your direction.</p>
            <textarea
              value={batchDirection}
              onChange={(e) => setBatchDirection(e.target.value)}
              placeholder="Describe what kind of content you want this month — e.g., 'focus on client success stories, more educational content, less promotional, include video scenarios for each post, tone should be authoritative but approachable'"
              rows={3}
              className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm bg-white"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={regenerateBatch} disabled={regeneratingBatch} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                {regeneratingBatch ? 'Re-generating...' : 'Re-generate with Direction'}
              </button>
              <button onClick={() => { setShowBatchRegen(false); setBatchDirection(''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No posts yet. Generate a content batch above.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <div key={post.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status] || ''}`}>{post.status}</span>
                    <span className="text-xs text-gray-400">{post.content_type}</span>
                    <div className="flex gap-1">
                      {(post.platforms || []).map((p: string) => (
                        <span key={p} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                    {post.scheduled_at && <span className="text-xs text-gray-400">{new Date(post.scheduled_at).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-700 line-clamp-2 flex-1">{post.copy_primary}</p>
                    {post.status === 'draft' && <PostRegenerateButton postId={post.id} component="copy" label="Copy" onComplete={fetchPosts} />}
                  </div>
                  {post.copy_secondary && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{post.copy_secondary}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {post.hashtags?.length > 0 && <p className="text-xs text-blue-500 flex-1">{post.hashtags.join(' ')}</p>}
                    {post.status === 'draft' && <PostRegenerateButton postId={post.id} component="hashtags" label="Hashtags" onComplete={fetchPosts} />}
                  </div>
                  {post.status === 'draft' && post.video_idea && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400 flex-1">Video: {post.video_idea?.concept}</p>
                      <PostRegenerateButton postId={post.id} component="video" label="Video" onComplete={fetchPosts} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {post.generated_image_url && (
                    <img src={post.generated_image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  {post.status === 'draft' && (
                    <>
                      <button onClick={() => approvePost(post.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">Approve</button>
                      <button onClick={() => rejectPost(post.id)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Reject</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
