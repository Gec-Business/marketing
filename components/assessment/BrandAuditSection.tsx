'use client';

export default function BrandAuditSection({ data }: { data: any }) {
  if (!data) return null;
  const cbbe = data.cbbe_scores || {};
  const prism = data.kapferer_prism || {};
  const swot = data.swot || {};
  const reputation = data.online_reputation_score || {};
  const socialAudit = data.social_media_audit || {};
  const findings = data.key_findings || [];
  const actions = data.priority_actions || [];

  return (
    <div className="space-y-6">
      {/* CBBE Scores */}
      {Object.keys(cbbe).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Brand Equity Scores (CBBE Model)</h3>
          <div className="space-y-3">
            {Object.entries(cbbe).map(([key, val]: [string, any]) => {
              if (!val || typeof val !== 'object') return null;
              const pct = val.max > 0 ? (val.score / val.max) * 100 : 0;
              const statusColor = val.status === 'strong' ? 'bg-green-500' : val.status === 'moderate' ? 'bg-yellow-500' : val.status === 'weak' ? 'bg-orange-500' : 'bg-red-500';
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm text-gray-500">{val.score}/{val.max}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`${statusColor} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className={`text-xs capitalize ${val.status === 'strong' ? 'text-green-600' : val.status === 'moderate' ? 'text-yellow-600' : val.status === 'weak' ? 'text-orange-600' : 'text-red-600'}`}>{val.status}</span>
                    {val.notes && <span className="text-xs text-gray-400">{val.notes}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SWOT Analysis */}
      {(swot.strengths?.length > 0 || swot.weaknesses?.length > 0 || swot.opportunities?.length > 0 || swot.threats?.length > 0) && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">SWOT Analysis</h3>
          <div className="grid grid-cols-2 gap-3">
            <SwotQuadrant title="Strengths" items={swot.strengths} color="green" />
            <SwotQuadrant title="Weaknesses" items={swot.weaknesses} color="red" />
            <SwotQuadrant title="Opportunities" items={swot.opportunities} color="blue" />
            <SwotQuadrant title="Threats" items={swot.threats} color="orange" />
          </div>
        </div>
      )}

      {/* Kapferer Prism */}
      {Object.keys(prism).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Brand Identity Prism</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(prism).map(([key, val]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm">{String(val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Reputation + Social Audit */}
      <div className="grid grid-cols-2 gap-4">
        {reputation.score !== undefined && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <h3 className="font-semibold text-lg mb-3">Online Reputation</h3>
            <p className="text-5xl font-bold" style={{ color: reputation.score >= 70 ? '#16a34a' : reputation.score >= 40 ? '#ca8a04' : '#dc2626' }}>
              {reputation.score}<span className="text-lg text-gray-400">/{reputation.max || 100}</span>
            </p>
          </div>
        )}
        {socialAudit.content_quality_score !== undefined && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <h3 className="font-semibold text-lg mb-3">Content Quality</h3>
            <p className="text-5xl font-bold" style={{ color: socialAudit.content_quality_score >= 70 ? '#16a34a' : socialAudit.content_quality_score >= 40 ? '#ca8a04' : '#dc2626' }}>
              {socialAudit.content_quality_score}<span className="text-lg text-gray-400">/100</span>
            </p>
            {socialAudit.posting_consistency && <p className="text-sm text-gray-500 mt-2">{socialAudit.posting_consistency}</p>}
          </div>
        )}
      </div>

      {/* Priority Actions */}
      {actions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Priority Actions</h3>
          <div className="space-y-3">
            {actions.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.action}</p>
                  <div className="flex gap-2 mt-1">
                    {a.timeframe && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{a.timeframe}</span>}
                    {a.impact && <span className={`text-xs px-2 py-0.5 rounded ${a.impact === 'high' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>Impact: {a.impact}</span>}
                    {a.effort && <span className={`text-xs px-2 py-0.5 rounded ${a.effort === 'low' ? 'bg-green-50 text-green-700' : a.effort === 'high' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>Effort: {a.effort}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {findings.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-3">Key Findings</h3>
          <ul className="space-y-2">
            {findings.map((f: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm"><span className="text-blue-500">&#8226;</span><span>{f}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SwotQuadrant({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items?.length) return <div />;
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
    red: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  };
  const c = colors[color] || colors.green;
  return (
    <div className={`${c.bg} ${c.border} border rounded-lg p-4`}>
      <h4 className={`text-sm font-semibold ${c.text} mb-2`}>{title}</h4>
      <ul className="space-y-1">
        {items.map((item, i) => <li key={i} className={`text-xs ${c.text}`}>&#8226; {item}</li>)}
      </ul>
    </div>
  );
}
