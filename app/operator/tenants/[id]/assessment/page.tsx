'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { fetchAssessment(); }, []);

  async function fetchAssessment() {
    setLoading(true);
    const res = await fetch(`/api/assessments?tenant_id=${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.assessment) {
        setAssessment(data.assessment);
        setAgents(data.agents || []);
      }
    }
    setLoading(false);
  }

  async function startAssessment() {
    setRunning(true);
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: id }),
    });
    if (res.ok) {
      await fetchAssessment();
    }
    setRunning(false);
  }

  async function approveAssessment() {
    if (!assessment) return;
    await fetch(`/api/assessments/${assessment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tea_approve' }),
    });
    fetchAssessment();
  }

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>;

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">No Assessment Yet</h2>
        <p className="text-gray-500 mb-4">Run the AI assessment pipeline to analyze this business.</p>
        <button
          onClick={startAssessment}
          disabled={running}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? 'Running Assessment (this takes 1-2 minutes)...' : 'Start Assessment'}
        </button>
      </div>
    );
  }

  const sections = [
    { key: 'research_data', label: 'Research' },
    { key: 'competitor_data', label: 'Competitor Analysis' },
    { key: 'brand_audit', label: 'Brand Audit' },
    { key: 'strategy_data', label: 'Strategy' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/operator/tenants/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <h1 className="text-2xl font-bold">Assessment</h1>
          <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700">{assessment.status}</span>
        </div>
        <div className="flex gap-2">
          {assessment.status === 'review' && !assessment.tea_approved && (
            <button onClick={approveAssessment} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              Approve
            </button>
          )}
          <a href={`/api/assessments/${assessment.id}/pdf`} className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Download PDF
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h3 className="font-semibold mb-3">Pipeline Progress</h3>
        <div className="space-y-2">
          {['research', 'competitor', 'brand', 'strategy'].map((type) => {
            const agent = agents.find((a: any) => a.agent_type === type);
            const status = agent?.status || 'pending';
            return (
              <div key={type} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'running' ? 'bg-yellow-500 animate-pulse' : status === 'failed' ? 'bg-red-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium capitalize w-24">{type}</span>
                <span className="text-xs text-gray-400">{status}</span>
                {agent?.tokens_used > 0 && <span className="text-xs text-gray-400 ml-auto">{agent.tokens_used.toLocaleString()} tokens</span>}
              </div>
            );
          })}
        </div>
      </div>

      {sections.map(({ key, label }) => {
        const data = assessment[key];
        if (!data) return null;
        return (
          <div key={key} className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-semibold mb-3">{label}</h3>
            <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
          </div>
        );
      })}

      {assessment.tokens_used > 0 && (
        <div className="text-xs text-gray-400 text-right">
          Tokens: {assessment.tokens_used?.toLocaleString()} | Cost: ${Number(assessment.cost_usd || 0).toFixed(2)}
        </div>
      )}
    </div>
  );
}
