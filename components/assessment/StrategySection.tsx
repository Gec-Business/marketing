'use client';

export default function StrategySection({ data }: { data: any }) {
  if (!data) return null;
  const framework = data.strategic_framework || {};
  const channelStrategy = data.channel_strategy || {};
  const messaging = data.messaging_strategy || {};
  const actionPlan = data.action_plan || {};
  const videoIdeas = data.video_ideas || [];
  const innovations = data.disruptive_innovations || [];

  return (
    <div className="space-y-6">
      {/* Vision & Mission */}
      {(framework.vision || framework.mission) && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Strategic Framework</h3>
          {framework.vision && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
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
          <h3 className="font-semibold text-lg mb-4">Strategic Pillars</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {framework.strategic_pillars.map((p: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 border-t-4 border-blue-500">
                <h4 className="font-semibold text-sm mb-1">{p.name}</h4>
                <p className="text-xs text-gray-600 mb-2">{p.description}</p>
                {p.kpis?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">KPIs:</p>
                    {p.kpis.map((k: string, j: number) => <p key={j} className="text-xs text-blue-600">&#8226; {k}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brand Voice */}
      {messaging.brand_voice && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Brand Voice</h3>
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
          <h3 className="font-semibold text-lg mb-4">Content Pillars</h3>
          <div className="space-y-3">
            {messaging.content_pillars.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600">{p.percentage}%</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold">{p.name}</h4>
                  <p className="text-xs text-gray-600">{p.description}</p>
                  {p.example_topics?.length > 0 && <p className="text-xs text-gray-400 mt-1">e.g., {p.example_topics.join(', ')}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hashtag Strategy */}
      {messaging.hashtag_strategy && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-3">Hashtag Strategy</h3>
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

      {/* Video Ideas */}
      {videoIdeas.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Video Ideas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoIdeas.map((v: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">{v.concept}</h4>
                  <div className="flex gap-1">
                    {v.platform && <span className="text-xs px-2 py-0.5 bg-gray-200 rounded capitalize">{v.platform}</span>}
                    {v.duration && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{v.duration}</span>}
                  </div>
                </div>
                {v.scenario && <p className="text-xs text-gray-600 mb-2">{v.scenario}</p>}
                {v.texts_on_screen?.length > 0 && (
                  <div className="mb-1">
                    <p className="text-xs text-gray-500">Text overlays:</p>
                    {v.texts_on_screen.map((t: string, j: number) => <span key={j} className="text-xs text-indigo-600 mr-2">&quot;{t}&quot;</span>)}
                  </div>
                )}
                {v.call_to_action && <p className="text-xs text-gray-500">CTA: <span className="text-gray-800">{v.call_to_action}</span></p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan */}
      {Object.keys(actionPlan).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">3-Month Action Plan</h3>
          <div className="space-y-4">
            {Object.entries(actionPlan).map(([month, weeks]: [string, any]) => (
              <div key={month}>
                <h4 className="text-sm font-semibold capitalize mb-2 text-blue-700">{month.replace('_', ' ')}</h4>
                {Array.isArray(weeks) && weeks.map((w: any, i: number) => (
                  <div key={i} className="ml-4 mb-2">
                    <p className="text-xs font-medium text-gray-500">Week {w.week || i + 1}</p>
                    {w.tasks?.map((t: string, j: number) => <p key={j} className="text-xs text-gray-700 ml-2">&#8226; {t}</p>)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Innovations */}
      {innovations.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Disruptive Ideas</h3>
          <div className="space-y-3">
            {innovations.map((inn: any, i: number) => (
              <div key={i} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                <h4 className="text-sm font-semibold text-purple-900">{inn.idea}</h4>
                {inn.description && <p className="text-xs text-purple-700 mt-1">{inn.description}</p>}
                <div className="flex gap-2 mt-2">
                  {inn.cost && <span className={`text-xs px-2 py-0.5 rounded ${inn.cost === 'low' ? 'bg-green-100 text-green-700' : inn.cost === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>Cost: {inn.cost}</span>}
                  {inn.impact && <span className={`text-xs px-2 py-0.5 rounded ${inn.impact === 'high' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>Impact: {inn.impact}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
