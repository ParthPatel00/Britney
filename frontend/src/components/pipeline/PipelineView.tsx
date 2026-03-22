'use client'

import { motion } from 'framer-motion'
import AgentNode from './AgentNode'
import { useCampaignStore } from '../../store/campaignStore'
import type { AgentName } from '../../lib/types'

// ─── Animated Connector ───────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'active' | 'complete' | 'error'

function AgentConnector({ active }: { active: boolean }) {
  return (
    <div className="hidden md:flex items-center flex-shrink-0 w-12">
      <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Track line */}
        <line x1="0" y1="12" x2="48" y2="12" stroke="#2d2d3d" strokeWidth="2" strokeDasharray="4 4" />
        {/* Animated fill */}
        {active && (
          <motion.line
            x1="0"
            y1="12"
            x2="48"
            y2="12"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
        {/* Arrow head */}
        <motion.path
          d="M40 8 L48 12 L40 16"
          fill="none"
          stroke={active ? '#10b981' : '#2d2d3d'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ stroke: active ? '#10b981' : '#2d2d3d' }}
          transition={{ duration: 0.3 }}
        />
      </svg>
    </div>
  )
}

// ─── Agents ────────────────────────────────────────────────────────────────────

const AGENTS: AgentName[] = ['research', 'strategy', 'creative', 'publishing']

// ─── PipelineView ─────────────────────────────────────────────────────────────

export default function PipelineView() {
  const pipelineState = useCampaignStore((s) => s.pipelineState)
  const pipelineLogs = useCampaignStore((s) => s.pipelineLogs)
  const pipelineProgress = useCampaignStore((s) => s.pipelineProgress)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Desktop: horizontal row */}
      <div className="hidden md:flex items-stretch gap-0">
        {AGENTS.map((agent, idx) => {
          const status: AgentStatus = pipelineState[agent]
          const prevStatus: AgentStatus = idx > 0 ? pipelineState[AGENTS[idx - 1]] : 'complete'
          const connectorActive = prevStatus === 'complete'

          return (
            <div key={agent} className="flex items-stretch flex-1 gap-0">
              {idx > 0 && <AgentConnector active={connectorActive} />}
              <div className="flex-1">
                <AgentNode
                  agent={agent}
                  status={status}
                  progress={pipelineProgress[agent]}
                  logs={pipelineLogs[agent]}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical stack */}
      <div className="flex md:hidden flex-col gap-4">
        {AGENTS.map((agent, idx) => {
          const status: AgentStatus = pipelineState[agent]
          const prevStatus: AgentStatus = idx > 0 ? pipelineState[AGENTS[idx - 1]] : 'complete'

          return (
            <div key={agent}>
              {idx > 0 && (
                <div className="flex justify-center my-1">
                  <motion.div
                    className="w-px h-6"
                    animate={{ background: prevStatus === 'complete' ? '#10b981' : '#2d2d3d' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
              <AgentNode
                agent={agent}
                status={status}
                progress={pipelineProgress[agent]}
                logs={pipelineLogs[agent]}
              />
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
