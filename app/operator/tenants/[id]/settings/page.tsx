'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function TenantSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [channels, setChannels] = useState<string[]>([]);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [billingCurrency, setBillingCurrency] = useState('GEL');
  const [billingStartDate, setBillingStartDate] = useState('');
  const [billingDurationMonths, setBillingDurationMonths] = useState('');
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [autoReports, setAutoReports] = useState(true);
  const [savingBilling, setSavingBilling] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ anthropic_set: boolean; openai_set: boolean }>({ anthropic_set: false, openai_set: false });
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [savingKeys, setSavingKeys] = useState(false);

  useEffect(() => { fetchTenant(); fetchKeyStatus(); }, []);

  async function fetchKeyStatus() {
    try {
      const res = await fetch(`/api/tenants/${id}/api-keys`);
      if (res.ok) {
        const data = await res.json();
        setKeyStatus(data);
      }
    } catch (e) {
      console.error('Fetch key status error:', e);
    }
  }

  async function saveApiKeys() {
    if (!anthropicKey && !openaiKey) {
      alert('Enter at least one key to save.');
      return;
    }
    setSavingKeys(true);
    try {
      const body: Record<string, string> = {};
      if (anthropicKey) body.anthropic = anthropicKey;
      if (openaiKey) body.openai = openaiKey;
      const res = await fetch(`/api/tenants/${id}/api-keys`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert('Failed to save API keys'); return; }
      alert('API keys saved (encrypted).');
      setAnthropicKey('');
      setOpenaiKey('');
      fetchKeyStatus();
    } catch (e) {
      alert('Network error.');
    } finally {
      setSavingKeys(false);
    }
  }

  async function clearApiKey(service: 'anthropic' | 'openai') {
    if (!confirm(`Remove ${service} key? Tenant will fall back to GEC's global key.`)) return;
    try {
      const res = await fetch(`/api/tenants/${id}/api-keys`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [service]: '' }),
      });
      if (!res.ok) { alert('Failed to remove key'); return; }
      fetchKeyStatus();
    } catch (e) { alert('Network error.'); }
  }

  async function fetchTenant() {
    try {
      const res = await fetch(`/api/tenants/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const t = data.tenant;
      setTenant(t);
      setName(t.name || '');
      setCity(t.city || '');
      setPostsPerWeek(t.posts_per_week || 5);
      setChannels(t.channels || []);
      setMonthlyFee(t.monthly_fee != null ? String(t.monthly_fee) : '');
      setBillingCurrency(t.billing_currency || 'GEL');
      setBillingStartDate(t.billing_start_date ? t.billing_start_date.split('T')[0] : '');
      setBillingDurationMonths(t.billing_duration_months != null ? String(t.billing_duration_months) : '');
      setAutoInvoice(t.auto_invoice !== false);
      setAutoReports(t.auto_reports !== false);
    } catch (e) {
      console.error('Fetch tenant error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveTenant() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, city, posts_per_week: postsPerWeek, channels }),
      });
      if (!res.ok) { alert('Failed to save'); return; }
      alert('Settings saved.');
      fetchTenant();
    } catch (e) {
      alert('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function saveBilling() {
    if (monthlyFee && (!isFinite(parseFloat(monthlyFee)) || parseFloat(monthlyFee) < 0)) {
      alert('Monthly fee must be a positive number.');
      return;
    }
    if (billingStartDate && isNaN(new Date(billingStartDate).getTime())) {
      alert('Contract start date is invalid.');
      return;
    }
    setSavingBilling(true);
    try {
      const startDate = billingStartDate ? new Date(billingStartDate) : null;
      const startDay = startDate ? startDate.getDate() : 1;
      if (startDate && startDay > 28) {
        if (!confirm(`Day ${startDay} doesn't exist in all months. Billing day will be set to 28. Continue?`)) {
          setSavingBilling(false);
          return;
        }
      }
      const billingDay = startDay > 28 ? 28 : startDay;
      const res = await fetch(`/api/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthly_fee: monthlyFee ? parseFloat(monthlyFee) : null,
          billing_currency: billingCurrency,
          billing_start_date: billingStartDate || null,
          billing_duration_months: billingDurationMonths ? parseInt(billingDurationMonths) : null,
          billing_day: billingDay,
          auto_invoice: autoInvoice,
          auto_reports: autoReports,
        }),
      });
      if (!res.ok) { alert('Failed to save billing'); return; }
      alert('Billing settings saved.');
      fetchTenant();
    } catch (e) {
      alert('Network error.');
    } finally {
      setSavingBilling(false);
    }
  }

  async function resetTenantPassword() {
    if (!confirm('This will generate a new password and email it to the tenant. Continue?')) return;
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/tenants/${id}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { alert('Failed: ' + (data.error || res.statusText)); return; }
      if (data.email_sent) {
        alert('New password sent to ' + data.sent_to);
      } else {
        alert('Password reset but email failed. New password: ' + data.new_password + '\n\nShare this with the client manually.');
      }
    } catch (e) {
      alert('Network error.');
    } finally {
      setResettingPassword(false);
    }
  }

  const allChannels = ['facebook', 'instagram', 'linkedin', 'tiktok'];

  function toggleChannel(ch: string) {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading...</p>;
  if (!tenant) return <p className="text-red-500 text-center py-8">Tenant not found</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/operator/tenants/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Posts Per Week</label>
            <input type="number" value={postsPerWeek} onChange={(e) => setPostsPerWeek(Number(e.target.value))} min={1} max={30} className="w-24 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
            <div className="flex gap-2">
              {allChannels.map(ch => (
                <button
                  key={ch}
                  onClick={() => toggleChannel(ch)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize ${channels.includes(ch) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          <button onClick={saveTenant} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={resetTenantPassword}
            disabled={resettingPassword}
            className="px-4 py-2 border border-orange-300 text-orange-600 rounded-lg text-sm hover:bg-orange-50 disabled:opacity-50"
          >
            {resettingPassword ? 'Resetting...' : 'Reset Client Password'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm max-w-lg mt-6">
        <h2 className="text-lg font-semibold mb-1">Billing &amp; Subscription</h2>
        <p className="text-xs text-gray-500 mb-4">
          Monthly fee, contract length, and invoice automation. Auto-invoicing creates a draft invoice on the billing day each month.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Monthly Fee</label>
            <input type="number" step="0.01" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="200" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Currency</label>
            <select value={billingCurrency} onChange={(e) => setBillingCurrency(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="GEL">GEL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contract Start Date</label>
            <input type="date" value={billingStartDate} onChange={(e) => setBillingStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Duration (months)</label>
            <select value={billingDurationMonths} onChange={(e) => setBillingDurationMonths(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Ongoing</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
              <option value="24">24 months</option>
            </select>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoInvoice} onChange={(e) => setAutoInvoice(e.target.checked)} />
            Auto-generate invoices monthly
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoReports} onChange={(e) => setAutoReports(e.target.checked)} />
            Auto-generate weekly reports
          </label>
        </div>
        <button onClick={saveBilling} disabled={savingBilling} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {savingBilling ? 'Saving...' : 'Save Billing Settings'}
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm max-w-lg mt-6">
        <h2 className="text-lg font-semibold mb-1">Tenant API Keys (Override)</h2>
        <p className="text-xs text-gray-500 mb-4">
          By default, this tenant uses GEC&apos;s global API keys. If this tenant is high-volume or
          generating heavy AI content, you can set their own keys here. Costs will be billed directly
          to their account instead of GEC&apos;s. Keys are encrypted at rest.
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Anthropic (Claude) API Key</label>
              {keyStatus.anthropic_set ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Custom key active</span>
                  <button onClick={() => clearApiKey('anthropic')} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Using GEC global</span>
              )}
            </div>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">OpenAI (DALL-E) API Key</label>
              {keyStatus.openai_set ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Custom key active</span>
                  <button onClick={() => clearApiKey('openai')} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Using GEC global</span>
              )}
            </div>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
          </div>
        </div>

        <button
          onClick={saveApiKeys}
          disabled={savingKeys || (!anthropicKey && !openaiKey)}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {savingKeys ? 'Saving...' : 'Save API Keys'}
        </button>
      </div>
    </div>
  );
}
