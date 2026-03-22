'use client'

import { motion } from 'framer-motion'
import AgentNode from './AgentNode'
import { useCampaignStore } from '../../store/campaignStore'
import type { AgentName } from '../../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'active' | 'complete' | 'error'

// ─── Connector ────────────────────────────────────────────────────────────────

function Connector({ active }: { active: boolean }) {
  return (
    <div className="hidden md:flex items-center justify-center flex-shrink-0 w-10">
      <svg width="40" height="2" viewBox="0 0 40 2" fill="none">
        {/* Track */}
        <line x1="0" y1="1" x2="40" y2="1" stroke="#27272a" strokeWidth="1.5" />
        {/* Active fill */}
        {active && (
          <motion.line
            x1="0"
            y1="1"
            x2="40"
            y2="1"
            stroke="#22c55e"
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      {/* Desktop: horizontal row */}
      <div className="hidden md:flex items-stretch gap-0">
        {AGENTS.map((agent, idx) => {
          const status: AgentStatus = pipelineState[agent]
          const prevStatus: AgentStatus =
            idx > 0 ? pipelineState[AGENTS[idx - 1]] : 'complete'
          const connectorActive = prevStatus === 'complete'

          return (
            <div key={agent} className="flex items-center flex-1 gap-0 min-w-0">
              {idx > 0 && <Connector active={connectorActive} />}
              <div className="flex-1 min-w-0">
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
      <div className="flex md:hidden flex-col gap-3">
        {AGENTS.map((agent, idx) => {
          const status: AgentStatus = pipelineState[agent]
          const prevStatus: AgentStatus =
            idx > 0 ? pipelineState[AGENTS[idx - 1]] : 'complete'

          return (
            <div key={agent}>
              {idx > 0 && (
                <div className="flex justify-center my-1.5">
                  <motion.div
                    className="w-px h-5"
                    animate={{
                      background: prevStatus === 'complete' ? '#22c55e' : '#27272a',
                    }}
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
