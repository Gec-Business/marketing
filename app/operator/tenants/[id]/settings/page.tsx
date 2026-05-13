'use client';

import { useState, useEffect, use, useRef } from 'react';
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

  // Brand config
  const [brandConfig, setBrandConfig] = useState<any>({});
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Brandbook
  const [extracting, setExtracting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<any>(null);
  const brandbookInputRef = useRef<HTMLInputElement>(null);

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
      setBrandConfig(t.brand_config || {});
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

  async function saveBrandConfig() {
    setSavingBrand(true);
    try {
      const res = await fetch(`/api/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_config: brandConfig }),
      });
      if (!res.ok) { alert('Failed to save brand config'); return; }
      alert('Brand config saved.');
    } catch (e) {
      alert('Network error.');
    } finally {
      setSavingBrand(false);
    }
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/tenants/${id}/logo`, { method: 'POST', body: formData });
      if (!res.ok) { alert('Logo upload failed'); return; }
      const { logo_url } = await res.json();
      setBrandConfig((prev: any) => ({ ...prev, logo_url }));
    } catch (e) {
      alert('Network error.');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function uploadBrandbook(file: File) {
    setExtracting(true);
    setExtractedPreview(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/tenants/${id}/brandbook`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Extraction failed'); return; }
      setBrandConfig(data.brand_config);
      setExtractedPreview(data.extracted);
    } catch (e) {
      alert('Network error.');
    } finally {
      setExtracting(false);
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

      {/* Brand Config */}
      <div className="bg-white rounded-xl p-6 shadow-sm max-w-lg mt-6">
        <h2 className="text-lg font-semibold mb-1">Brand Config</h2>
        <p className="text-xs text-gray-500 mb-4">Logo, colors, and fonts used for content generation and image prompts.</p>

        {/* Logo */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
          <div className="flex items-center gap-4">
            {brandConfig.logo_url ? (
              <div className="relative w-20 h-20 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden">
                <img src={brandConfig.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">No logo</div>
            )}
            <div>
              <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                {uploadingLogo ? 'Uploading...' : brandConfig.logo_url ? 'Replace Logo' : 'Upload Logo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, SVG, or WebP. Max 5MB.</p>
              <input ref={logoInputRef} type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg" className="hidden"
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Brand Colors</label>
          <div className="grid grid-cols-3 gap-3">
            {(['primary_color', 'secondary_color', 'accent_color'] as const).map((key) => (
              <div key={key}>
                <label className="text-xs text-gray-500 block mb-1 capitalize">{key.replace('_color', '')}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={brandConfig[key] || '#000000'}
                    onChange={e => setBrandConfig((p: any) => ({ ...p, [key]: e.target.value }))}
                    className="w-9 h-9 rounded border cursor-pointer" />
                  <input type="text" value={brandConfig[key] || ''}
                    onChange={e => setBrandConfig((p: any) => ({ ...p, [key]: e.target.value }))}
                    placeholder="#000000" className="flex-1 px-2 py-1.5 border rounded text-xs font-mono" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fonts + Tagline */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Primary Font</label>
            <input type="text" value={brandConfig.font_primary || ''}
              onChange={e => setBrandConfig((p: any) => ({ ...p, font_primary: e.target.value }))}
              placeholder="e.g. Helvetica Neue, Montserrat" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tagline</label>
            <input type="text" value={brandConfig.tagline || ''}
              onChange={e => setBrandConfig((p: any) => ({ ...p, tagline: e.target.value }))}
              placeholder="e.g. Grow with purpose" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        <button onClick={saveBrandConfig} disabled={savingBrand}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {savingBrand ? 'Saving...' : 'Save Brand Config'}
        </button>
      </div>

      {/* Brandbook Upload */}
      <div className="bg-white rounded-xl p-6 shadow-sm max-w-lg mt-6">
        <h2 className="text-lg font-semibold mb-1">Brandbook</h2>
        <p className="text-xs text-gray-500 mb-4">
          Upload the client&apos;s brandbook PDF. Claude will extract colors, fonts, tone of voice, and visual rules and merge them into Brand Config automatically.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => brandbookInputRef.current?.click()}
            disabled={extracting}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {extracting ? 'Extracting...' : 'Upload Brandbook PDF'}
          </button>
          <p className="text-xs text-gray-400">PDF only, max 32MB.</p>
          <input
            ref={brandbookInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => e.target.files?.[0] && uploadBrandbook(e.target.files[0])}
          />
        </div>

        {extracting && (
          <div className="bg-purple-50 rounded-lg p-4 text-sm text-purple-700">
            Claude is reading the brandbook — this takes 15-30 seconds...
          </div>
        )}

        {extractedPreview && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-green-800 mb-2">Extracted & saved to Brand Config ✓</p>
            {extractedPreview.primary_color && (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border" style={{ background: extractedPreview.primary_color }} />
                <span className="text-xs text-gray-600">Primary: {extractedPreview.primary_color}</span>
                {extractedPreview.secondary_color && <>
                  <span className="w-4 h-4 rounded border ml-2" style={{ background: extractedPreview.secondary_color }} />
                  <span className="text-xs text-gray-600">Secondary: {extractedPreview.secondary_color}</span>
                </>}
              </div>
            )}
            {extractedPreview.font_primary && <p className="text-xs text-gray-600">Font: {extractedPreview.font_primary}{extractedPreview.font_secondary ? ` / ${extractedPreview.font_secondary}` : ''}</p>}
            {extractedPreview.tagline && <p className="text-xs text-gray-600">Tagline: &ldquo;{extractedPreview.tagline}&rdquo;</p>}
            {extractedPreview.tone_of_voice && <p className="text-xs text-gray-600">Tone: {extractedPreview.tone_of_voice}</p>}
            {extractedPreview.dont_use?.length > 0 && (
              <p className="text-xs text-red-600">Avoid: {extractedPreview.dont_use.slice(0, 3).join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
