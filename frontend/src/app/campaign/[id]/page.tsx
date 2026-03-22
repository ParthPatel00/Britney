'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Wifi,
  WifiOff,
  Loader2,
  FileCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { getCampaign, approveStrategy } from '../../../lib/api'
import { useCampaignStore } from '../../../store/campaignStore'
import { usePipeline } from '../../../hooks/usePipeline'
import PipelineView from '../../../components/pipeline/PipelineView'
import type { Campaign } from '../../../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

// ─── Strategy Review ──────────────────────────────────────────────────────────

function StrategyReview({
  campaign,
  onApproved,
}: {
  campaign: Campaign
  onApproved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const strategy = campaign.strategy as Record<string, unknown> | undefined

  const handleApprove = async () => {
    setLoading(true)
    try {
      await approveStrategy(campaign.id)
      toast.success('Strategy approved! Generating content...')
      onApproved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve strategy')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 mt-6"
      style={{ background: '#12121a', border: '1px solid #f59e0b40' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={18} style={{ color: '#f59e0b' }} />
        <h3 className="text-base font-bold" style={{ color: '#f8fafc' }}>
          Strategy Ready for Review
        </h3>
      </div>

      {strategy && (
        <div className="space-y-3 mb-6">
          {Object.entries(strategy).map(([key, value]) => (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
                {key.replace(/_/g, ' ')}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              </p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleApprove}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed glow-green"
        style={{ background: '#10b981', color: '#fff' }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        Approve Strategy
      </button>
    </motion.div>
  )
}

// ─── Success State ────────────────────────────────────────────────────────────

function SuccessState({ campaignId }: { campaignId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, delay: 0.2 }}
        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center glow-green"
        style={{ background: 'rgba(16,185,129,0.2)', border: '2px solid #10b981' }}
      >
        <CheckCircle2 size={36} style={{ color: '#10b981' }} />
      </motion.div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#f8fafc' }}>
        Campaign Complete!
      </h2>
      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
        All posts have been generated and processed.
      </p>
      <Link href={`/campaign/${campaignId}/review`}>
        <button
          className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 glow-purple"
          style={{ background: '#7c3aed', color: '#fff' }}
        >
          <ExternalLink size={16} />
          View All Posts
        </button>
      </Link>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { currentCampaign, setCampaign } = useCampaignStore()
  const [loading, setLoading] = useState(true)
  const { isConnected, error: sseError } = usePipeline(id)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCampaign(id)
      .then((campaign) => {
        setCampaign(campaign)
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Campaign not found')
        router.push('/dashboard')
      })
      .finally(() => setLoading(false))
  }, [id, setCampaign, router])

  // Poll campaign status when awaiting review or running
  useEffect(() => {
    if (!currentCampaign) return
    const needsPoll =
      currentCampaign.status === 'running' ||
      currentCampaign.status === 'awaiting_strategy_review' ||
      currentCampaign.status === 'strategy_approved' ||
      currentCampaign.status === 'awaiting_content_review'

    if (!needsPoll) return

    const interval = setInterval(async () => {
      try {
        const updated = await getCampaign(id)
        setCampaign(updated)
      } catch {
        // Ignore poll errors
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [currentCampaign?.status, id, setCampaign])

  const handleStrategyApproved = async () => {
    const updated = await getCampaign(id)
    setCampaign(updated)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#7c3aed' }} />
      </div>
    )
  }

  const campaign = currentCampaign

  return (
    <div className="min-h-screen p-6" style={{ background: '#0a0a0f' }}>
      <div className="max-w-6xl mx-auto">
        {/* Nav */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button
                className="p-2 rounded-xl cursor-pointer transition-all duration-150 hover:bg-white/5"
                style={{ color: '#94a3b8' }}
              >
                <ArrowLeft size={18} />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#f8fafc' }}>
                Campaign Pipeline
              </h1>
              {campaign && (
                <p className="text-sm line-clamp-1 max-w-md" style={{ color: '#94a3b8' }}>
                  {campaign.goal}
                </p>
              )}
            </div>
          </div>

          {/* SSE connection indicator */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#10b981' }}>
                <Wifi size={14} />
                <span>Live</span>
              </div>
            ) : sseError ? (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                <WifiOff size={14} />
                <span>Reconnecting</span>
              </div>
            ) : null}

            {campaign?.status === 'awaiting_content_review' && (
              <Link href={`/campaign/${id}/review`}>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150 hover:opacity-90"
                  style={{ background: '#f59e0b', color: '#000' }}
                >
                  <FileCheck size={14} />
                  Review Content
                </button>
              </Link>
            )}

            {(campaign?.status === 'completed' || campaign?.status === 'content_approved') && (
              <Link href={`/campaign/${id}/review`}>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150 hover:opacity-90"
                  style={{ background: '#7c3aed', color: '#fff' }}
                >
                  <ExternalLink size={14} />
                  View Posts
                </button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Pipeline visualization */}
        <PipelineView />

        {/* Strategy review section */}
        <AnimatePresence>
          {campaign?.status === 'awaiting_strategy_review' && (
            <StrategyReview
              campaign={campaign}
              onApproved={handleStrategyApproved}
            />
          )}
        </AnimatePresence>

        {/* Content review prompt */}
        <AnimatePresence>
          {campaign?.status === 'awaiting_content_review' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-6 mt-6 flex items-center justify-between"
              style={{ background: '#12121a', border: '1px solid #f59e0b40' }}
            >
              <div className="flex items-center gap-3">
                <AlertCircle size={20} style={{ color: '#f59e0b' }} />
                <div>
                  <p className="font-semibold" style={{ color: '#f8fafc' }}>
                    Content is ready for your review
                  </p>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>
                    Approve, reject, or refine individual posts before publishing
                  </p>
                </div>
              </div>
              <Link href={`/campaign/${id}/review`}>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 flex-shrink-0"
                  style={{ background: '#f59e0b', color: '#000' }}
                >
                  <FileCheck size={16} />
                  Review Now
                </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completed state */}
        <AnimatePresence>
          {campaign?.status === 'completed' && <SuccessState campaignId={id} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
