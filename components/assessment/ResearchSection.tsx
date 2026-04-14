'use client';

import SubBlockRerun from './SubBlockRerun';

export default function ResearchSection({ data, assessmentId, onRefresh }: { data: any; assessmentId?: string; onRefresh?: () => void }) {
  if (!data) return null;
  const bp = data.business_profile || {};
  const op = data.online_presence || {};
  const ratings = data.ratings || {};
  const sentiment = data.review_sentiment || {};
  const audience = data.target_audience || {};
  const market = data.market_context || {};
  const observations = data.initial_observations || [];

  return (
    <div className="space-y-6">
      {/* Business Profile */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg">Business Profile</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="business_profile" label="Profile" onComplete={onRefresh} />}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {bp.name && <InfoItem label="Business" value={bp.name} />}
          {bp.industry && <InfoItem label="Industry" value={bp.industry} />}
          {bp.city && <InfoItem label="City" value={bp.city} />}
          {bp.operating_hours && <InfoItem label="Hours" value={bp.operating_hours} />}
          {bp.contact && <InfoItem label="Contact" value={bp.contact} />}
          {bp.branches && <InfoItem label="Branches" value={Array.isArray(bp.branches) ? bp.branches.join(', ') : bp.branches} />}
        </div>
      </div>

      {/* Online Presence */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg">Online Presence</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="online_presence" label="Online Presence" onComplete={onRefresh} />}</div>
        <div className="grid grid-cols-2 gap-4">
          {op.website_status && <InfoItem label="Website" value={op.website_status} />}
          {op.social_media && typeof op.social_media === 'object' && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-2">Social Media</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(op.social_media).map(([platform, status]) => (
                  <span key={platform} className={`text-xs px-3 py-1 rounded-full capitalize ${status === 'active' ? 'bg-green-100 text-green-700' : status === 'inactive' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                    {platform}: {String(status)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {op.delivery_platforms && Array.isArray(op.delivery_platforms) && op.delivery_platforms.length > 0 && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Delivery Platforms</p>
              <div className="flex gap-2">{op.delivery_platforms.map((p: string) => <span key={p} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">{p}</span>)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Ratings & Sentiment */}
      {(ratings.rating || sentiment.overall_sentiment) && (
        <div className="grid grid-cols-2 gap-4">
          {ratings.rating && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-3">Ratings</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-yellow-500">{ratings.rating}<span className="text-lg text-gray-400">/5</span></p>
                {ratings.total_reviews && <p className="text-sm text-gray-500 mt-1">{ratings.total_reviews} reviews</p>}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">Review Sentiment</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="review_sentiment" label="Sentiment" onComplete={onRefresh} />}</div>
            {sentiment.overall_sentiment && <p className="text-sm mb-3"><span className="font-medium">Overall:</span> <span className={sentiment.overall_sentiment === 'positive' ? 'text-green-600' : sentiment.overall_sentiment === 'negative' ? 'text-red-600' : 'text-yellow-600'}>{sentiment.overall_sentiment}</span></p>}
            {sentiment.positive_themes?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">Positive Themes</p>
                <div className="flex flex-wrap gap-1">{sentiment.positive_themes.map((t: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded">{t}</span>)}</div>
              </div>
            )}
            {sentiment.negative_themes?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Negative Themes</p>
                <div className="flex flex-wrap gap-1">{sentiment.negative_themes.map((t: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded">{t}</span>)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Target Audience & Market */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">Target Audience</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="target_audience" label="Target Audience" onComplete={onRefresh} />}</div>
          {audience.demographics && <p className="text-sm mb-2"><span className="text-gray-500">Demographics:</span> {audience.demographics}</p>}
          {audience.psychographics && <p className="text-sm mb-2"><span className="text-gray-500">Psychographics:</span> {audience.psychographics}</p>}
          {audience.behaviors && <p className="text-sm"><span className="text-gray-500">Behaviors:</span> {audience.behaviors}</p>}
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">Market Context</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="market_context" label="Market" onComplete={onRefresh} />}</div>
          {market.city && <p className="text-sm mb-1"><span className="text-gray-500">City:</span> {market.city}</p>}
          {market.sector && <p className="text-sm mb-1"><span className="text-gray-500">Sector:</span> {market.sector}</p>}
          {market.market_size_estimate && <p className="text-sm mb-1"><span className="text-gray-500">Market Size:</span> {market.market_size_estimate}</p>}
          {market.growth_trend && <p className="text-sm"><span className="text-gray-500">Growth:</span> {market.growth_trend}</p>}
        </div>
      </div>

      {/* Key Observations */}
      {observations.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">Key Observations</h3>{assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="initial_observations" label="Observations" onComplete={onRefresh} />}</div>
          <ul className="space-y-2">
            {observations.map((obs: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-blue-500 mt-0.5">&#8226;</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
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
