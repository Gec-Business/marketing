'use client';

import SubBlockRerun from './SubBlockRerun';
import CompetitorEditor from './CompetitorEditor';

const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'linkedin'] as const;

export default function CompetitorSection({ data, assessmentId, onRefresh }: { data: any; assessmentId?: string; onRefresh?: () => void }) {
  if (!data) return null;

  const competitors = data.competitors || [];
  const segments = data.market_segments || [];
  const marketMap = data.market_map || null;
  const position = data.tenant_position || {};
  const threats = data.competitive_threats || [];
  const opportunities = data.opportunities || [];
  const bestInClass = data.best_in_class || null;

  return (
    <div className="space-y-6">

      {/* Competitor Cards */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Competitors ({competitors.length})</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="competitors" label="Competitors" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((c: any, i: number) => (
              <CompetitorCard key={i} c={c} />
            ))}
          </div>
          {assessmentId && onRefresh && (
            <CompetitorEditor assessmentId={assessmentId} competitors={competitors} onUpdate={onRefresh} />
          )}
        </div>
      )}

      {competitors.length === 0 && assessmentId && onRefresh && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Competitors</h3>
          <p className="text-gray-500 text-sm mb-4">No competitors found. Add manually or re-run the competitor analysis.</p>
          <CompetitorEditor assessmentId={assessmentId} competitors={[]} onUpdate={onRefresh} />
        </div>
      )}

      {/* Market Map */}
      {marketMap && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Market Map</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="market_map" label="Market Map" onComplete={onRefresh} />}
          </div>
          {marketMap.description && <p className="text-sm text-gray-600 mb-4">{marketMap.description}</p>}
          {marketMap.price_tiers?.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {marketMap.price_tiers.map((tier: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-1 capitalize">{tier.tier}</p>
                  <div className="space-y-0.5">
                    {tier.players?.map((p: string, j: number) => (
                      <p key={j} className="text-xs text-gray-700">{p}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketMap.client_position && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Our Position</p>
                <p className="text-sm text-blue-700 font-medium">{marketMap.client_position}</p>
              </div>
            )}
            {marketMap.white_space?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">White Space (unoccupied)</p>
                <ul className="space-y-1">
                  {marketMap.white_space.map((w: string, i: number) => (
                    <li key={i} className="text-xs text-green-700 flex gap-1"><span>&#10003;</span>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Market Segments */}
      {segments.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Market Segments</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="market_segments" label="Segments" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {segments.map((s: any, i: number) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  {s.estimated_share && <span className="text-xs text-gray-500">{s.estimated_share}</span>}
                </div>
                {s.price_range && <p className="text-xs text-gray-500 mb-1">{s.price_range}</p>}
                {s.key_players?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.key_players.map((p: string, j: number) => (
                      <span key={j} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Position */}
      {position.segment && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Our Competitive Position</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="tenant_position" label="Position" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {position.segment && <InfoItem label="Segment" value={position.segment} />}
            {position.rank_estimate && <InfoItem label="Estimated Rank" value={`#${position.rank_estimate}`} />}
            {position.geographic_advantage && <div className="col-span-2"><InfoItem label="Geographic Advantage" value={position.geographic_advantage} /></div>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {position.competitive_advantages?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Advantages</p>
                <div className="flex flex-wrap gap-2">
                  {position.competitive_advantages.map((a: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {position.differentiation_gaps?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Gaps to Address</p>
                <div className="flex flex-wrap gap-2">
                  {position.differentiation_gaps.map((g: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">{g}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Threats & Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {threats.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Threats</h3>
              {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="competitive_threats" label="Threats" onComplete={onRefresh} />}
            </div>
            <div className="space-y-3">
              {threats.map((t: any, i: number) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 mt-0.5 ${t.probability === 'high' ? 'bg-red-100 text-red-700' : t.probability === 'moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                      {t.probability}
                    </span>
                    {t.impact && (
                      <span className={`text-xs px-2 py-0.5 rounded shrink-0 mt-0.5 ${t.impact === 'high' ? 'bg-red-50 text-red-600' : t.impact === 'medium' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                        {t.impact} impact
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mb-1">{t.threat}</p>
                  {t.mitigation && (
                    <p className="text-xs text-blue-600 flex gap-1 mt-1">
                      <span className="shrink-0">&#8594;</span>
                      <span>{t.mitigation}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {opportunities.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Opportunities</h3>
              {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="opportunities" label="Opportunities" onComplete={onRefresh} />}
            </div>
            <ul className="space-y-2">
              {opportunities.map((o: any, i: number) => {
                const text = typeof o === 'string' ? o : (o.description || o.opportunity || JSON.stringify(o));
                const type = typeof o === 'object' ? o.type : null;
                return (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-green-500 mt-0.5 shrink-0">&#10003;</span>
                    <div>
                      {type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded mr-1 ${
                          type === 'audience' ? 'bg-purple-50 text-purple-600' :
                          type === 'content_format' ? 'bg-blue-50 text-blue-600' :
                          type === 'channel' ? 'bg-teal-50 text-teal-600' :
                          'bg-orange-50 text-orange-600'
                        }`}>{type.replace('_', ' ')}</span>
                      )}
                      <span>{text}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Best in Class */}
      {bestInClass?.name && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg text-blue-900">Best-in-Class Benchmark</h3>
              <p className="text-xs text-blue-600">The strongest social media performer in this market</p>
            </div>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="competitor_data" block="best_in_class" label="Best-in-Class" onComplete={onRefresh} />}
          </div>
          <p className="text-base font-bold text-blue-800 mb-2">{bestInClass.name}</p>
          {bestInClass.why_they_win && (
            <p className="text-sm text-blue-700 mb-3">{bestInClass.why_they_win}</p>
          )}
          {bestInClass.top_3_tactics_to_adapt?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Tactics to adapt</p>
              <ul className="space-y-1">
                {bestInClass.top_3_tactics_to_adapt.map((t: string, i: number) => (
                  <li key={i} className="text-sm text-blue-800 flex gap-2">
                    <span className="text-blue-400 shrink-0">{i + 1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompetitorCard({ c }: { c: any }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">{c.name}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full ${c.geographic_overlap === 'high' ? 'bg-red-100 text-red-700' : c.geographic_overlap === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
          {c.geographic_overlap || 'unknown'} overlap
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {c.type && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded capitalize">{c.type}</span>}
        {c.price_positioning && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded capitalize">{c.price_positioning}</span>}
        {c.estimated_rating && <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded">★ {c.estimated_rating}</span>}
        {c.estimated_branches > 0 && <span className="text-xs text-gray-400">{c.estimated_branches} locations</span>}
      </div>

      {/* Social media — handle both old (string) and new (object) formats */}
      {c.social_media_presence && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1">Social presence</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => {
              const p = c.social_media_presence[platform];
              if (!p) return null;
              const status = typeof p === 'string' ? p : p.status;
              if (!status || status === 'unknown') return null;
              const isActive = status === 'active';
              return (
                <div key={platform} className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-xs capitalize text-gray-500">{platform}</span>
                  {typeof p === 'object' && p.followers_estimate != null && (
                    <span className="text-xs text-gray-400">({p.followers_estimate.toLocaleString()})</span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Top platform detail for new format */}
          {PLATFORMS.map((platform) => {
            const p = c.social_media_presence[platform];
            if (!p || typeof p !== 'object') return null;
            if (!p.top_content_format && !p.posts_per_week) return null;
            if (p.status !== 'active') return null;
            return (
              <div key={platform} className="mt-1 text-xs text-gray-400 flex gap-2">
                <span className="capitalize">{platform}:</span>
                {p.posts_per_week != null && <span>{p.posts_per_week}x/wk</span>}
                {p.top_content_format && <span>{p.top_content_format}</span>}
                {p.engagement_level && <span className={p.engagement_level === 'high' ? 'text-green-600' : p.engagement_level === 'medium' ? 'text-yellow-600' : 'text-gray-400'}>{p.engagement_level} eng.</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Direct comparison — new fields */}
      {c.better_than_client?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-0.5">They do better:</p>
          <p className="text-xs text-red-600">{c.better_than_client.join(', ')}</p>
        </div>
      )}
      {c.worse_than_client?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-0.5">We do better:</p>
          <p className="text-xs text-green-600">{c.worse_than_client.join(', ')}</p>
        </div>
      )}

      {/* Strengths / Weaknesses */}
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
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
