'use client';

import SubBlockRerun from './SubBlockRerun';

export default function ResearchSection({ data, assessmentId, onRefresh }: { data: any; assessmentId?: string; onRefresh?: () => void }) {
  if (!data) return null;

  const bp = data.business_profile || {};
  const op = data.online_presence || {};
  const ratings = data.ratings || {};

  // Support both old (review_sentiment) and new (review_intelligence) structure
  const ri = data.review_intelligence || data.review_sentiment || {};
  const audience = data.target_audience || {};
  const contentAudit = data.content_audit || {};
  const market = data.market_context || {};
  const observations = data.initial_observations || [];

  // Normalise ratings — support old flat shape and new nested shape
  const mapsScore = ratings.google_maps?.score ?? ratings.rating ?? null;
  const totalReviews = ratings.google_maps?.total_reviews ?? ratings.total_reviews ?? null;

  const socialPlatforms = ['facebook', 'instagram', 'linkedin', 'tiktok'];

  return (
    <div className="space-y-6">

      {/* Business Profile */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Business Profile</h3>
          {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="business_profile" label="Profile" onComplete={onRefresh} />}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {bp.name && <InfoItem label="Business" value={bp.name} />}
          {bp.industry && <InfoItem label="Industry" value={bp.sub_category ? `${bp.industry} — ${bp.sub_category}` : bp.industry} />}
          {bp.city && <InfoItem label="Location" value={bp.neighborhood ? `${bp.neighborhood}, ${bp.city}` : bp.city} />}
          {bp.price_positioning && <InfoItem label="Positioning" value={bp.price_positioning} />}
          {bp.maturity_stage && <InfoItem label="Stage" value={bp.maturity_stage} />}
          {bp.contact && <InfoItem label="Contact" value={bp.contact} />}
          {bp.branches?.length > 0 && <InfoItem label="Branches" value={Array.isArray(bp.branches) ? bp.branches.join(', ') : bp.branches} />}
          {(bp.operating_hours?.weekday || bp.operating_hours?.weekend || typeof bp.operating_hours === 'string') && (
            <InfoItem
              label="Hours"
              value={typeof bp.operating_hours === 'string'
                ? bp.operating_hours
                : [bp.operating_hours?.weekday && `Weekdays: ${bp.operating_hours.weekday}`, bp.operating_hours?.weekend && `Weekends: ${bp.operating_hours.weekend}`].filter(Boolean).join(' · ')
              }
            />
          )}
        </div>
      </div>

      {/* Online Presence */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Online Presence</h3>
          {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="online_presence" label="Online Presence" onComplete={onRefresh} />}
        </div>

        {/* Website & GBP */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {op.website_assessment && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Website</p>
              <div className="space-y-1">
                <StatusPill label="Status" value={op.website_assessment.status} />
                {op.website_assessment.mobile_friendly != null && <StatusPill label="Mobile" value={op.website_assessment.mobile_friendly ? 'yes' : 'no'} />}
                {op.website_assessment.has_cta != null && <StatusPill label="Clear CTA" value={op.website_assessment.has_cta ? 'yes' : 'no'} />}
                {op.website_assessment.has_blog != null && <StatusPill label="Blog" value={op.website_assessment.has_blog ? 'yes' : 'no'} />}
                {op.website_assessment.has_booking != null && <StatusPill label="Booking" value={op.website_assessment.has_booking ? 'yes' : 'no'} />}
              </div>
            </div>
          )}
          {!op.website_assessment && op.website_status && (
            <InfoItem label="Website" value={op.website_status} />
          )}
          {op.gbp_assessment && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Google Business Profile</p>
              <div className="space-y-1">
                {op.gbp_assessment.claimed && <StatusPill label="Claimed" value={op.gbp_assessment.claimed} />}
                {op.gbp_assessment.posts_active != null && <StatusPill label="Posts active" value={op.gbp_assessment.posts_active ? 'yes' : 'no'} />}
                {op.gbp_assessment.qa_filled != null && <StatusPill label="Q&A filled" value={op.gbp_assessment.qa_filled ? 'yes' : 'no'} />}
              </div>
            </div>
          )}
        </div>

        {/* Social media — new structured format */}
        {op.social_media && typeof op.social_media === 'object' && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Social Media</p>
            <div className="space-y-2">
              {socialPlatforms.map((platform) => {
                const p = (op.social_media as any)[platform];
                if (!p) return null;
                // Old format: just a string status
                if (typeof p === 'string') {
                  return (
                    <div key={platform} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${p === 'active' ? 'bg-green-500' : p === 'inactive' ? 'bg-gray-300' : 'bg-yellow-400'}`} />
                      <span className="text-sm capitalize font-medium w-20">{platform}</span>
                      <span className="text-xs text-gray-400">{p}</span>
                    </div>
                  );
                }
                // New format: object with detail
                const hasDetail = p.follower_estimate || p.posts_per_week || p.last_post_date;
                if (!hasDetail && !p.url) return null;
                return (
                  <div key={platform} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm capitalize font-medium w-20 pt-0.5">{platform}</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {p.follower_estimate != null && <span className="text-xs text-gray-600">{p.follower_estimate.toLocaleString()} followers</span>}
                      {p.posts_per_week != null && <span className="text-xs text-gray-600">{p.posts_per_week}x/week</span>}
                      {p.last_post_date && <span className="text-xs text-gray-400">Last: {p.last_post_date}</span>}
                      {p.content_types_observed?.length > 0 && (
                        <span className="text-xs text-gray-400">{p.content_types_observed.join(', ')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivery platforms */}
        {op.delivery_platforms?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">Delivery / Booking Platforms</p>
            <div className="flex gap-2 flex-wrap">
              {op.delivery_platforms.map((p: string) => <span key={p} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">{p}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* Ratings + Review Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Rating + Velocity */}
        {mapsScore != null && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-3">Google Maps Rating</h3>
            <div className="flex items-end gap-4 mb-3">
              <div>
                <p className="text-4xl font-bold text-yellow-500">{mapsScore}<span className="text-lg text-gray-400">/5</span></p>
                {totalReviews != null && <p className="text-sm text-gray-500 mt-0.5">{totalReviews.toLocaleString()} reviews</p>}
              </div>
              {ri.review_velocity && (
                <div className="text-sm text-gray-500 space-y-0.5 pb-1">
                  <p><span className="font-medium text-gray-700">{ri.review_velocity.last_30_days}</span> in last 30 days</p>
                  <p><span className="font-medium text-gray-700">{ri.review_velocity.last_90_days}</span> in last 90 days</p>
                </div>
              )}
            </div>
            {ri.owner_response_rate != null && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${ri.owner_response_rate}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-32">
                  {ri.owner_response_rate}% owner responses
                  {ri.owner_response_quality && ri.owner_response_quality !== 'none' && ` (${ri.owner_response_quality})`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Sentiment */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Review Sentiment</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="review_sentiment" label="Sentiment" onComplete={onRefresh} />}
          </div>
          {ri.overall_sentiment && (
            <p className="text-sm mb-3">
              <span className="font-medium">Overall: </span>
              <span className={ri.overall_sentiment === 'positive' ? 'text-green-600' : ri.overall_sentiment === 'negative' ? 'text-red-600' : 'text-yellow-600'}>
                {ri.overall_sentiment}
              </span>
            </p>
          )}
          {ri.positive_themes?.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Positive</p>
              <div className="flex flex-wrap gap-1">
                {ri.positive_themes.map((t: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded">{t}</span>)}
              </div>
            </div>
          )}
          {ri.negative_themes?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Negative</p>
              <div className="flex flex-wrap gap-1">
                {ri.negative_themes.map((t: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded">{t}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verbatim Reviews */}
      {ri.verbatim_reviews?.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Customer Reviews</h3>
          <div className="space-y-3">
            {ri.verbatim_reviews.map((review: any, i: number) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={review.rating} />
                  {review.date && <span className="text-xs text-gray-400">{review.date}</span>}
                  {review.has_owner_response && <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">Owner replied</span>}
                </div>
                {review.text && <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Audience & Market */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Target Audience</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="target_audience" label="Target Audience" onComplete={onRefresh} />}
          </div>
          {audience.demographics && <p className="text-sm mb-2"><span className="text-gray-500">Demographics: </span>{audience.demographics}</p>}
          {audience.psychographics && <p className="text-sm mb-2"><span className="text-gray-500">Psychographics: </span>{audience.psychographics}</p>}
          {audience.behaviors && <p className="text-sm mb-2"><span className="text-gray-500">Behaviors: </span>{audience.behaviors}</p>}
          {audience.jobs_to_be_done?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Jobs to be done</p>
              <ul className="space-y-1">
                {audience.jobs_to_be_done.map((j: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2"><span className="text-blue-400">&#8226;</span>{j}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Market Context</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="market_context" label="Market" onComplete={onRefresh} />}
          </div>
          {market.city && <p className="text-sm mb-1"><span className="text-gray-500">City: </span>{market.city}</p>}
          {market.sector && <p className="text-sm mb-1"><span className="text-gray-500">Sector: </span>{market.sector}</p>}
          {market.market_size_estimate && <p className="text-sm mb-1"><span className="text-gray-500">Market Size: </span>{market.market_size_estimate}</p>}
          {market.growth_trend && <p className="text-sm mb-1"><span className="text-gray-500">Growth: </span>{market.growth_trend}</p>}
          {market.seasonality_patterns && <p className="text-sm"><span className="text-gray-500">Seasonality: </span>{market.seasonality_patterns}</p>}
        </div>
      </div>

      {/* Content Audit */}
      {(contentAudit.visual_identity_consistency || contentAudit.content_types_observed?.length > 0) && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-3">Current Content Audit</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {contentAudit.visual_identity_consistency && (
              <div>
                <p className="text-xs text-gray-500">Visual Identity</p>
                <span className={`text-sm font-medium ${contentAudit.visual_identity_consistency === 'strong' ? 'text-green-600' : contentAudit.visual_identity_consistency === 'absent' ? 'text-red-500' : 'text-yellow-600'}`}>
                  {contentAudit.visual_identity_consistency}
                </span>
              </div>
            )}
            {contentAudit.estimated_posting_frequency && (
              <InfoItem label="Posting Frequency" value={contentAudit.estimated_posting_frequency} />
            )}
            {contentAudit.content_types_observed?.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Content Types Observed</p>
                <div className="flex flex-wrap gap-1">
                  {contentAudit.content_types_observed.map((t: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Observations */}
      {observations.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Key Observations</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="research_data" block="initial_observations" label="Observations" onComplete={onRefresh} />}
          </div>
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

function StatusPill({ label, value }: { label: string; value: string }) {
  const positive = ['yes', 'exists', 'active', 'personalized'].includes(value);
  const negative = ['no', 'not_found', 'none'].includes(value);
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${positive ? 'bg-green-500' : negative ? 'bg-red-400' : 'bg-gray-300'}`} />
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3 h-3 ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}
