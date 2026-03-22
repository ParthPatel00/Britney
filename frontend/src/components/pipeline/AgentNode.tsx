'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Loader2, CheckCircle2, XCircle, Search, Lightbulb, Palette, Send } from 'lucide-react'
import type { AgentName } from '../../lib/types'
import { getAgentLabel } from '../../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'active' | 'complete' | 'error'

interface AgentNodeProps {
  agent: AgentName
  status: AgentStatus
  progress: number
  logs: string[]
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<AgentName, React.ReactNode> = {
  research: <Search size={20} />,
  strategy: <Lightbulb size={20} />,
  creative: <Palette size={20} />,
  publishing: <Send size={20} />,
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ progress, status }: { progress: number; status: AgentStatus }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const strokeColor =
    status === 'complete'
      ? '#10b981'
      : status === 'error'
        ? '#ef4444'
        : '#7c3aed'

  return (
    <svg width="72" height="72" className="absolute inset-0 m-auto" style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="#2d2d3d"
        strokeWidth="3"
      />
      {/* Progress */}
      <motion.circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Status Icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'idle') return <Clock size={16} style={{ color: '#94a3b8' }} />
  if (status === 'active') {
    return (
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Loader2 size={16} style={{ color: '#a855f7' }} />
      </motion.div>
    )
  }
  if (status === 'complete') return <CheckCircle2 size={16} style={{ color: '#10b981' }} />
  return <XCircle size={16} style={{ color: '#ef4444' }} />
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg = {
    idle: { label: 'Waiting', bg: '#1a1a2e', color: '#94a3b8', border: '#2d2d3d' },
    active: { label: 'Running', bg: 'rgba(124,58,237,0.15)', color: '#a855f7', border: '#7c3aed' },
    complete: { label: 'Complete', bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '#10b981' },
    error: { label: 'Error', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '#ef4444' },
  }[status]

  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

// ─── AgentNode ────────────────────────────────────────────────────────────────

export default function AgentNode({ agent, status, progress, logs }: AgentNodeProps) {
  const logsRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  const recentLogs = logs.slice(-8)

  const borderColor =
    status === 'active'
      ? '#7c3aed'
      : status === 'complete'
        ? '#10b981'
        : status === 'error'
          ? '#ef4444'
          : '#2d2d3d'

  const glowClass =
    status === 'active'
      ? 'agent-active'
      : status === 'complete'
        ? 'glow-green'
        : status === 'error'
          ? 'glow-red'
          : ''

  return (
    <motion.div
      layout
      variants={{
        idle: { opacity: 0.7, scale: 1 },
        active: { opacity: 1, scale: 1.02 },
        complete: { opacity: 1, scale: 1 },
        error: { opacity: 1, scale: 1 },
      }}
      animate={status}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl p-4 flex flex-col gap-3 min-h-[280px] ${glowClass}`}
      style={{
        background: '#12121a',
        border: `1px solid ${borderColor}`,
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{
              color:
                status === 'active'
                  ? '#a855f7'
                  : status === 'complete'
                    ? '#10b981'
                    : status === 'error'
                      ? '#ef4444'
                      : '#94a3b8',
            }}
            transition={{ duration: 0.3 }}
          >
            {AGENT_ICONS[agent]}
          </motion.div>
          <span className="text-sm font-semibold" style={{ color: '#f8fafc' }}>
            {getAgentLabel(agent)}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Progress ring + status icon */}
      <div className="relative w-[72px] h-[72px] mx-auto flex-shrink-0">
        <ProgressRing progress={progress} status={status} />
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-0.5"
            >
              <StatusIcon status={status} />
              {status === 'active' && (
                <span className="text-xs font-bold" style={{ color: '#a855f7' }}>
                  {Math.round(progress)}%
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Log stream */}
      <div
        ref={logsRef}
        className="flex-1 overflow-y-auto space-y-1 min-h-[80px]"
        style={{ scrollbarWidth: 'none' }}
      >
        {recentLogs.length === 0 ? (
          <p className="text-xs italic" style={{ color: '#475569' }}>
            {status === 'idle' ? 'Waiting to start...' : 'No logs yet'}
          </p>
        ) : (
          recentLogs.map((log, i) => (
            <motion.p
              key={`${log}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`text-xs leading-relaxed ${i === recentLogs.length - 1 && status === 'active' ? 'streaming-cursor' : ''}`}
              style={{ color: i === recentLogs.length - 1 ? '#94a3b8' : '#475569' }}
            >
              {log}
            </motion.p>
          ))
        )}
      </div>
    </motion.div>
  )
}
