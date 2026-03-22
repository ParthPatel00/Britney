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

// ─── Types ─────────────────────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'active' | 'complete' | 'error'

interface AgentNodeProps {
  agent: AgentName
  status: AgentStatus
  progress: number
  logs: string[]
}

// ─── Icon map ──────────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<AgentName, React.ReactNode> = {
  research: <Search size={16} />,
  strategy: <Lightbulb size={16} />,
  creative: <Palette size={16} />,
  publishing: <Send size={16} />,
}

// ─── Agent config per status ───────────────────────────────────────────────────

function getStatusStyles(status: AgentStatus) {
  switch (status) {
    case 'active':
      return {
        border: 'rgba(124,58,237,0.4)',
        glow: '0 0 0 1px rgba(124,58,237,0.3), 0 0 40px rgba(168,85,247,0.15)',
        iconColor: '#c4b5fd',
        iconBg: 'rgba(124,58,237,0.15)',
        ringStroke: '#7c3aed',
      }
    case 'complete':
      return {
        border: 'rgba(34,197,94,0.3)',
        glow: '0 0 0 1px rgba(34,197,94,0.2), 0 0 30px rgba(34,197,94,0.08)',
        iconColor: '#34d399',
        iconBg: 'rgba(34,197,94,0.1)',
        ringStroke: '#22c55e',
      }
    case 'error':
      return {
        border: 'rgba(239,68,68,0.3)',
        glow: '0 0 0 1px rgba(239,68,68,0.2), 0 0 30px rgba(239,68,68,0.08)',
        iconColor: '#f87171',
        iconBg: 'rgba(239,68,68,0.1)',
        ringStroke: '#ef4444',
      }
    default:
      return {
        border: 'rgba(255,255,255,0.06)',
        glow: 'none',
        iconColor: '#3f3f46',
        iconBg: 'rgba(255,255,255,0.03)',
        ringStroke: '#27272a',
      }
  }
}

// ─── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ progress, status }: { progress: number; status: AgentStatus }) {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference
  const styles = getStatusStyles(status)

  return (
    <svg
      width="50"
      height="50"
      className="absolute inset-0"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Track */}
      <circle
        cx="25"
        cy="25"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="2.5"
      />
      {/* Progress */}
      <motion.circle
        cx="25"
        cy="25"
        r={radius}
        fill="none"
        stroke={styles.ringStroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          filter: status === 'active' ? `drop-shadow(0 0 4px ${styles.ringStroke})` : 'none',
        }}
      />
    </svg>
  )
}

// ─── Status center ─────────────────────────────────────────────────────────────

function StatusCenter({ status, progress }: { status: AgentStatus; progress: number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center gap-0.5"
      >
        {status === 'idle' && <Clock size={13} style={{ color: '#3f3f46' }} />}
        {status === 'active' && (
          <>
            <Loader2 size={12} style={{ color: '#a78bfa' }} className="animate-spin" />
            <span className="text-[9px] font-bold" style={{ color: '#a78bfa' }}>
              {Math.round(progress)}%
            </span>
          </>
        )}
        {status === 'complete' && (
          <CheckCircle2 size={13} style={{ color: '#34d399', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }} />
        )}
        {status === 'error' && <XCircle size={13} style={{ color: '#f87171' }} />}
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg = {
    idle: { label: 'Waiting', color: '#3f3f46', bg: 'transparent', border: 'rgba(255,255,255,0.06)' },
    active: { label: 'Running', color: '#a78bfa', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.25)' },
    complete: { label: 'Complete', color: '#34d399', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    error: { label: 'Error', color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  }[status]

  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

// ─── AgentNode ─────────────────────────────────────────────────────────────────

export default function AgentNode({ agent, status, progress, logs }: AgentNodeProps) {
  const logsRef = useRef<HTMLDivElement>(null)
  const styles = getStatusStyles(status)

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  const recentLogs = logs.slice(-8)

  return (
    <motion.div
      layout
      animate={{
        opacity: status === 'idle' ? 0.5 : 1,
        scale: status === 'active' ? 1.01 : 1,
      }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl p-4 flex flex-col gap-3 min-h-[240px] relative overflow-hidden transition-all duration-300 ${status === 'active' ? 'agent-pulse' : ''}`}
      style={{
        background: 'rgba(18,18,26,0.9)',
        border: `1px solid ${styles.border}`,
        boxShadow: styles.glow,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Background radial on active */}
      {status === 'active' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%)',
          }}
        />
      )}
      {status === 'complete' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,197,94,0.05) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ color: styles.iconColor }}
            transition={{ duration: 0.3 }}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: styles.iconBg }}
          >
            {AGENT_ICONS[agent]}
          </motion.div>
          <span className="text-sm font-semibold" style={{ color: '#e4e4e7' }}>
            {getAgentLabel(agent)}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Progress ring */}
      <div className="relative w-[50px] h-[50px] mx-auto flex-shrink-0">
        <ProgressRing progress={status === 'complete' ? 100 : progress} status={status} />
        <div className="absolute inset-0 flex items-center justify-center">
          <StatusCenter status={status} progress={progress} />
        </div>
      </div>

      {/* Log stream */}
      <div
        ref={logsRef}
        className="flex-1 overflow-y-auto space-y-1 min-h-[80px] relative"
        style={{ scrollbarWidth: 'none' }}
      >
        {recentLogs.length === 0 ? (
          <p className="text-[10px] italic" style={{ color: '#27272a' }}>
            {status === 'idle' ? 'Waiting to start...' : 'No logs yet'}
          </p>
        ) : (
          recentLogs.map((log, i) => (
            <motion.p
              key={`${log}-${i}`}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`text-[10px] leading-relaxed font-mono ${
                i === recentLogs.length - 1 && status === 'active' ? 'streaming-cursor' : ''
              }`}
              style={{
                color: i === recentLogs.length - 1
                  ? status === 'active' ? '#a78bfa' : '#71717a'
                  : '#3f3f46',
              }}
            >
              {log}
            </motion.p>
          ))
        )}
      </div>
    </motion.div>
  )
}
