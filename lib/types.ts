export type UserRole = 'admin' | 'operator' | 'tenant';
export type TenantStatus = 'onboarding' | 'assessing' | 'strategy_review' | 'active' | 'paused' | 'churned';
export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
export type ContentType = 'image_post' | 'carousel' | 'reel' | 'story' | 'text_only' | 'video';
export type PostStatus = 'draft' | 'tea_approved' | 'pending_tenant' | 'tenant_approved' | 'scheduled' | 'publishing' | 'posted' | 'partially_posted' | 'failed' | 'rejected';

export interface ApiKeysJson {
  anthropic?: string;
  openai?: string;
}
export type CommentComponent = 'copy' | 'hashtags' | 'visual' | 'video' | 'general';
export type AssessmentStatus = 'pending' | 'researching' | 'analyzing' | 'generating' | 'review' | 'approved' | 'failed';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type AgentType = 'research' | 'competitor' | 'brand' | 'strategy';
export type AdPlatform = 'meta' | 'linkedin';
export type CampaignObjective =
  | 'OUTCOME_AWARENESS' | 'OUTCOME_TRAFFIC' | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS' | 'OUTCOME_APP_PROMOTION' | 'OUTCOME_SALES';
export type CampaignStatus =
  | 'draft' | 'pending_review' | 'tenant_approved' | 'active'
  | 'paused' | 'completed' | 'disapproved' | 'archived';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string | null;
  api_keys?: ApiKeysJson | null;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  description: string | null;
  city: string | null;
  country: string;
  website: string | null;
  google_maps_url: string | null;
  social_links: Record<string, string>;
  brand_config: Record<string, unknown>;
  channels: Platform[];
  posting_frequency: string;
  posts_per_week: number;
  video_ideas_per_month: number;
  primary_language: string;
  secondary_language: string;
  status: TenantStatus;
  onboarding_data: Record<string, unknown>;
  api_keys?: ApiKeysJson | null;
  monthly_fee?: number | null;
  billing_currency?: string;
  billing_start_date?: string | null;
  billing_duration_months?: number | null;
  billing_day?: number;
  auto_invoice?: boolean;
  auto_reports?: boolean;
  onboarded_at: string | null;
  created_at: string;
}

export interface TenantReport {
  id: string;
  tenant_id: string;
  report_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  data: {
    posts_published: number;
    posts_scheduled: number;
    posts_pending_approval: number;
    posts_drafts: number;
    platforms_active: string[];
    upcoming_posts: Array<{ scheduled_at: string; copy_primary: string; platforms: string[] }>;
    summary: string;
  };
  sent_to_tenant_at: string | null;
  created_at: string;
}

export interface SocialConnection {
  id: string;
  tenant_id: string;
  platform: Platform;
  credentials: Record<string, unknown>;
  connected_at: string;
  expires_at: string | null;
  status: string;
}

export interface Post {
  id: string;
  tenant_id: string;
  content_type: ContentType;
  platforms: Platform[];
  copy_primary: string | null;
  copy_secondary: string | null;
  platform_copies: Record<string, { primary: string; secondary: string }>;
  hashtags: string[];
  media_urls: string[];
  video_idea: { concept: string; scenario: string; texts: string[]; duration: string } | null;
  generated_image_url: string | null;
  scheduled_at: string | null;
  status: PostStatus;
  tea_approved_at: string | null;
  tenant_approved_at: string | null;
  publish_results: Record<string, unknown>;
  batch_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  component: CommentComponent;
  message: string;
  resolved: boolean;
  created_at: string;
  user_name?: string;
}

export interface Assessment {
  id: string;
  tenant_id: string;
  status: AssessmentStatus;
  research_data: Record<string, unknown> | null;
  competitor_data: Record<string, unknown> | null;
  brand_audit: Record<string, unknown> | null;
  strategy_data: Record<string, unknown> | null;
  tea_approved: boolean;
  tenant_approved: boolean;
  tokens_used: number;
  cost_usd: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  items: { description: string; amount: number }[];
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface SessionData {
  user_id: string;
  role: UserRole;
  tenant_id: string | null;
  is_logged_in: boolean;
}

export interface AdAccount {
  id: string;
  tenant_id: string;
  platform: AdPlatform;
  external_account_id: string;
  account_name: string | null;
  currency: string;
  timezone: string | null;
  status: 'active' | 'disabled' | 'suspended' | 'pending_deletion';
  spend_cap: number | null;
  connected_at: string;
  updated_at: string;
}

export interface AdCampaign {
  id: string;
  tenant_id: string;
  ad_account_id: string;
  external_id: string | null;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  budget_type: 'daily' | 'lifetime' | null;
  daily_budget: number | null;
  lifetime_budget: number | null;
  bid_strategy: string | null;
  start_date: string | null;
  end_date: string | null;
  tea_approved_at: string | null;
  tenant_approved_at: string | null;
  disapproval_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdSetTargeting {
  geo_locations?: { countries?: string[]; cities?: { name: string; radius: number }[] };
  age_min?: number;
  age_max?: number;
  genders?: number[];  // 1=male, 2=female
  interests?: { id: string; name: string }[];
  behaviors?: { id: string; name: string }[];
  custom_audiences?: string[];
  excluded_custom_audiences?: string[];
  publisher_platforms?: string[];
  facebook_positions?: string[];
  device_platforms?: string[];
}

export interface AdSet {
  id: string;
  campaign_id: string;
  external_id: string | null;
  name: string;
  targeting: AdSetTargeting;
  optimization_goal: string | null;
  billing_event: string | null;
  bid_amount: number | null;
  daily_budget: number | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  created_at: string;
}

export interface AdCreative {
  headline?: string;
  body?: string;
  cta?: string;
  image_url?: string;
  video_url?: string;
  link_url?: string;
}

export interface Ad {
  id: string;
  ad_set_id: string;
  external_id: string | null;
  name: string;
  source_post_id: string | null;
  creative: AdCreative;
  landing_url: string | null;
  status: string;
  effective_status: string | null;
  created_at: string;
}

export interface AdMetric {
  id: string;
  ad_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversion_value: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  reach: number | null;
  frequency: number | null;
  synced_at: string;
}

export interface AdAudience {
  id: string;
  tenant_id: string;
  ad_account_id: string;
  external_id: string | null;
  name: string;
  type: 'custom' | 'lookalike' | 'saved';
  spec: Record<string, unknown>;
  size_estimate: number | null;
  status: string;
  created_at: string;
}
