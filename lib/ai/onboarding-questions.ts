import { askClaude } from './client';

export interface OnboardingQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

const BASE_QUESTIONS: OnboardingQuestion[] = [
  { id: 'name', label: 'Business Name', type: 'text', required: true, placeholder: '3 Shaurma' },
  { id: 'industry', label: 'Industry / Category', type: 'text', required: true, placeholder: 'Fast food, Real estate, Beauty...' },
  { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Tbilisi' },
  { id: 'website', label: 'Website URL', type: 'text', required: false, placeholder: 'https://...' },
  { id: 'google_maps_url', label: 'Google Maps Link', type: 'text', required: false, placeholder: 'https://maps.google.com/...' },
  { id: 'facebook_url', label: 'Facebook Page URL', type: 'text', required: false },
  { id: 'instagram_handle', label: 'Instagram Handle', type: 'text', required: false, placeholder: '@...' },
  { id: 'linkedin_url', label: 'LinkedIn Page URL', type: 'text', required: false },
  { id: 'tiktok_handle', label: 'TikTok Handle', type: 'text', required: false, placeholder: '@...' },
  { id: 'channels', label: 'Which channels should we post to?', type: 'multiselect', required: true, options: ['facebook', 'instagram', 'linkedin', 'tiktok'] },
  { id: 'posting_frequency', label: 'Posting Frequency', type: 'select', required: true, options: ['daily', '5x/week', '3x/week', '2x/week'] },
  { id: 'posts_per_week', label: 'Text/Image Posts per Week', type: 'number', required: true, placeholder: '5' },
  { id: 'video_ideas_per_month', label: 'Video Ideas per Month', type: 'number', required: true, placeholder: '4' },
  { id: 'primary_language', label: 'Primary Language', type: 'select', required: true, options: ['ka', 'en', 'ru'] },
  { id: 'target_audience', label: 'Target Audience Description', type: 'textarea', required: false, placeholder: '18-40 year olds in residential areas...' },
  { id: 'tenant_email', label: 'Client Login Email', type: 'text', required: true, placeholder: 'client@example.com' },
  { id: 'tenant_password', label: 'Client Login Password', type: 'text', required: true, placeholder: 'Simple password for client' },
];

export function getBaseQuestions(): OnboardingQuestion[] {
  return BASE_QUESTIONS;
}

export async function getIndustryQuestions(industry: string, businessName: string): Promise<{ questions: OnboardingQuestion[]; tokensUsed: number }> {
  const systemPrompt = `You are a marketing consultant onboarding a new client. Generate 5-8 industry-specific questions that would help understand this business for social media marketing and brand strategy. Return ONLY valid JSON array.`;

  const userPrompt = `Business: "${businessName}"
Industry: "${industry}"

Generate questions specific to ${industry} businesses. Each question should have:
- id: snake_case identifier
- label: the question text
- type: "text" | "textarea" | "select" | "number"
- options: array of options (only for select type)
- required: boolean
- placeholder: example answer

Examples for a restaurant: delivery platforms, menu highlights, branches count, price range
Examples for real estate: property types, service areas, price range, target buyers
Examples for beauty: services offered, booking system, specialties

Return JSON array only, no markdown.`;

  const { text, tokensUsed } = await askClaude(systemPrompt, userPrompt);

  try {
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const questions = JSON.parse(cleaned);
    return { questions, tokensUsed };
  } catch {
    return { questions: [], tokensUsed };
  }
}
