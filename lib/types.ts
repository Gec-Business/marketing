export type UserRole = 'admin' | 'operator' | 'tenant';
export type TenantStatus = 'onboarding' | 'assessing' | 'strategy_review' | 'active' | 'paused' | 'churned';
export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
export type ContentType = 'image_post' | 'carousel' | 'reel' | 'story' | 'text_only' | 'video';
export type PostStatus = 'draft' | 'tea_approved' | 'pending_tenant' | 'tenant_approved' | 'scheduled' | 'publishing' | 'posted' | 'failed' | 'rejected';
export type CommentComponent = 'copy' | 'hashtags' | 'visual' | 'video' | 'general';
export type AssessmentStatus = 'pending' | 'researching' | 'analyzing' | 'generating' | 'review' | 'approved' | 'failed';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type AgentType = 'research' | 'competitor' | 'brand' | 'strategy';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string | null;
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
  onboarded_at: string | null;
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
