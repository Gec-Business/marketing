'use client';

import { useState } from 'react';

interface Props {
  assessmentId: string;
  agentType: 'research' | 'competitor' | 'brand' | 'strategy';
  label: string;
  onComplete: () => void;
}

export default function RerunButton({ assessmentId, agentType, label, onComplete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [running, setRunning] = useState(false);

  async function handleRerun() {
    setRunning(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/rerun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_type: agentType, feedback: feedback.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed: ${err.error || res.statusText}`);
        return;
      }
      alert(`${label} is re-running in the background. Refresh in 30-60 seconds to see updated results.`);
      setShowForm(false);
      setFeedback('');
      // Start polling for completion
      setTimeout(onComplete, 5000);
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
        className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition"
      >
        Re-run {label}
      </button>
    );
  }

  return (
    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm font-medium text-blue-900 mb-2">Re-run {label}</p>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder={`Optional: Tell the AI what to fix or focus on...\n\nExamples:\n- "Exclude banks and government agencies from competitors"\n- "Focus more on local cafes in Vake district"\n- "The brand positioning is wrong, we are premium not budget"`}
        rows={4}
        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleRerun}
          disabled={running}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? 'Starting...' : feedback.trim() ? 'Re-run with Feedback' : 'Re-run (Fresh)'}
        </button>
        <button
          onClick={() => { setShowForm(false); setFeedback(''); }}
          className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
