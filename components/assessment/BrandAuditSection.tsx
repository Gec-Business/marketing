'use client';

import SubBlockRerun from './SubBlockRerun';

const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'linkedin'] as const;

export default function BrandAuditSection({ data, assessmentId, onRefresh }: { data: any; assessmentId?: string; onRefresh?: () => void }) {
  if (!data) return null;

  const identity = data.brand_identity_assessment || null;
  const cbbe = data.cbbe_scores || {};
  const prism = data.kapferer_prism || {};
  const swot = data.swot || {};
  // Support both old online_reputation_score and new reputation_score
  const reputation = data.reputation_score || data.online_reputation_score || {};
  const socialAudit = data.social_media_audit || {};
  const brandVoice = data.brand_voice_assessment || null;
  const findings = data.key_findings || [];
  const actions = data.priority_actions || [];

  const cbbeDimensions = ['identity', 'meaning', 'response', 'resonance'];

  return (
    <div className="space-y-6">

      {/* Brand Identity Assessment */}
      {identity && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Brand Identity Assessment</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="brand_identity_assessment" label="Identity" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <BoolItem label="Visual identity exists" value={identity.visual_identity_exists} />
            <BoolItem label="Applied consistently" value={identity.applied_consistently} />
            <BoolItem label="Matches positioning" value={identity.matches_positioning} />
            {identity.brand_name_assessment && (
              <>
                <RatingItem label="Name clarity" value={identity.brand_name_assessment.clarity} />
                <RatingItem label="Memorability" value={identity.brand_name_assessment.memorability} />
                <RatingItem label="Local relevance" value={identity.brand_name_assessment.local_relevance} />
              </>
            )}
          </div>
        </div>
      )}

      {/* CBBE Scores */}
      {Object.keys(cbbe).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Brand Equity (CBBE Model)</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="cbbe_scores" label="CBBE" onComplete={onRefresh} />}
          </div>

          {/* Total with maturity label */}
          {cbbe.total && (
            <div className="flex items-center gap-4 mb-5 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: scoreColor(cbbe.total.percentage ?? 0) }}>
                  {cbbe.total.percentage ?? Math.round((cbbe.total.score / cbbe.total.max) * 100)}%
                </p>
                <p className="text-xs text-gray-500">{cbbe.total.score}/{cbbe.total.max}</p>
              </div>
              {cbbe.total.maturity_label && (
                <div>
                  <p className="text-sm font-semibold text-gray-800">{cbbe.total.maturity_label}</p>
                  <p className="text-xs text-gray-400">Overall brand maturity</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {cbbeDimensions.map((key) => {
              const val = cbbe[key];
              if (!val || typeof val !== 'object') return null;
              const pct = val.max > 0 ? (val.score / val.max) * 100 : 0;
              const barColor = val.status === 'strong' ? 'bg-green-500' : val.status === 'moderate' ? 'bg-yellow-500' : val.status === 'weak' ? 'bg-orange-500' : 'bg-red-500';
              const textColor = val.status === 'strong' ? 'text-green-600' : val.status === 'moderate' ? 'text-yellow-600' : val.status === 'weak' ? 'text-orange-600' : 'text-red-600';
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{key}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs capitalize ${textColor}`}>{val.status}</span>
                      <span className="text-sm text-gray-500">{val.score}/{val.max}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${barColor} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  {val.notes && <p className="text-xs text-gray-400 mt-0.5">{val.notes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SWOT */}
      {(swot.strengths?.length > 0 || swot.weaknesses?.length > 0 || swot.opportunities?.length > 0 || swot.threats?.length > 0) && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">SWOT Analysis</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="swot" label="SWOT" onComplete={onRefresh} />}
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Brand Identity Prism (Kapferer)</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="kapferer_prism" label="Prism" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(prism).map(([key, val]: [string, any]) => {
              // Support both old (string) and new (object with description + status)
              const description = typeof val === 'string' ? val : val?.description || '';
              const status = typeof val === 'object' ? val?.status : null;
              return (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                    {status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        status === 'strong' ? 'bg-green-100 text-green-700' :
                        status === 'absent' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{status}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reputation Score + Social Audit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Reputation Score */}
        {(reputation.total !== undefined || reputation.score !== undefined) && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Online Reputation</h3>
              {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="reputation_score" label="Reputation" onComplete={onRefresh} />}
            </div>

            {/* New structured format */}
            {reputation.rating_quality !== undefined ? (
              <>
                <div className="text-center mb-4">
                  <p className="text-5xl font-bold" style={{ color: scoreColor(reputation.total) }}>
                    {reputation.total}
                  </p>
                  <p className="text-xs text-gray-400">out of 100</p>
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'rating_quality', label: 'Rating Quality', max: 30 },
                    { key: 'review_volume', label: 'Review Volume', max: 20 },
                    { key: 'social_proof', label: 'Social Proof', max: 25 },
                    { key: 'search_visibility', label: 'Search Visibility', max: 25 },
                  ].map(({ key, label, max }) => {
                    const component = reputation[key];
                    if (!component) return null;
                    const pct = (component.score / max) * 100;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-600">{label}</span>
                          <span className="text-gray-500">{component.score}/{max}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        {component.notes && <p className="text-xs text-gray-400 mt-0.5">{component.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Old flat format fallback */
              <div className="text-center">
                <p className="text-5xl font-bold" style={{ color: scoreColor(reputation.score) }}>
                  {reputation.score}<span className="text-lg text-gray-400">/{reputation.max || 100}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Brand Voice */}
        {brandVoice && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Brand Voice</h3>
              {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="brand_voice_assessment" label="Brand Voice" onComplete={onRefresh} />}
            </div>
            {brandVoice.current_tone && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-0.5">Current tone</p>
                <p className="text-sm font-medium">{brandVoice.current_tone}</p>
              </div>
            )}
            {brandVoice.consistency_rating && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-0.5">Consistency</p>
                <span className={`text-sm font-medium ${
                  brandVoice.consistency_rating === 'strong' ? 'text-green-600' :
                  brandVoice.consistency_rating === 'absent' ? 'text-red-500' :
                  'text-yellow-600'
                }`}>{brandVoice.consistency_rating}</span>
              </div>
            )}
            {brandVoice.intended_vs_actual_gap && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Gap: intended vs. actual</p>
                <p className="text-sm text-gray-700">{brandVoice.intended_vs_actual_gap}</p>
              </div>
            )}
          </div>
        )}

        {/* Old content quality fallback when brand_voice not present and old format */}
        {!brandVoice && socialAudit.content_quality_score !== undefined && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Content Quality</h3>
              {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="social_media_audit" label="Content Quality" onComplete={onRefresh} />}
            </div>
            <p className="text-5xl font-bold" style={{ color: scoreColor(socialAudit.content_quality_score) }}>
              {socialAudit.content_quality_score}<span className="text-lg text-gray-400">/100</span>
            </p>
            {socialAudit.posting_consistency && <p className="text-sm text-gray-500 mt-2">{socialAudit.posting_consistency}</p>}
          </div>
        )}
      </div>

      {/* Social Media Audit — per platform */}
      {socialAudit.platforms && Object.keys(socialAudit.platforms).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Social Media Audit</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="social_media_audit" label="Social Audit" onComplete={onRefresh} />}
          </div>
          {(socialAudit.overall_content_quality_score || socialAudit.overall_posting_consistency) && (
            <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              {socialAudit.overall_content_quality_score > 0 && (
                <span>Overall quality: <strong style={{ color: scoreColor(socialAudit.overall_content_quality_score * 10) }}>{socialAudit.overall_content_quality_score}/10</strong></span>
              )}
              {socialAudit.overall_posting_consistency && (
                <span className="text-gray-500">{socialAudit.overall_posting_consistency}</span>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PLATFORMS.map((platform) => {
              const p = socialAudit.platforms[platform];
              if (!p) return null;
              const hasData = p.content_quality_score || p.follower_estimate || p.biggest_gap;
              if (!hasData) return null;
              return (
                <div key={platform} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold capitalize">{platform}</p>
                    {p.content_quality_score > 0 && (
                      <span className="text-xs font-medium" style={{ color: scoreColor(p.content_quality_score * 10) }}>
                        {p.content_quality_score}/10
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-2">
                    {p.follower_estimate != null && <span>{p.follower_estimate.toLocaleString()} followers</span>}
                    {p.posts_per_week != null && <span>{p.posts_per_week}x/week</span>}
                    {p.engagement_rate_estimate && <span>{p.engagement_rate_estimate} eng.</span>}
                    {p.posting_consistency && <span>{p.posting_consistency}</span>}
                  </div>
                  {p.content_types?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.content_types.map((t: string, i: number) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{t}</span>
                      ))}
                    </div>
                  )}
                  {p.biggest_gap && (
                    <p className="text-xs text-orange-600 flex gap-1">
                      <span className="shrink-0">&#9888;</span>
                      <span>{p.biggest_gap}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Priority Actions */}
      {actions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Priority Actions</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="priority_actions" label="Actions" onComplete={onRefresh} />}
          </div>
          <div className="space-y-3">
            {actions.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{a.action}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.timeframe && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{a.timeframe}</span>}
                    {a.impact && <span className={`text-xs px-2 py-0.5 rounded ${a.impact === 'high' ? 'bg-green-50 text-green-700' : a.impact === 'medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>Impact: {a.impact}</span>}
                    {a.effort && <span className={`text-xs px-2 py-0.5 rounded ${a.effort === 'low' ? 'bg-green-50 text-green-700' : a.effort === 'high' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>Effort: {a.effort}</span>}
                    {a.owner && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">&#8594; {a.owner}</span>}
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Key Findings</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="brand_audit" block="key_findings" label="Findings" onComplete={onRefresh} />}
          </div>
          <ul className="space-y-2">
            {findings.map((f: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-blue-500 shrink-0">&#8226;</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function scoreColor(pct: number): string {
  if (pct >= 70) return '#16a34a';
  if (pct >= 40) return '#ca8a04';
  return '#dc2626';
}

function BoolItem({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {value === null || value === undefined ? (
        <span className="text-xs text-gray-400">—</span>
      ) : (
        <span className={`text-sm font-medium ${value ? 'text-green-600' : 'text-red-500'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      )}
    </div>
  );
}

function RatingItem({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <span className={`text-sm font-medium ${value === 'high' ? 'text-green-600' : value === 'low' ? 'text-red-500' : 'text-yellow-600'}`}>
        {value}
      </span>
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
