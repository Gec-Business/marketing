export const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'tiktok'] as const;

export const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  tiktok: '#000000',
};

export const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

export const STATUS_COLORS: Record<string, string> = {
  onboarding: 'bg-yellow-100 text-yellow-700',
  assessing: 'bg-blue-100 text-blue-700',
  strategy_review: 'bg-purple-100 text-purple-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-gray-100 text-gray-500',
  churned: 'bg-red-100 text-red-700',
};

export const ASSESSMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  researching: 'bg-blue-100 text-blue-700',
  analyzing: 'bg-indigo-100 text-indigo-700',
  generating: 'bg-purple-100 text-purple-700',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export const AGENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-300',
  running: 'bg-yellow-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  retrying: 'bg-orange-500 animate-pulse',
};

export const POST_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  tea_approved: 'bg-blue-100 text-blue-700',
  pending_tenant: 'bg-yellow-100 text-yellow-700',
  tenant_approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  publishing: 'bg-orange-100 text-orange-700',
  posted: 'bg-green-100 text-green-700',
  partially_posted: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};
