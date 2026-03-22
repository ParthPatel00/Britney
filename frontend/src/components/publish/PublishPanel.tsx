'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Zap, Check, ExternalLink, Loader2, Radio } from 'lucide-react'
import { toast } from 'sonner'
import { publishNow, schedulePost } from '../../lib/api'
import { formatPlatformName } from '../../lib/utils'
import type { Platform, PlatformPublishResult } from '../../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublishPanelProps {
  postIds: string[]
  availablePlatforms: Platform[]
}

// ─── PublishPanel ─────────────────────────────────────────────────────────────

export default function PublishPanel({ postIds, availablePlatforms }: PublishPanelProps) {
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([...availablePlatforms])
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PlatformPublishResult[] | null>(null)

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform')
      return
    }
    if (mode === 'schedule' && !scheduledAt) {
      toast.error('Please select a date and time')
      return
    }
    if (postIds.length === 0) {
      toast.error('No posts selected')
      return
    }

    setLoading(true)
    try {
      let result
      if (mode === 'now') {
        result = await publishNow(postIds, selectedPlatforms)
      } else {
        result = await schedulePost(postIds, selectedPlatforms, scheduledAt)
      }
      setResults(result.results)
      toast.success(mode === 'now' ? 'Published successfully!' : 'Posts scheduled!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setLoading(false)
    }
  }

  if (results) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 space-y-4"
        style={{ background: '#12121a', border: '1px solid #2d2d3d' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Check size={18} style={{ color: '#10b981' }} />
          <h3 className="text-base font-bold" style={{ color: '#f8fafc' }}>
            {mode === 'now' ? 'Published!' : 'Scheduled!'}
          </h3>
        </div>

        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.platform}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: '#1a1a2e', border: '1px solid #2d2d3d' }}
            >
              <div className="flex items-center gap-2">
                <span className={`platform-${r.platform} inline-block w-2 h-2 rounded-full`} />
                <span className="text-sm font-medium" style={{ color: '#f8fafc' }}>
                  {formatPlatformName(r.platform)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {r.success ? (
                  <>
                    <Check size={14} style={{ color: '#10b981' }} />
                    {r.published_url && (
                      <a
                        href={r.published_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                        style={{ color: '#a855f7' }}
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </>
                ) : (
                  <span className="text-xs" style={{ color: '#ef4444' }}>
                    {r.error ?? 'Failed'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 space-y-5"
      style={{ background: '#12121a', border: '1px solid #2d2d3d' }}
    >
      <h3 className="text-base font-bold" style={{ color: '#f8fafc' }}>
        Publish Posts
      </h3>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['now', 'schedule'] as const).map((m) => {
          const isActive = mode === m
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150"
              style={{
                background: isActive ? 'rgba(124,58,237,0.2)' : '#1a1a2e',
                border: `1px solid ${isActive ? '#7c3aed' : '#2d2d3d'}`,
                color: isActive ? '#a855f7' : '#94a3b8',
              }}
            >
              {m === 'now' ? <Zap size={14} /> : <Calendar size={14} />}
              {m === 'now' ? 'Publish Now' : 'Schedule'}
            </button>
          )
        })}
      </div>

      {/* Platforms */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
          Platforms
        </p>
        <div className="grid grid-cols-2 gap-2">
          {availablePlatforms.map((p) => {
            const isActive = selectedPlatforms.includes(p)
            return (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-150"
                style={{
                  background: isActive ? 'rgba(124,58,237,0.15)' : '#1a1a2e',
                  border: `1px solid ${isActive ? '#7c3aed' : '#2d2d3d'}`,
                  color: isActive ? '#a855f7' : '#94a3b8',
                }}
              >
                {isActive && <Check size={12} />}
                <span className={`platform-${p} inline-block w-2 h-2 rounded-full`} />
                {formatPlatformName(p)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Date picker for schedule mode */}
      <AnimatePresence>
        {mode === 'schedule' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
              Schedule For
            </p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: '#1a1a2e',
                border: '1px solid #2d2d3d',
                color: '#f8fafc',
                colorScheme: 'dark',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2d2d3d')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={handlePublish}
        disabled={loading || postIds.length === 0}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed glow-purple"
        style={{ background: '#7c3aed', color: '#fff' }}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : mode === 'now' ? (
          <>
            <Radio size={16} />
            Publish {postIds.length} Post{postIds.length !== 1 ? 's' : ''}
          </>
        ) : (
          <>
            <Calendar size={16} />
            Schedule {postIds.length} Post{postIds.length !== 1 ? 's' : ''}
          </>
        )}
      </button>
    </motion.div>
  )
}
