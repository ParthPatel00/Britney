'use client'

import { motion } from 'framer-motion'
import AgentNode from './AgentNode'
import { useCampaignStore } from '../../store/campaignStore'
import type { AgentName } from '../../lib/types'

// ─── Types ─────────────────────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'active' | 'complete' | 'error'

// ─── Connector ─────────────────────────────────────────────────────────────────

function Connector({ active }: { active: boolean }) {
  return (
    <div className="hidden md:flex items-center justify-center flex-shrink-0 w-12">
      <div className="relative w-full h-px" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {active && (
          <motion.div
            className="absolute inset-0 h-px"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              background: 'linear-gradient(90deg, #22c55e, #34d399)',
              boxShadow: '0 0 8px rgba(34,197,94,0.5)',
            }}
          />
        )}
        {/* Arrow dot */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: active ? '#22c55e' : 'rgba(255,255,255,0.1)',
            boxShadow: active ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
          }}
        />
      </div>
    </div>
  )
}

// ─── Agents ─────────────────────────────────────────────────────────────────────

const AGENTS: AgentName[] = ['research', 'strategy', 'creative', 'publishing']

// ─── PipelineView ──────────────────────────────────────────────────────────────

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
          const connectorActive = prevStatus === 'complete'

          return (
            <div key={agent}>
              {idx > 0 && (
                <div className="flex justify-center my-1.5">
                  <div className="relative w-px h-6">
                    <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    {connectorActive && (
                      <motion.div
                        className="absolute inset-0"
                        initial={{ scaleY: 0, originY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.4 }}
                        style={{
                          background: 'linear-gradient(180deg, #22c55e, #34d399)',
                          boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                        }}
                      />
                    )}
                  </div>
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
