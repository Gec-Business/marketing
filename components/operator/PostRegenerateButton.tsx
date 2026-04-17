'use client';

import { useState } from 'react';

interface Props {
  postId: string;
  component: 'copy' | 'hashtags' | 'visual' | 'video' | 'platform_copies';
  label: string;
  onComplete: () => void;
}

export default function PostRegenerateButton({ postId, component, label, onComplete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [running, setRunning] = useState(false);

  async function handleRegenerate() {
    setRunning(true);
    try {
      const res = await fetch(`/api/content/${postId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component, feedback: feedback.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed: ${err.error || res.statusText}`);
        return;
      }
      setShowForm(false);
      setFeedback('');
      onComplete();
    } catch (e) {
      alert('Network error.');
    } finally {
      setRunning(false);
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
      >
        Re-generate
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-xs font-medium text-blue-800 mb-1">Re-generate {label}</p>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder={`Tell AI what to change — e.g., "${component === 'copy' ? 'make it shorter and more professional' : component === 'hashtags' ? 'only Georgian hashtags, add industry-specific ones' : component === 'visual' ? 'show office environment, not outdoor' : 'make it 15 seconds, more dynamic'}"`}
        rows={2}
        className="w-full px-2 py-1.5 border border-blue-200 rounded text-xs bg-white"
      />
      <div className="flex gap-2 mt-1.5">
        <button onClick={handleRegenerate} disabled={running} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">
          {running ? 'Generating...' : 'Re-generate'}
        </button>
        <button onClick={() => { setShowForm(false); setFeedback(''); }} className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
}
