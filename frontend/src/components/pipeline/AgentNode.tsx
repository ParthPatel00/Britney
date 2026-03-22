'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Lightbulb,
  Palette,
  Send,
} from 'lucide-react'
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
  research: <Search size={18} />,
  strategy: <Lightbulb size={18} />,
  creative: <Palette size={18} />,
  publishing: <Send size={18} />,
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ progress, status }: { progress: number; status: AgentStatus }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const strokeColor =
    status === 'complete'
      ? '#22c55e'
      : status === 'error'
        ? '#ef4444'
        : status === 'active'
          ? '#e4e4e7'
          : '#27272a'

  return (
    <svg
      width="56"
      height="56"
      className="absolute inset-0"
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke="#27272a"
        strokeWidth="2.5"
      />
      <motion.circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Status center ────────────────────────────────────────────────────────────

function StatusCenter({ status, progress }: { status: AgentStatus; progress: number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.7 }}
        transition={{ duration: 0.18 }}
        className="flex flex-col items-center gap-0.5"
      >
        {status === 'idle' && <Clock size={14} className="text-zinc-600" />}
        {status === 'active' && (
          <>
            <Loader2 size={14} className="text-zinc-300 animate-spin" />
            <span className="text-[10px] font-bold text-zinc-300">{Math.round(progress)}%</span>
          </>
        )}
        {status === 'complete' && <CheckCircle2 size={14} className="text-green-500" />}
        {status === 'error' && <XCircle size={14} className="text-red-400" />}
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg = {
    idle: { label: 'Waiting', color: '#52525b', bg: 'transparent', border: '#27272a' },
    active: { label: 'Running', color: '#e4e4e7', bg: 'rgba(250,250,250,0.06)', border: 'rgba(250,250,250,0.15)' },
    complete: { label: 'Complete', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
    error: { label: 'Error', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  }[status]

  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

// ─── AgentNode ────────────────────────────────────────────────────────────────

export default function AgentNode({ agent, status, progress, logs }: AgentNodeProps) {
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  const recentLogs = logs.slice(-8)

  const borderColor =
    status === 'active'
      ? 'rgba(250,250,250,0.15)'
      : status === 'complete'
        ? 'rgba(34,197,94,0.3)'
        : status === 'error'
          ? 'rgba(239,68,68,0.3)'
          : '#1c1c1f'

  const iconColor =
    status === 'active'
      ? '#e4e4e7'
      : status === 'complete'
        ? '#22c55e'
        : status === 'error'
          ? '#ef4444'
          : '#3f3f46'

  return (
    <motion.div
      layout
      animate={{
        opacity: status === 'idle' ? 0.6 : 1,
        scale: status === 'active' ? 1.01 : 1,
      }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl p-4 flex flex-col gap-3 min-h-[260px] ${status === 'active' ? 'agent-pulse' : ''}`}
      style={{
        background: '#111113',
        border: `1px solid ${borderColor}`,
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ color: iconColor }}
            transition={{ duration: 0.3 }}
          >
            {AGENT_ICONS[agent]}
          </motion.div>
          <span className="text-sm font-semibold text-zinc-100">
            {getAgentLabel(agent)}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Progress ring */}
      <div className="relative w-14 h-14 mx-auto flex-shrink-0">
        <ProgressRing progress={progress} status={status} />
        <div className="absolute inset-0 flex items-center justify-center">
          <StatusCenter status={status} progress={progress} />
        </div>
      </div>

      {/* Log stream */}
      <div
        ref={logsRef}
        className="flex-1 overflow-y-auto space-y-1 min-h-[80px]"
        style={{ scrollbarWidth: 'none' }}
      >
        {recentLogs.length === 0 ? (
          <p className="text-[11px] italic text-zinc-700">
            {status === 'idle' ? 'Waiting to start...' : 'No logs yet'}
          </p>
        ) : (
          recentLogs.map((log, i) => (
            <motion.p
              key={`${log}-${i}`}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`text-[11px] leading-relaxed font-mono ${
                i === recentLogs.length - 1 && status === 'active' ? 'streaming-cursor' : ''
              }`}
              style={{ color: i === recentLogs.length - 1 ? '#a1a1aa' : '#52525b' }}
            >
              {log}
            </motion.p>
          ))
        )}
      </div>
    </motion.div>
  )
}
