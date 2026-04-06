'use client';

import { useState, useEffect } from 'react';

export default function StrategyPage() {
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user?.tenant_id) {
        setTenantId(d.user.tenant_id);
        fetchAssessment(d.user.tenant_id);
      }
    });
  }, []);

  async function fetchAssessment(tid: string) {
    const res = await fetch(`/api/assessments?tenant_id=${tid}`);
    const data = await res.json();
    setAssessment(data.assessment);
    setLoading(false);
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-2">Strategy</h1>
        <p className="text-gray-500">Your strategy documents are being prepared. Check back soon.</p>
      </div>
    );
  }

  async function approveStrategy() {
    await fetch(`/api/assessments/${assessment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tenant_approve' }),
    });
    if (tenantId) fetchAssessment(tenantId);
  }

  const sections = [
    { key: 'brand_audit', label: 'Brand Audit', desc: 'CBBE scores, SWOT analysis, brand assessment' },
    { key: 'competitor_data', label: 'Competitor Analysis', desc: 'Market landscape and competitive positioning' },
    { key: 'strategy_data', label: 'Strategy', desc: 'Strategic framework, channel strategy, action plan' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Strategy & Assessment</h1>
        <div className="flex gap-2">
          {assessment.tea_approved && !assessment.tenant_approved && (
            <button onClick={approveStrategy} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              Approve Strategy
            </button>
          )}
          <a href={`/api/assessments/${assessment.id}/pdf`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Download PDF
          </a>
        </div>
      </div>

      {sections.map(({ key, label, desc }) => {
        const data = assessment[key];
        if (!data) return null;
        return (
          <div key={key} className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-semibold">{label}</h3>
            <p className="text-xs text-gray-400 mb-3">{desc}</p>
            <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
          </div>
        );
      })}
    </div>
  );
}
