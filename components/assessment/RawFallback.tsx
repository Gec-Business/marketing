'use client';

/**
 * Fallback display when AI response couldn't be parsed as structured JSON.
 * Shows the raw text in a readable format with a warning badge.
 */
export default function RawFallback({ data, label }: { data: any; label: string }) {
  if (!data) return null;

  // If data has parse_error, extract the raw text
  const hasParseError = data.parse_error === true;
  const rawText = data.raw_text || data.part1 || '';
  const rawText2 = data.part2 || '';

  if (!hasParseError) return null;

  // Try to format the raw text nicely - split into sections by newlines
  const formatText = (text: string) => {
    if (!text) return null;
    // Try to parse it one more time (sometimes the raw_text IS valid JSON with extra whitespace)
    try {
      const parsed = JSON.parse(text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''));
      return (
        <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      // Not JSON — render as formatted text
      return (
        <div className="text-sm text-gray-700 space-y-2">
          {text.split('\n').filter(Boolean).map((line: string, i: number) => {
            const trimmed = line.trim();
            // Detect headers (lines ending with : or starting with # or **)
            if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
              return <h4 key={i} className="font-semibold text-gray-900 mt-3">{trimmed.replace(/^#+\s*/, '')}</h4>;
            }
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
              return <h4 key={i} className="font-semibold text-gray-900 mt-2">{trimmed.replace(/\*\*/g, '')}</h4>;
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              return <p key={i} className="pl-4 text-sm">&#8226; {trimmed.slice(2)}</p>;
            }
            if (/^\d+\.\s/.test(trimmed)) {
              return <p key={i} className="pl-4 text-sm">{trimmed}</p>;
            }
            return <p key={i} className="text-sm">{trimmed}</p>;
          })}
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-lg">{label}</h3>
        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">AI output — pending structured review</span>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
        The AI generated this analysis but the output format needs review. The data is complete — it just needs to be re-processed. Click &quot;Re-run&quot; to regenerate in structured format.
      </div>
      {formatText(rawText)}
      {rawText2 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {formatText(rawText2)}
        </div>
      )}
    </div>
  );
}
