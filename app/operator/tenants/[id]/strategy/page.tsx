'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function OperatorStrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAssessment(); }, []);

  async function fetchAssessment() {
    try {
      const res = await fetch(`/api/assessments?tenant_id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAssessment(data.assessment);
    } catch (e) {
      console.error('Fetch assessment error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <Link href={`/operator/tenants/${id}`} className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">&larr; Back</Link>
        <h2 className="text-xl font-bold mb-2">No Strategy Yet</h2>
        <p className="text-gray-500">Run the assessment first to generate a strategy.</p>
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
          <h1 className="text-2xl font-bold">Strategy</h1>
          <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700">{assessment.status}</span>
        </div>
        <div className="flex gap-2">
          {assessment.tea_approved && <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Tea Approved</span>}
          {assessment.tenant_approved && <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Tenant Approved</span>}
          <a href={`/api/assessments/${assessment.id}/pdf`} className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Download PDF
          </a>
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
    </div>
  );
}
