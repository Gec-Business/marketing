'use client';

import { useState, useEffect } from 'react';

export default function OperatorSettingsPage() {
  const [keyStatus, setKeyStatus] = useState<{ anthropic_set: boolean; openai_set: boolean }>({
    anthropic_set: false,
    openai_set: false,
  });
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/operator/api-keys');
      if (res.ok) {
        const data = await res.json();
        setKeyStatus(data);
      }
    } catch (e) {
      console.error('Fetch status error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveKeys() {
    if (!anthropicKey && !openaiKey) {
      alert('Enter at least one key to save.');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (anthropicKey) body.anthropic = anthropicKey;
      if (openaiKey) body.openai = openaiKey;
      const res = await fetch('/api/operator/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert('Failed to save'); return; }
      alert('API keys saved (encrypted).');
      setAnthropicKey('');
      setOpenaiKey('');
      fetchStatus();
    } catch (e) {
      alert('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function clearKey(service: 'anthropic' | 'openai') {
    if (!confirm(`Remove your ${service} key? All tenants without their own override will fall back to GEC's system key.`)) return;
    try {
      const res = await fetch('/api/operator/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [service]: '' }),
      });
      if (!res.ok) { alert('Failed to remove'); return; }
      fetchStatus();
    } catch (e) { alert('Network error.'); }
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your default API keys used for all tenant content generation.</p>

      <div className="bg-white rounded-xl p-6 shadow-sm max-w-2xl">
        <h2 className="text-lg font-semibold mb-1">Your API Keys</h2>
        <p className="text-xs text-gray-500 mb-4">
          These keys are used by default for ALL tenants you manage (assessments, content generation, AI images).
          For high-volume tenants, you can override these on a per-tenant basis from each tenant&apos;s Settings page.
          Keys are encrypted at rest.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-800">
          <strong>How it works:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><strong>Tier 1:</strong> Per-tenant override (if set on tenant settings)</li>
            <li><strong>Tier 2:</strong> Your operator keys (set here) — used by default</li>
            <li><strong>Tier 3:</strong> GEC system fallback (only used for onboarding question generation)</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Anthropic (Claude) API Key</label>
              {keyStatus.anthropic_set ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                  <button onClick={() => clearKey('anthropic')} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Not set — using GEC fallback</span>
              )}
            </div>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">Get yours at console.anthropic.com → API Keys</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">OpenAI (DALL-E) API Key</label>
              {keyStatus.openai_set ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                  <button onClick={() => clearKey('openai')} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Not set — using GEC fallback</span>
              )}
            </div>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">Get yours at platform.openai.com → API Keys</p>
          </div>
        </div>

        <button
          onClick={saveKeys}
          disabled={saving || (!anthropicKey && !openaiKey)}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save API Keys'}
        </button>
      </div>
    </div>
  );
}
