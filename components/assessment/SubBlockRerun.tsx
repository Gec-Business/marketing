'use client';

import { useState } from 'react';

interface Props {
  assessmentId: string;
  section: 'research_data' | 'competitor_data' | 'brand_audit' | 'strategy_data';
  block: string;
  label: string;
  onComplete: () => void;
}

export default function SubBlockRerun({ assessmentId, section, block, label, onComplete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [running, setRunning] = useState(false);

  async function handleRerun() {
    setRunning(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/rerun-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, block, feedback: feedback.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed: ${err.error || res.statusText}`);
        return;
      }
      setShowForm(false);
      setFeedback('');
      setTimeout(onComplete, 15000);
      setTimeout(onComplete, 30000);
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
        className="text-xs px-2 py-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
        title={`Re-run ${label}`}
      >
        Re-run
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-xs font-medium text-blue-800 mb-1">Re-run: {label}</p>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Tell the AI what to change or focus on..."
        rows={2}
        className="w-full px-2 py-1.5 border border-blue-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <div className="flex gap-2 mt-1.5">
        <button
          onClick={handleRerun}
          disabled={running}
          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? 'Running...' : 'Re-run'}
        </button>
        <button
          onClick={() => { setShowForm(false); setFeedback(''); }}
          className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
