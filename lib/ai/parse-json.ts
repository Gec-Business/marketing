/**
 * Aggressively extract and parse JSON from Claude's response text.
 * Handles: code fences, markdown wrapping, trailing text, nested fences, etc.
 */
export function parseAIJson(text: string): { parsed: any; success: boolean } {
  if (!text) return { parsed: null, success: false };

  const cleaned = text.trim();

  // Strategy 1: Direct parse (already valid JSON)
  try {
    return { parsed: JSON.parse(cleaned), success: true };
  } catch {}

  // Strategy 2: Strip code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return { parsed: JSON.parse(fenceMatch[1].trim()), success: true };
    } catch {}
  }

  // Strategy 3: Strip leading/trailing non-JSON text
  // Find the first { or [ and last } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const start = firstBrace >= 0 && firstBracket >= 0
    ? Math.min(firstBrace, firstBracket)
    : Math.max(firstBrace, firstBracket);

  if (start >= 0) {
    const isArray = cleaned[start] === '[';
    const lastClose = cleaned.lastIndexOf(isArray ? ']' : '}');
    if (lastClose > start) {
      const extracted = cleaned.slice(start, lastClose + 1);
      try {
        return { parsed: JSON.parse(extracted), success: true };
      } catch {}
    }
  }

  // Strategy 4: Try removing common Claude artifacts
  const artifacts = cleaned
    .replace(/^Here'?s?\s+(the\s+)?(?:JSON|analysis|result|output)[:\s]*/i, '')
    .replace(/\n\nLet me know.*$/i, '')
    .replace(/\n\nNote:[\s\S]*$/, '')
    .replace(/\n\nI've[\s\S]*$/, '')
    .trim();

  try {
    return { parsed: JSON.parse(artifacts), success: true };
  } catch {}

  // Strategy 5: Extract from within artifacts
  const artifactFence = artifacts.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (artifactFence) {
    try {
      return { parsed: JSON.parse(artifactFence[1].trim()), success: true };
    } catch {}
  }

  // Strategy 6: Truncated JSON recovery — close incomplete brackets
  if (start >= 0) {
    let extracted = cleaned.slice(start);
    // Strip trailing incomplete values
    extracted = extracted.replace(/,\s*"[^"]*$/, '');
    extracted = extracted.replace(/,\s*$/, '');
    extracted = extracted.replace(/:\s*"[^"]*$/, ': ""');
    extracted = extracted.replace(/:\s*$/, ': null');

    // Count unclosed braces/brackets
    let braces = 0;
    let brackets = 0;
    let inStr = false;
    let esc = false;
    for (const ch of extracted) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') braces++;
      if (ch === '}') braces--;
      if (ch === '[') brackets++;
      if (ch === ']') brackets--;
    }

    let closing = '';
    while (brackets > 0) { closing += ']'; brackets--; }
    while (braces > 0) { closing += '}'; braces--; }

    if (closing) {
      try {
        return { parsed: JSON.parse(extracted + closing), success: true };
      } catch {}
    }
  }

  return { parsed: null, success: false };
}
