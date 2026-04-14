'use client';

import { useState, useEffect } from 'react';
import CompetitorSection from '@/components/assessment/CompetitorSection';
import BrandAuditSection from '@/components/assessment/BrandAuditSection';
import StrategySection from '@/components/assessment/StrategySection';

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
    try {
      const res = await fetch(`/api/assessments/${assessment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tenant_approve' }),
      });
      if (!res.ok) { alert('Failed to approve strategy'); return; }
      if (tenantId) fetchAssessment(tenantId);
    } catch (e) { alert('Network error.'); }
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

      {assessment.brand_audit && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4">Brand Audit</h2>
          <BrandAuditSection data={assessment.brand_audit} />
        </div>
      )}

      {assessment.competitor_data && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4">Competitor Analysis</h2>
          <CompetitorSection data={assessment.competitor_data} />
        </div>
      )}

      {assessment.strategy_data && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4">Strategy</h2>
          <StrategySection data={assessment.strategy_data} />
        </div>
      )}
    </div>
  );
}
