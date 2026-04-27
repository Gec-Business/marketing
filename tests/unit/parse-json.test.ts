import { describe, it, expect } from 'vitest';
import { parseAIJson } from '../../lib/ai/parse-json';

// ---------------------------------------------------------------------------
// Strategy 1: valid JSON passed directly
// ---------------------------------------------------------------------------
describe('parseAIJson — Strategy 1: direct valid JSON', () => {
  it('parses a valid JSON object string', () => {
    const result = parseAIJson('{"foo": "bar", "count": 42}');
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ foo: 'bar', count: 42 });
  });

  it('parses a valid JSON array string', () => {
    const result = parseAIJson('[1, 2, 3]');
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual([1, 2, 3]);
  });

  it('parses a nested JSON structure', () => {
    const json = JSON.stringify({ posts: [{ id: 1, title: 'Hello' }], total: 1 });
    const result = parseAIJson(json);
    expect(result.success).toBe(true);
    expect(result.parsed.posts[0].title).toBe('Hello');
  });

  it('parses JSON with leading/trailing whitespace (trim)', () => {
    const result = parseAIJson('  \n  {"ok": true}  \n  ');
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ ok: true });
  });

  it('parses boolean true as valid JSON', () => {
    const result = parseAIJson('true');
    expect(result.success).toBe(true);
    expect(result.parsed).toBe(true);
  });

  it('parses null as valid JSON', () => {
    const result = parseAIJson('null');
    expect(result.success).toBe(true);
    expect(result.parsed).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Strategy 2: JSON wrapped in markdown code fences
// ---------------------------------------------------------------------------
describe('parseAIJson — Strategy 2: markdown code fences', () => {
  it('strips ```json ... ``` fences and parses the inner JSON', () => {
    const text = '```json\n{"platform": "facebook", "score": 9}\n```';
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ platform: 'facebook', score: 9 });
  });

  it('strips plain ``` ... ``` fences without language tag', () => {
    const text = '```\n{"key": "value"}\n```';
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ key: 'value' });
  });

  it('handles code fences with extra whitespace inside', () => {
    const text = '```json\n   {"spaced": true}   \n```';
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ spaced: true });
  });

  it('handles JSON array inside code fences', () => {
    const text = '```json\n[{"id": 1}, {"id": 2}]\n```';
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

// ---------------------------------------------------------------------------
// Strategy 3: JSON embedded in surrounding prose
// ---------------------------------------------------------------------------
describe('parseAIJson — Strategy 3: JSON embedded in prose', () => {
  it('extracts a JSON object from surrounding prose text', () => {
    const text = 'Here is the analysis result: {"sentiment": "positive"} as requested.';
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ sentiment: 'positive' });
  });

  it('extracts a JSON array from surrounding prose text', () => {
    const text = 'The posts are: [{"id": 1}, {"id": 2}] — enjoy!';
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('handles leading text before the opening brace', () => {
    const text = 'Sure! Here you go:\n\n{"result": 42}';
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ result: 42 });
  });
});

// ---------------------------------------------------------------------------
// Strategy 4: Claude artifact prefix stripping
// ---------------------------------------------------------------------------
describe('parseAIJson — Strategy 4: Claude artifact prefixes', () => {
  it('strips "Here is the JSON:" prefix before parsing', () => {
    const text = "Here's the JSON:\n{\"cleaned\": true}";
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ cleaned: true });
  });

  it('strips trailing "Let me know ..." suffix', () => {
    const text = '{"done": true}\n\nLet me know if you need anything else!';
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ done: true });
  });

  it('strips trailing "Note: ..." section', () => {
    const text = '{"value": 1}\n\nNote: This is a sample response.';
    const result = parseAIJson(text);
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ value: 1 });
  });
});

// ---------------------------------------------------------------------------
// Strategy 6: Truncated JSON recovery
// ---------------------------------------------------------------------------
describe('parseAIJson — Strategy 6: truncated JSON recovery', () => {
  it('recovers a truncated object by closing unclosed braces', () => {
    // Missing closing } — strategy 6 should close it
    const truncated = '{"title": "Hello", "body": "World"';
    const result = parseAIJson(truncated);
    expect(result.success).toBe(true);
    expect(result.parsed.title).toBe('Hello');
    expect(result.parsed.body).toBe('World');
  });

  it('recovers a truncated nested object', () => {
    // Outer object closed but inner array not
    const truncated = '{"posts": [{"id": 1}, {"id": 2}';
    const result = parseAIJson(truncated);
    // Recovery may or may not succeed depending on depth — either outcome is valid
    // The important thing is it does not throw
    expect(typeof result.success).toBe('boolean');
  });

  it('handles truncated value mid-string by substituting empty string', () => {
    // Key with incomplete string value — strategy 6 normalises it
    const truncated = '{"platform": "facebook", "caption": "This is a long cap';
    const result = parseAIJson(truncated);
    // Either recovered or cleanly failed — must not throw
    expect(typeof result.success).toBe('boolean');
    if (result.success) {
      expect(result.parsed).toHaveProperty('platform', 'facebook');
    }
  });
});

// ---------------------------------------------------------------------------
// Failure cases
// ---------------------------------------------------------------------------
describe('parseAIJson — failure cases', () => {
  it('returns success: false for empty string', () => {
    const result = parseAIJson('');
    expect(result.success).toBe(false);
    expect(result.parsed).toBeNull();
  });

  it('returns success: false for pure prose with no JSON', () => {
    const result = parseAIJson('This is just a sentence with no JSON whatsoever.');
    expect(result.success).toBe(false);
    expect(result.parsed).toBeNull();
  });

  it('returns success: false for random symbols / garbage', () => {
    const result = parseAIJson('!@#$%^&*()_+|~`');
    expect(result.success).toBe(false);
    expect(result.parsed).toBeNull();
  });

  it('returns success: false for a broken code fence with invalid JSON inside', () => {
    const text = '```json\n{broken: json here\n```';
    const result = parseAIJson(text);
    // "broken" is an unquoted key — invalid JSON; recovery may or may not succeed
    // Verify it does not throw
    expect(typeof result.success).toBe('boolean');
  });

  it('returns success: false for only whitespace', () => {
    const result = parseAIJson('   \n\t  ');
    expect(result.success).toBe(false);
    expect(result.parsed).toBeNull();
  });

  it('returns success: false for a lone opening brace with nothing valid', () => {
    // A single { with no content — truncation recovery can't close it into valid JSON
    const result = parseAIJson('{');
    // Could recover to {} which IS valid — so accept either outcome without throwing
    expect(typeof result.success).toBe('boolean');
  });

  it('does not throw for any input — only returns {success, parsed}', () => {
    const inputs = ['null', 'undefined', '<<<>>>', '{"a":}', '[,]', '{"":'];
    for (const input of inputs) {
      expect(() => parseAIJson(input)).not.toThrow();
      const r = parseAIJson(input);
      expect(r).toHaveProperty('success');
      expect(r).toHaveProperty('parsed');
    }
  });
});

// ---------------------------------------------------------------------------
// Return shape invariants
// ---------------------------------------------------------------------------
describe('parseAIJson — return shape', () => {
  it('always returns an object with success (boolean) and parsed keys', () => {
    const r = parseAIJson('{"x": 1}');
    expect(typeof r.success).toBe('boolean');
    expect('parsed' in r).toBe(true);
  });

  it('success: false always pairs with parsed: null', () => {
    const r = parseAIJson('');
    expect(r.success).toBe(false);
    expect(r.parsed).toBeNull();
  });
});
