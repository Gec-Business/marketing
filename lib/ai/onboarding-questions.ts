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
  { id: 'sub_category', label: 'Sub-category', type: 'text', required: false, placeholder: 'Georgian cuisine, Luxury apartments, Hair salon...' },
  { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Tbilisi' },
  { id: 'neighborhood', label: 'Neighborhood / District', type: 'text', required: false, placeholder: 'Vake, Saburtalo, Didube...' },
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
  { id: 'secondary_language', label: 'Secondary Language', type: 'select', required: false, options: ['none', 'ka', 'en', 'ru'] },
  { id: 'price_positioning', label: 'Price Positioning', type: 'select', required: true, options: ['budget', 'mid-range', 'premium', 'luxury'] },
  { id: 'usp', label: 'What makes this business different? (one sentence)', type: 'textarea', required: true, placeholder: 'Only shawarma place open 24/7 in Vake with homemade sauces' },
  { id: 'target_audience', label: 'Target Audience Description', type: 'textarea', required: false, placeholder: '18-40 year olds in residential areas...' },
  { id: 'marketing_goal', label: 'Primary Marketing Goal', type: 'select', required: true, options: ['awareness', 'followers', 'leads', 'sales', 'retention'] },
  { id: 'marketing_budget', label: 'Monthly Marketing Budget (GEL)', type: 'select', required: false, options: ['0 (organic only)', '100-300', '300-700', '700-1500', '1500+'] },
  { id: 'paid_ads_before', label: 'Has the client run paid ads before?', type: 'select', required: false, options: ['no', 'yes - Facebook/Instagram', 'yes - Google', 'yes - multiple platforms'] },
  { id: 'operating_hours_weekday', label: 'Operating Hours (Weekdays)', type: 'text', required: false, placeholder: '10:00 - 22:00' },
  { id: 'operating_hours_weekend', label: 'Operating Hours (Weekends)', type: 'text', required: false, placeholder: '11:00 - 23:00' },
  { id: 'delivery_platforms', label: 'Delivery / Booking Platforms', type: 'multiselect', required: false, options: ['Wolt', 'Glovo', 'Bolt Food', 'Airbnb', 'Booking.com', 'Other'] },
  { id: 'client_competitors', label: "Client's Top 3 Competitors", type: 'textarea', required: false, placeholder: 'Lavash, Yalla, Döner Express' },
  { id: 'brand_assets', label: 'Brand Assets Available', type: 'multiselect', required: false, options: ['Logo', 'Brand colors', 'Professional photos', 'Brand guidelines', 'None'] },
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
- type: "text" | "textarea" | "select" | "multiselect" | "number"
- options: array of options (for select and multiselect types)
- required: boolean
- placeholder: example answer

IMPORTANT: Use "multiselect" (not "select") when the user should be able to pick MULTIPLE answers.
Examples of multiselect questions: target customer types, services offered, delivery platforms, marketing goals, business sizes served, social media topics.
Examples of single select questions: price range, business size (single answer), primary cuisine type.

Examples for a restaurant: delivery platforms (multiselect), menu highlights (textarea), branches count (number), price range (select)
Examples for real estate: property types (multiselect), service areas (multiselect), price range (select), target buyers (multiselect)
Examples for beauty: services offered (multiselect), booking system (select), specialties (multiselect)

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
