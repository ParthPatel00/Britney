'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, TrendingUp, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { hijackTrend } from '../../lib/api'
import type { Trend } from '../../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendHijackModalProps {
  trend: Trend
  brandId: string
  onClose: () => void
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function TrendHijackModal({ trend, brandId, onClose }: TrendHijackModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleHijack = async () => {
    setLoading(true)
    try {
      const campaign = await hijackTrend(brandId, trend.id)
      toast.success('Trend hijack campaign created!')
      router.push(`/campaign/${campaign.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create campaign')
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl p-6"
          style={{ background: '#12121a', border: '1px solid #2d2d3d' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.2)' }}
              >
                <TrendingUp size={16} style={{ color: '#a855f7' }} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                  Trend Hijack
                </p>
                <h3 className="text-base font-bold" style={{ color: '#f8fafc' }}>
                  {trend.topic}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-white/5 flex-shrink-0"
              style={{ color: '#94a3b8' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              Score: {Math.round(trend.score * 100)}
            </div>
            <div
              className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
              style={{ background: '#1a1a2e', color: '#94a3b8', border: '1px solid #2d2d3d' }}
            >
              {trend.category}
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#475569' }}>
              What&apos;s Trending
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              {trend.summary}
            </p>
          </div>

          {/* Hijack idea */}
          <div
            className="mb-6 p-3 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#7c3aed' }}>
              Britney&apos;s Hijack Idea
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#c4b5fd' }}>
              {trend.hijack_idea}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150 hover:opacity-80"
              style={{ background: '#1a1a2e', color: '#94a3b8', border: '1px solid #2d2d3d' }}
            >
              Cancel
            </button>
            <button
              onClick={handleHijack}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed glow-purple"
              style={{ background: '#7c3aed', color: '#fff' }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              Generate Content
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
