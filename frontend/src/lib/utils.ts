import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { AgentName, Platform } from './types'

// ─── Tailwind merge ───────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── Time ─────────────────────────────────────────────────────────────────────

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Platform ─────────────────────────────────────────────────────────────────

// Returns the lucide-react icon name for a given platform
export function getPlatformIcon(platform: Platform): string {
  const map: Record<Platform, string> = {
    instagram: 'Instagram',
    twitter: 'Twitter',
    linkedin: 'Linkedin',
    facebook: 'Facebook',
    tiktok: 'Music2',
    youtube: 'Youtube',
    bluesky: 'Cloud',
  }
  return map[platform] ?? 'Globe'
}

export function formatPlatformName(platform: Platform): string {
  const map: Record<Platform, string> = {
    instagram: 'Instagram',
    twitter: 'X (Twitter)',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    bluesky: 'Bluesky',
  }
  return map[platform] ?? platform
}

// ─── Text ─────────────────────────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export function getAgentLabel(agent: AgentName): string {
  const map: Record<AgentName, string> = {
    research: 'Research Agent',
    strategy: 'Strategy Agent',
    creative: 'Creative Agent',
    publishing: 'Publishing Agent',
  }
  return map[agent] ?? agent
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function getStatusColor(
  status: 'idle' | 'active' | 'complete' | 'error',
): string {
  const map = {
    idle: '#94a3b8',
    active: '#7c3aed',
    complete: '#10b981',
    error: '#ef4444',
  }
  return map[status]
}
