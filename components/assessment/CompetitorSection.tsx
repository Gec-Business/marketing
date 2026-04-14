'use client';

import SubBlockRerun from './SubBlockRerun';

export default function CompetitorSection({ data, assessmentId, onRefresh }: { data: any; assessmentId?: string; onRefresh?: () => void }) {
  if (!data) return null;
  const competitors = data.competitors || [];
  const segments = data.market_segments || [];
  const position = data.tenant_position || {};
  const threats = data.competitive_threats || [];
  const opportunities = data.opportunities || [];

  return (
    <div className="space-y-6">
      {/* Competitor Cards */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg">Competitors ({competitors.length})</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="competitors" label="Competitors" onComplete={onRefresh} />}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((c: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{c.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.geographic_overlap === 'high' ? 'bg-red-100 text-red-700' : c.geographic_overlap === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {c.geographic_overlap || 'unknown'} overlap
                  </span>
                </div>
                <div className="flex gap-2 mb-2">
                  {c.type && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded capitalize">{c.type}</span>}
                  {c.price_positioning && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded capitalize">{c.price_positioning}</span>}
                  {c.estimated_branches && <span className="text-xs text-gray-400">{c.estimated_branches} locations</span>}
                </div>
                {c.strengths?.length > 0 && (
                  <div className="mb-1">
                    <span className="text-xs text-gray-500">Strengths: </span>
                    <span className="text-xs text-green-700">{c.strengths.join(', ')}</span>
                  </div>
                )}
                {c.weaknesses?.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">Weaknesses: </span>
                    <span className="text-xs text-red-700">{c.weaknesses.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Position */}
      {position.segment && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">Your Competitive Position</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="tenant_position" label="Position" onComplete={onRefresh} />}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {position.segment && <div><p className="text-xs text-gray-500">Segment</p><p className="text-sm font-medium">{position.segment}</p></div>}
            {position.rank_estimate && <div><p className="text-xs text-gray-500">Estimated Rank</p><p className="text-sm font-medium">#{position.rank_estimate}</p></div>}
            {position.geographic_advantage && <div className="col-span-2"><p className="text-xs text-gray-500">Geographic Advantage</p><p className="text-sm font-medium">{position.geographic_advantage}</p></div>}
          </div>
          {position.competitive_advantages?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Competitive Advantages</p>
              <div className="flex flex-wrap gap-2">{position.competitive_advantages.map((a: string, i: number) => <span key={i} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">{a}</span>)}</div>
            </div>
          )}
          {position.differentiation_gaps?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Gaps to Address</p>
              <div className="flex flex-wrap gap-2">{position.differentiation_gaps.map((g: string, i: number) => <span key={i} className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">{g}</span>)}</div>
            </div>
          )}
        </div>
      )}

      {/* Threats & Opportunities */}
      <div className="grid grid-cols-2 gap-4">
        {threats.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">Threats</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="competitive_threats" label="Threats" onComplete={onRefresh} />}</div>
            <div className="space-y-2">
              {threats.map((t: any, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded mt-0.5 ${t.probability === 'high' ? 'bg-red-100 text-red-700' : t.probability === 'moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {t.probability}
                  </span>
                  <span className="text-sm">{t.threat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {opportunities.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">Opportunities</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="opportunities" label="Opportunities" onComplete={onRefresh} />}</div>
            <ul className="space-y-2">
              {opportunities.map((o: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  <span>{typeof o === 'string' ? o : (o as any).opportunity || JSON.stringify(o)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
