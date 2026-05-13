'use client';

import SubBlockRerun from './SubBlockRerun';

const OWNER_COLORS: Record<string, string> = {
  Tea: 'bg-blue-50 text-blue-700',
  client: 'bg-purple-50 text-purple-700',
  designer: 'bg-pink-50 text-pink-700',
  external: 'bg-gray-100 text-gray-600',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  'requires crew': 'bg-red-100 text-red-700',
};

const IMPACT_COLORS: Record<string, string> = {
  awareness: 'bg-blue-50 text-blue-600',
  engagement: 'bg-green-50 text-green-600',
  conversion: 'bg-orange-50 text-orange-600',
};

export default function StrategySection({ data, assessmentId, onRefresh }: { data: any; assessmentId?: string; onRefresh?: () => void }) {
  if (!data) return null;

  const framework = data.strategic_framework || {};
  const personas = data.audience_personas || [];
  const channelStrategy = data.channel_strategy || {};
  const messaging = data.messaging_strategy || {};
  const visualDirection = data.visual_direction || null;
  const actionPlan = data.action_plan || {};
  const videoIdeas = data.video_ideas || [];
  const innovations = data.disruptive_innovations || [];

  return (
    <div className="space-y-6">

      {/* Positioning Statement + Brand Promise */}
      {(framework.positioning_statement || framework.brand_promise) && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Brand Positioning</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="strategic_framework" label="Positioning" onComplete={onRefresh} />}
          </div>
          {framework.positioning_statement && (
            <p className="text-base font-medium leading-relaxed mb-3 text-white/95">
              &ldquo;{framework.positioning_statement}&rdquo;
            </p>
          )}
          {framework.brand_promise && (
            <div className="border-t border-white/20 pt-3">
              <p className="text-xs font-semibold uppercase text-blue-200 mb-1">Brand Promise</p>
              <p className="text-sm text-white/90">{framework.brand_promise}</p>
            </div>
          )}
        </div>
      )}

      {/* Vision & Mission */}
      {(framework.vision || framework.mission) && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Strategic Framework</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="strategic_framework" label="Framework" onComplete={onRefresh} />}
          </div>
          {framework.vision && (
            <div className="mb-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Vision</p>
              <p className="text-sm text-blue-900">{framework.vision}</p>
            </div>
          )}
          {framework.mission && (
            <div className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
              <p className="text-xs text-indigo-600 font-semibold uppercase mb-1">Mission</p>
              <p className="text-sm text-indigo-900">{framework.mission}</p>
            </div>
          )}
        </div>
      )}

      {/* Strategic Pillars */}
      {framework.strategic_pillars?.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Strategic Pillars</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="strategic_framework" label="Pillars" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {framework.strategic_pillars.map((p: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 border-t-4 border-blue-500">
                <h4 className="font-semibold text-sm mb-1">{p.name}</h4>
                <p className="text-xs text-gray-600 mb-2">{p.description}</p>
                {p.kpis?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">KPIs</p>
                    {p.kpis.map((k: string, j: number) => <p key={j} className="text-xs text-blue-600">&#8226; {k}</p>)}
                  </div>
                )}
                {p.content_examples?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Content examples</p>
                    {p.content_examples.map((e: string, j: number) => <p key={j} className="text-xs text-gray-500 italic">&#8226; {e}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audience Personas */}
      {personas.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Audience Personas</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="audience_personas" label="Personas" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personas.map((persona: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {persona.name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{persona.name}</p>
                    {persona.demographic_snapshot && <p className="text-xs text-gray-400">{persona.demographic_snapshot}</p>}
                  </div>
                </div>
                {persona.motivations?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-0.5">Motivations</p>
                    {persona.motivations.map((m: string, j: number) => <p key={j} className="text-xs text-green-700">&#8226; {m}</p>)}
                  </div>
                )}
                {persona.pain_points?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-0.5">Pain points</p>
                    {persona.pain_points.map((p: string, j: number) => <p key={j} className="text-xs text-red-600">&#8226; {p}</p>)}
                  </div>
                )}
                {persona.what_they_need_to_hear && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-0.5">What to say to them</p>
                    <p className="text-xs text-gray-700 italic">&ldquo;{persona.what_they_need_to_hear}&rdquo;</p>
                  </div>
                )}
                {persona.social_media_behavior?.active_time_of_day && (
                  <p className="text-xs text-gray-400">Active: {persona.social_media_behavior.active_time_of_day}</p>
                )}
                {persona.resonant_tone && (
                  <p className="text-xs text-blue-600 mt-1">Tone: {persona.resonant_tone}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channel Strategy */}
      {channelStrategy.channels && Object.keys(channelStrategy.channels).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Channel Strategy</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="channel_strategy" label="Channels" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {Object.entries(channelStrategy.channels).map(([platform, ch]: [string, any]) => (
              <div key={platform} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold capitalize">{platform}</p>
                  {ch.role && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      ch.role === 'awareness' ? 'bg-blue-50 text-blue-600' :
                      ch.role === 'engagement' ? 'bg-green-50 text-green-600' :
                      ch.role === 'conversion' ? 'bg-orange-50 text-orange-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>{ch.role}</span>
                  )}
                </div>
                {ch.primary_audience && <p className="text-xs text-gray-600 mb-1"><span className="text-gray-400">Audience: </span>{ch.primary_audience}</p>}
                {ch.posting_frequency && <p className="text-xs text-gray-600 mb-1"><span className="text-gray-400">Frequency: </span>{ch.posting_frequency}</p>}
                {ch.best_posting_times?.length > 0 && <p className="text-xs text-gray-600 mb-1"><span className="text-gray-400">Best times: </span>{ch.best_posting_times.join(', ')}</p>}
                {ch.paid_organic_balance && <p className="text-xs text-gray-600 mb-1"><span className="text-gray-400">Paid/organic: </span>{ch.paid_organic_balance}</p>}
                {ch.content_formats?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ch.content_formats.map((f: string, j: number) => (
                      <span key={j} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {channelStrategy.content_mix?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Content Mix</p>
              <div className="flex flex-wrap gap-2">
                {channelStrategy.content_mix.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-bold text-blue-600">{m.percentage}%</span>
                    <span className="text-xs text-gray-600">{m.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brand Voice */}
      {messaging.brand_voice && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Brand Voice</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="messaging_strategy" label="Brand Voice" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {messaging.brand_voice.tone && <div><p className="text-xs text-gray-500">Tone</p><p className="text-sm font-medium">{messaging.brand_voice.tone}</p></div>}
            {messaging.brand_voice.personality && <div><p className="text-xs text-gray-500">Personality</p><p className="text-sm font-medium">{messaging.brand_voice.personality}</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {messaging.brand_voice.do?.length > 0 && (
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-700 mb-1">DO</p>
                {messaging.brand_voice.do.map((d: string, i: number) => <p key={i} className="text-xs text-green-800">&#10003; {d}</p>)}
              </div>
            )}
            {messaging.brand_voice.dont?.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-1">DON&apos;T</p>
                {messaging.brand_voice.dont.map((d: string, i: number) => <p key={i} className="text-xs text-red-800">&#10007; {d}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Pillars */}
      {messaging.content_pillars?.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Content Pillars</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="messaging_strategy" label="Pillars" onComplete={onRefresh} />}
          </div>
          <div className="space-y-3">
            {messaging.content_pillars.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="shrink-0 w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600">{p.percentage}%</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold">{p.name}</h4>
                  <p className="text-xs text-gray-600">{p.description}</p>
                  {p.example_topics?.length > 0 && <p className="text-xs text-gray-400 mt-0.5">e.g. {p.example_topics.join(' · ')}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Headline Formulas + CTA Bank */}
      {(messaging.headline_formulas?.length > 0 || messaging.cta_bank?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {messaging.headline_formulas?.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Caption Formulas</h3>
                {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="messaging_strategy" label="Formulas" onComplete={onRefresh} />}
              </div>
              <ul className="space-y-2">
                {messaging.headline_formulas.map((f: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="shrink-0 text-blue-400 font-bold">{i + 1}.</span>
                    <span className="text-gray-700 italic">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {messaging.cta_bank?.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">CTA Bank</h3>
                {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="messaging_strategy" label="CTAs" onComplete={onRefresh} />}
              </div>
              <div className="flex flex-wrap gap-2">
                {messaging.cta_bank.map((cta: string, i: number) => (
                  <span key={i} className="text-xs px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg">{cta}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hashtag Strategy */}
      {messaging.hashtag_strategy && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Hashtag Strategy</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="messaging_strategy" label="Hashtags" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {messaging.hashtag_strategy.branded?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Branded</p>
                <div className="flex flex-wrap gap-1">{messaging.hashtag_strategy.branded.map((h: string, i: number) => <span key={i} className="text-xs text-blue-600">#{h.replace('#', '')}</span>)}</div>
              </div>
            )}
            {messaging.hashtag_strategy.industry?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Industry</p>
                <div className="flex flex-wrap gap-1">{messaging.hashtag_strategy.industry.map((h: string, i: number) => <span key={i} className="text-xs text-green-600">#{h.replace('#', '')}</span>)}</div>
              </div>
            )}
            {messaging.hashtag_strategy.local?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Local</p>
                <div className="flex flex-wrap gap-1">{messaging.hashtag_strategy.local.map((h: string, i: number) => <span key={i} className="text-xs text-orange-600">#{h.replace('#', '')}</span>)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Direction */}
      {visualDirection && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Visual Direction</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="visual_direction" label="Visual" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visualDirection.photography_style && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Photography Style</p>
                <p className="text-sm text-gray-700">{visualDirection.photography_style}</p>
              </div>
            )}
            {visualDirection.graphic_style && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Graphic Style</p>
                <p className="text-sm text-gray-700">{visualDirection.graphic_style}</p>
              </div>
            )}
            {visualDirection.color_application_guidelines && (
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">Color Application</p>
                <p className="text-sm text-gray-700">{visualDirection.color_application_guidelines}</p>
              </div>
            )}
            {visualDirection.stop_doing_visually?.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-xs text-red-500 font-medium mb-1">Stop doing visually</p>
                <div className="flex flex-wrap gap-2">
                  {visualDirection.stop_doing_visually.map((s: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded flex gap-1">
                      <span>&#10007;</span><span>{s}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Ideas */}
      {videoIdeas.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Video Ideas</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="video_ideas" label="Videos" onComplete={onRefresh} />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoIdeas.map((v: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold flex-1">{v.concept}</h4>
                  <div className="flex gap-1 shrink-0 ml-2">
                    {v.platform && <span className="text-xs px-2 py-0.5 bg-gray-200 rounded capitalize">{v.platform}</span>}
                    {v.duration && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{v.duration}</span>}
                  </div>
                </div>
                {v.scenario && <p className="text-xs text-gray-600 mb-2">{v.scenario}</p>}
                {v.texts_on_screen?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 mb-0.5">Text on screen</p>
                    <div className="flex flex-wrap gap-1">
                      {v.texts_on_screen.map((t: string, j: number) => (
                        <span key={j} className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">&quot;{t}&quot;</span>
                      ))}
                    </div>
                  </div>
                )}
                {v.audio_direction && <p className="text-xs text-gray-500 mb-1">&#9834; {v.audio_direction}</p>}
                {v.call_to_action && <p className="text-xs text-gray-500 mb-2">CTA: <span className="text-gray-800">{v.call_to_action}</span></p>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {v.production_difficulty && (
                    <span className={`text-xs px-2 py-0.5 rounded ${DIFFICULTY_COLORS[v.production_difficulty] || 'bg-gray-100 text-gray-600'}`}>
                      {v.production_difficulty}
                    </span>
                  )}
                  {v.expected_impact && (
                    <span className={`text-xs px-2 py-0.5 rounded ${IMPACT_COLORS[v.expected_impact] || 'bg-gray-100 text-gray-600'}`}>
                      {v.expected_impact}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Month Action Plan */}
      {Object.keys(actionPlan).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">3-Month Action Plan</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="action_plan" label="Action Plan" onComplete={onRefresh} />}
          </div>
          <div className="space-y-5">
            {Object.entries(actionPlan).map(([month, weeks]: [string, any]) => (
              <div key={month}>
                <h4 className="text-sm font-semibold capitalize mb-3 text-blue-700 border-b border-blue-100 pb-1">
                  {month.replace('_', ' ')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Array.isArray(weeks) && weeks.map((w: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">Week {w.week || i + 1}</p>
                      <ul className="space-y-1.5">
                        {w.tasks?.map((task: any, j: number) => {
                          // Handle both old format (string) and new format ({task, owner})
                          const taskText = typeof task === 'string' ? task : task.task;
                          const owner = typeof task === 'object' ? task.owner : null;
                          return (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-gray-400 mt-0.5 shrink-0">&#8226;</span>
                              <span className="text-xs text-gray-700 flex-1">{taskText}</span>
                              {owner && (
                                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${OWNER_COLORS[owner] || 'bg-gray-100 text-gray-600'}`}>
                                  {owner}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disruptive Innovations */}
      {innovations.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Disruptive Ideas</h3>
            {assessmentId && onRefresh && <SubBlockRerun assessmentId={assessmentId} section="strategy_data" block="disruptive_innovations" label="Innovations" onComplete={onRefresh} />}
          </div>
          <div className="space-y-3">
            {innovations.map((inn: any, i: number) => (
              <div key={i} className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                <h4 className="text-sm font-semibold text-purple-900 mb-1">{inn.idea}</h4>
                {inn.description && <p className="text-xs text-purple-700 mb-2">{inn.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {inn.budget_required && (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      inn.budget_required === 'zero' ? 'bg-green-100 text-green-700' :
                      inn.budget_required === 'low' ? 'bg-blue-100 text-blue-700' :
                      inn.budget_required === 'high' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>Budget: {inn.budget_required}</span>
                  )}
                  {inn.cost && !inn.budget_required && (
                    <span className={`text-xs px-2 py-0.5 rounded ${inn.cost === 'low' ? 'bg-green-100 text-green-700' : inn.cost === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      Cost: {inn.cost}
                    </span>
                  )}
                  {inn.impact && (
                    <span className={`text-xs px-2 py-0.5 rounded ${inn.impact === 'high' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      Impact: {inn.impact}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
