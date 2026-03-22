// ─── Platform ────────────────────────────────────────────────────────────────

export type Platform =
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'bluesky'

// ─── Brand ───────────────────────────────────────────────────────────────────

export interface BrandDNA {
  colors: string[]
  voice_tone: string
  visual_style: string
  target_audience: string
  personality: string
  keywords: string[]
}

export interface Brand {
  id: string
  name: string
  niche: string
  description: string
  website_url?: string
  brand_dna?: BrandDNA
  created_at: string
  updated_at: string
}

// ─── Campaign ────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | 'created'
  | 'running'
  | 'awaiting_strategy_review'
  | 'strategy_approved'
  | 'awaiting_content_review'
  | 'content_approved'
  | 'publishing'
  | 'completed'
  | 'failed'

export interface Campaign {
  id: string
  brand_id: string
  goal: string
  platforms: Platform[]
  num_posts: number
  status: CampaignStatus
  research?: Record<string, unknown>
  strategy?: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Post / Content ───────────────────────────────────────────────────────────

export interface MediaAsset {
  id: string
  filename: string
  url: string
  type: 'image' | 'video'
}

export interface PostVariant {
  id: string
  label: 'A' | 'B'
  caption: string
  media?: MediaAsset
  selected: boolean
}

export type PostStatus = 'pending' | 'approved' | 'rejected' | 'published'

export interface Post {
  id: string
  campaign_id: string
  platform: Platform
  status: PostStatus
  variants: PostVariant[]
  selected_variant_id?: string
  published_url?: string
  scheduled_at?: string
  created_at: string
  updated_at: string
}

// ─── Trends ──────────────────────────────────────────────────────────────────

export type TrendCategory = 'tech' | 'culture' | 'lifestyle' | 'business' | 'other'

export interface Trend {
  id: string
  brand_id: string
  topic: string
  summary: string
  hijack_idea: string
  score: number
  category: TrendCategory
  created_at: string
}

// ─── Autopilot ───────────────────────────────────────────────────────────────

export interface AutoPilotConfig {
  brand_id: string
  enabled: boolean
  platforms: Platform[]
  num_posts: number
  frequency: 'daily' | 'weekly' | 'monthly'
  auto_approve_strategy: boolean
  auto_approve_content: boolean
  auto_publish: boolean
}

// ─── SSE / Pipeline Events ───────────────────────────────────────────────────

export type AgentEventType =
  | 'agent_start'
  | 'agent_log'
  | 'agent_progress'
  | 'agent_complete'
  | 'agent_error'
  | 'human_review_required'
  | 'pipeline_complete'
  | 'heartbeat'

export type AgentName = 'research' | 'strategy' | 'creative' | 'publishing'

export interface AgentEvent {
  event_type: AgentEventType
  agent_name: AgentName
  campaign_id: string
  message: string
  progress: number
  data: Record<string, unknown>
  timestamp: string
}

// ─── Publishing ───────────────────────────────────────────────────────────────

export interface PlatformPublishResult {
  platform: Platform
  post_id: string
  published_url?: string
  success: boolean
  error?: string
}

export interface PublishResult {
  results: PlatformPublishResult[]
  published_at: string
}
