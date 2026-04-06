'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

const COMPONENTS = [
  { id: 'copy', label: 'Copy' },
  { id: 'hashtags', label: 'Hashtags' },
  { id: 'visual', label: 'Visual' },
  { id: 'video', label: 'Video' },
  { id: 'general', label: 'General' },
];

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentComponent, setCommentComponent] = useState('general');

  useEffect(() => { fetchPost(); }, []);

  async function fetchPost() {
    setLoading(true);
    const res = await fetch(`/api/content/${id}`);
    const data = await res.json();
    setPost(data.post);
    setComments(data.comments || []);
    setLoading(false);
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    await fetch(`/api/content/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ component: commentComponent, message: newComment }),
    });
    setNewComment('');
    fetchPost();
  }

  async function handleApprove() {
    await fetch(`/api/content/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    fetchPost();
  }

  async function handleReject() {
    await fetch(`/api/content/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });
    fetchPost();
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;
  if (!post) return <p className="text-red-500 text-center py-8">Post not found</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/portal/content" className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">&larr; Back to content</Link>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{post.status}</span>
          <span className="text-xs text-gray-400">{post.content_type}</span>
          {(post.platforms || []).map((p: string) => (
            <span key={p} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p}</span>
          ))}
        </div>

        {post.generated_image_url && (
          <img src={post.generated_image_url} alt="" className="w-full max-w-sm rounded-lg mb-4" />
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Primary Copy</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.copy_primary}</p>
          </div>
          {post.copy_secondary && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Secondary Copy</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.copy_secondary}</p>
            </div>
          )}
          {post.hashtags?.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Hashtags</h3>
              <p className="text-sm text-blue-500">{post.hashtags.join(' ')}</p>
            </div>
          )}
          {post.video_idea && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Video Idea</h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p><strong>Concept:</strong> {post.video_idea.concept}</p>
                <p><strong>Scenario:</strong> {post.video_idea.scenario}</p>
                <p><strong>Duration:</strong> {post.video_idea.duration}</p>
                {post.video_idea.texts?.length > 0 && <p><strong>Text overlays:</strong> {post.video_idea.texts.join(' | ')}</p>}
              </div>
            </div>
          )}
        </div>

        {post.status === 'pending_tenant' && (
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button onClick={handleApprove} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Approve</button>
            <button onClick={handleReject} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Reject</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Comments</h3>

        {comments.length > 0 ? (
          <div className="space-y-3 mb-6">
            {comments.map((c: any) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                  {c.user_name?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.user_name}</span>
                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.component}</span>
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{c.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-6">No comments yet.</p>
        )}

        <div className="border-t pt-4">
          <div className="flex gap-2 mb-2">
            {COMPONENTS.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setCommentComponent(comp.id)}
                className={`text-xs px-2 py-1 rounded ${commentComponent === comp.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {comp.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`Comment on ${commentComponent}...`}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
            />
            <button onClick={submitComment} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
