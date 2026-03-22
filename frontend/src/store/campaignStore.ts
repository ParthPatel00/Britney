import { create } from 'zustand'
import type { Brand, Campaign, Post, Trend, AgentEvent, AgentName } from '../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'active' | 'complete' | 'error'

type PipelineStateMap = Record<AgentName, AgentStatus>
type PipelineLogsMap = Record<AgentName, string[]>
type PipelineProgressMap = Record<AgentName, number>

const AGENTS: AgentName[] = ['research', 'strategy', 'creative', 'publishing']

function defaultStatusMap(): PipelineStateMap {
  return { research: 'idle', strategy: 'idle', creative: 'idle', publishing: 'idle' }
}

function defaultLogsMap(): PipelineLogsMap {
  return { research: [], strategy: [], creative: [], publishing: [] }
}

function defaultProgressMap(): PipelineProgressMap {
  return { research: 0, strategy: 0, creative: 0, publishing: 0 }
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface CampaignState {
  // Brand
  currentBrand: Brand | null
  brands: Brand[]

  // Campaign
  currentCampaign: Campaign | null

  // Pipeline
  pipelineState: PipelineStateMap
  pipelineLogs: PipelineLogsMap
  pipelineProgress: PipelineProgressMap

  // Content
  posts: Post[]

  // Trends
  trends: Trend[]

  // Actions
  setBrand: (brand: Brand) => void
  setBrands: (brands: Brand[]) => void
  setCampaign: (campaign: Campaign) => void
  setPosts: (posts: Post[]) => void
  setTrends: (trends: Trend[]) => void
  updatePost: (post: Post) => void
  handleAgentEvent: (event: AgentEvent) => void
  resetPipeline: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCampaignStore = create<CampaignState>((set) => ({
  currentBrand: null,
  brands: [],
  currentCampaign: null,
  pipelineState: defaultStatusMap(),
  pipelineLogs: defaultLogsMap(),
  pipelineProgress: defaultProgressMap(),
  posts: [],
  trends: [],

  setBrand: (brand) => set({ currentBrand: brand }),

  setBrands: (brands) =>
    set((state) => ({
      brands,
      currentBrand: state.currentBrand ?? brands[0] ?? null,
    })),

  setCampaign: (campaign) =>
    set({
      currentCampaign: campaign,
      pipelineState: defaultStatusMap(),
      pipelineLogs: defaultLogsMap(),
      pipelineProgress: defaultProgressMap(),
    }),

  setPosts: (posts) => set({ posts }),

  setTrends: (trends) => set({ trends }),

  updatePost: (post) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === post.id ? post : p)),
    })),

  handleAgentEvent: (event) => {
    const agent = event.agent_name

    // Validate agent name is in our known list
    if (!AGENTS.includes(agent)) return

    set((state) => {
      const newPipelineState = { ...state.pipelineState }
      const newLogs = { ...state.pipelineLogs }
      const newProgress = { ...state.pipelineProgress }

      // Append log message (keep last 50)
      if (event.message) {
        const currentLogs = newLogs[agent] ?? []
        newLogs[agent] = [...currentLogs, event.message].slice(-50)
      }

      switch (event.event_type) {
        case 'agent_start':
          newPipelineState[agent] = 'active'
          newProgress[agent] = 0
          break

        case 'agent_progress':
          newPipelineState[agent] = 'active'
          newProgress[agent] = event.progress ?? newProgress[agent]
          break

        case 'agent_log':
          // logs already updated above
          break

        case 'agent_complete':
          newPipelineState[agent] = 'complete'
          newProgress[agent] = 100
          break

        case 'agent_error':
          newPipelineState[agent] = 'error'
          break

        case 'human_review_required':
          // Handled at component level via campaign status polling
          break

        case 'pipeline_complete':
          // Mark all active/idle agents as complete
          for (const a of AGENTS) {
            if (newPipelineState[a] === 'active') {
              newPipelineState[a] = 'complete'
              newProgress[a] = 100
            }
          }
          break

        case 'heartbeat':
          // No-op
          break
      }

      // Update campaign status if provided in data
      const newCampaignStatus = event.data?.campaign_status as string | undefined
      const updatedCampaign =
        newCampaignStatus && state.currentCampaign
          ? { ...state.currentCampaign, status: newCampaignStatus as Campaign['status'] }
          : state.currentCampaign

      return {
        pipelineState: newPipelineState,
        pipelineLogs: newLogs,
        pipelineProgress: newProgress,
        currentCampaign: updatedCampaign,
      }
    })
  },

  resetPipeline: () =>
    set({
      pipelineState: defaultStatusMap(),
      pipelineLogs: defaultLogsMap(),
      pipelineProgress: defaultProgressMap(),
    }),
}))
