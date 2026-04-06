'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingQuestion } from '@/lib/ai/onboarding-questions';

export default function OnboardingWizard({ baseQuestions }: { baseQuestions: OnboardingQuestion[] }) {
  const [step, setStep] = useState<'basics' | 'industry' | 'review'>('basics');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [industryQuestions, setIndustryQuestions] = useState<OnboardingQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  function updateAnswer(id: string, value: any) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleBasicsNext() {
    if (!answers.name || !answers.industry) {
      setError('Business name and industry are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tenants/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: answers.industry, businessName: answers.name }),
      });
      const data = await res.json();
      setIndustryQuestions(data.questions || []);
      setStep('industry');
    } catch (e) {
      setError('Failed to generate questions');
    }
    setLoading(false);
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    const slug = answers.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const body = {
      name: answers.name,
      slug,
      industry: answers.industry,
      city: answers.city || 'Tbilisi',
      website: answers.website || null,
      google_maps_url: answers.google_maps_url || null,
      channels: answers.channels || [],
      posting_frequency: answers.posting_frequency || 'daily',
      posts_per_week: parseInt(answers.posts_per_week) || 5,
      video_ideas_per_month: parseInt(answers.video_ideas_per_month) || 4,
      primary_language: answers.primary_language || 'ka',
      tenant_email: answers.tenant_email,
      tenant_password: answers.tenant_password,
      social_links: {
        facebook: answers.facebook_url || null,
        instagram: answers.instagram_handle || null,
        linkedin: answers.linkedin_url || null,
        tiktok: answers.tiktok_handle || null,
      },
      onboarding_data: {
        target_audience: answers.target_audience,
        industry_answers: Object.fromEntries(
          industryQuestions.map((q) => [q.id, answers[q.id]])
        ),
      },
    };

    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create tenant');
      setLoading(false);
      return;
    }

    const { tenant } = await res.json();
    router.push(`/operator/tenants/${tenant.id}`);
  }

  function renderQuestion(q: OnboardingQuestion) {
    if (q.type === 'select') {
      return (
        <select
          value={answers[q.id] || ''}
          onChange={(e) => updateAnswer(q.id, e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Select...</option>
          {q.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    if (q.type === 'multiselect') {
      return (
        <div className="flex flex-wrap gap-2">
          {q.options?.map((opt) => {
            const selected = (answers[q.id] || []).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = answers[q.id] || [];
                  updateAnswer(q.id, selected ? current.filter((v: string) => v !== opt) : [...current, opt]);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm border ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    if (q.type === 'textarea') {
      return (
        <textarea
          value={answers[q.id] || ''}
          onChange={(e) => updateAnswer(q.id, e.target.value)}
          placeholder={q.placeholder}
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    }
    return (
      <input
        type={q.type === 'number' ? 'number' : 'text'}
        value={answers[q.id] || ''}
        onChange={(e) => updateAnswer(q.id, e.target.value)}
        placeholder={q.placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 mb-8">
        {(['basics', 'industry', 'review'] as const).map((s, i) => (
          <div key={s} className={`flex-1 h-1.5 rounded ${['basics', 'industry', 'review'].indexOf(step) >= i ? 'bg-blue-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {step === 'basics' && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold">Basic Information</h2>
          {baseQuestions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {q.label} {q.required && <span className="text-red-400">*</span>}
              </label>
              {renderQuestion(q)}
            </div>
          ))}
          <button
            onClick={handleBasicsNext}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating industry questions...' : 'Next'}
          </button>
        </div>
      )}

      {step === 'industry' && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold">Industry-Specific Details</h2>
          <p className="text-sm text-gray-500">These questions are tailored for {answers.industry} businesses.</p>
          {industryQuestions.length === 0 && (
            <p className="text-gray-400 text-sm">No additional questions generated. You can proceed.</p>
          )}
          {industryQuestions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {q.label} {q.required && <span className="text-red-400">*</span>}
              </label>
              {renderQuestion(q)}
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setStep('basics')} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Back
            </button>
            <button onClick={() => setStep('review')} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Review
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold">Review &amp; Create</h2>
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
            <div><span className="text-sm text-gray-500">Business:</span> <span className="font-medium">{answers.name}</span></div>
            <div><span className="text-sm text-gray-500">Industry:</span> <span>{answers.industry}</span></div>
            <div><span className="text-sm text-gray-500">City:</span> <span>{answers.city || 'Tbilisi'}</span></div>
            <div><span className="text-sm text-gray-500">Channels:</span> <span>{(answers.channels || []).join(', ') || 'None selected'}</span></div>
            <div><span className="text-sm text-gray-500">Posts/week:</span> <span>{answers.posts_per_week || 5}</span></div>
            <div><span className="text-sm text-gray-500">Video ideas/month:</span> <span>{answers.video_ideas_per_month || 4}</span></div>
            <div><span className="text-sm text-gray-500">Client email:</span> <span>{answers.tenant_email}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('industry')} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Tenant & Start Assessment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
