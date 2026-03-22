import type {
  Brand,
  Campaign,
  Post,
  Trend,
  AutoPilotConfig,
  Platform,
  PublishResult,
} from './types'

// ─── Base ─────────────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: {
      Accept: 'application/json',
      ...(options?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      msg = body?.detail ?? body?.message ?? msg
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, msg)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<Brand[]> {
  return request<Brand[]>('/brand')
}

export async function getBrand(id: string): Promise<Brand> {
  return request<Brand>(`/brand/${id}`)
}

export async function createBrand(form: FormData): Promise<Brand> {
  return request<Brand>('/brand', {
    method: 'POST',
    body: form,
    headers: {},
  })
}

// ─── Autopilot ───────────────────────────────────────────────────────────────

export async function getAutopilot(brandId: string): Promise<AutoPilotConfig> {
  return request<AutoPilotConfig>(`/brand/${brandId}/autopilot`)
}

export async function updateAutopilot(
  brandId: string,
  config: Partial<AutoPilotConfig>,
): Promise<AutoPilotConfig> {
  return request<AutoPilotConfig>(`/brand/${brandId}/autopilot`, {
    method: 'PUT',
    body: JSON.stringify(config),
  })
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function getCampaigns(brandId: string): Promise<Campaign[]> {
  return request<Campaign[]>(`/campaign?brand_id=${brandId}`)
}

export async function getCampaign(id: string): Promise<Campaign> {
  return request<Campaign>(`/campaign/${id}`)
}

export async function createCampaign(payload: {
  brand_id: string
  goal: string
  platforms: Platform[]
  num_posts: number
}): Promise<Campaign> {
  return request<Campaign>('/campaign', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function startCampaign(id: string): Promise<Campaign> {
  return request<Campaign>(`/campaign/${id}/start`, { method: 'POST' })
}

export async function approveStrategy(id: string): Promise<Campaign> {
  return request<Campaign>(`/campaign/${id}/approve-strategy`, { method: 'POST' })
}

export async function approveContent(
  id: string,
  approvedPostIds: string[],
  rejectedPostIds: string[],
): Promise<Campaign> {
  return request<Campaign>(`/campaign/${id}/approve-content`, {
    method: 'POST',
    body: JSON.stringify({
      approved_post_ids: approvedPostIds,
      rejected_post_ids: rejectedPostIds,
    }),
  })
}

// ─── Posts / Content ─────────────────────────────────────────────────────────

export async function getCampaignPosts(campaignId: string): Promise<Post[]> {
  return request<Post[]>(`/content/campaign/${campaignId}`)
}

export async function getPost(postId: string): Promise<Post> {
  return request<Post>(`/content/${postId}`)
}

export async function approvePost(postId: string): Promise<Post> {
  return request<Post>(`/content/${postId}/approve`, { method: 'POST' })
}

export async function rejectPost(postId: string): Promise<Post> {
  return request<Post>(`/content/${postId}/reject`, { method: 'POST' })
}

export async function selectVariant(
  postId: string,
  variantId: string,
): Promise<Post> {
  return request<Post>(`/content/${postId}/select-variant`, {
    method: 'POST',
    body: JSON.stringify({ variant_id: variantId }),
  })
}

// ─── Trends ───────────────────────────────────────────────────────────────────

export async function getTrends(brandId: string): Promise<Trend[]> {
  return request<Trend[]>(`/trends?brand_id=${brandId}`)
}

export async function hijackTrend(
  brandId: string,
  trendId: string,
): Promise<Campaign> {
  return request<Campaign>(
    `/trends/hijack?brand_id=${brandId}&trend_id=${trendId}`,
    { method: 'POST' },
  )
}

// ─── Publishing ───────────────────────────────────────────────────────────────

export async function publishNow(
  postIds: string[],
  platforms: Platform[],
): Promise<PublishResult> {
  return request<PublishResult>('/publish/now', {
    method: 'POST',
    body: JSON.stringify({ post_ids: postIds, platforms }),
  })
}

export async function schedulePost(
  postIds: string[],
  platforms: Platform[],
  scheduledAt: string,
): Promise<PublishResult> {
  return request<PublishResult>('/publish/schedule', {
    method: 'POST',
    body: JSON.stringify({
      post_ids: postIds,
      platforms,
      scheduled_at: scheduledAt,
    }),
  })
}
