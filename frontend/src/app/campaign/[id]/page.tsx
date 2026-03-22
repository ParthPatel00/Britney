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
  ChevronDown,
  ChevronRight,
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
  const [expanded, setExpanded] = useState<string | null>(null)
  const strategy = campaign.strategy as Record<string, unknown> | undefined

  const handleApprove = async () => {
    setLoading(true)
    try {
      await approveStrategy(campaign.id)
      toast.success('Strategy approved — generating content...')
      onApproved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve strategy')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-zinc-900 mt-6"
      style={{ borderColor: 'rgba(245,158,11,0.3)' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-zinc-100">Strategy Ready for Review</h3>
        </div>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: '#22c55e', color: '#fff' }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Approve Strategy
        </button>
      </div>

      {strategy && (
        <div className="p-5 space-y-2">
          {Object.entries(strategy).map(([key, value]) => {
            const isExpanded = expanded === key
            const preview =
              typeof value === 'string'
                ? value.slice(0, 120)
                : JSON.stringify(value).slice(0, 120)
            const full =
              typeof value === 'string' ? value : JSON.stringify(value, null, 2)
            const isLong = full.length > 120

            return (
              <div
                key={key}
                className="rounded-lg border border-zinc-800 overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors duration-150 cursor-pointer"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {key.replace(/_/g, ' ')}
                  </span>
                  {isLong && (
                    isExpanded
                      ? <ChevronDown size={14} className="text-zinc-600 flex-shrink-0" />
                      : <ChevronRight size={14} className="text-zinc-600 flex-shrink-0" />
                  )}
                </button>
                <div className="px-4 pb-3">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {isExpanded || !isLong ? full : `${preview}...`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ─── Success State ────────────────────────────────────────────────────────────

function SuccessState({ campaignId }: { campaignId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12 mt-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 14, delay: 0.15 }}
        className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center border-2 border-green-500"
        style={{ background: 'rgba(34,197,94,0.12)' }}
      >
        <CheckCircle2 size={28} className="text-green-500" />
      </motion.div>
      <h2 className="text-xl font-700 text-zinc-50 mb-1">Campaign Complete</h2>
      <p className="text-sm text-zinc-400 mb-6">All posts have been generated and processed.</p>
      <Link href={`/campaign/${campaignId}/review`}>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 cursor-pointer"
          style={{ background: '#fafafa', color: '#09090b' }}
        >
          <ExternalLink size={14} />
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

  // Poll campaign status when running
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 size={24} className="animate-spin text-zinc-400" />
      </div>
    )
  }

  const campaign = currentCampaign

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150 cursor-pointer">
                <ArrowLeft size={16} />
              </button>
            </Link>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <Link href="/dashboard">
                <span className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">Dashboard</span>
              </Link>
              <ChevronRight size={12} className="text-zinc-700" />
              <span className="text-zinc-200 font-medium">Campaign Pipeline</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* SSE indicator */}
            {isConnected ? (
              <div className="flex items-center gap-1.5 text-xs text-green-500">
                <Wifi size={12} />
                <span>Live</span>
              </div>
            ) : sseError ? (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <WifiOff size={12} />
                <span>Reconnecting</span>
              </div>
            ) : null}

            {campaign?.status === 'awaiting_content_review' && (
              <Link href={`/campaign/${id}/review`}>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 cursor-pointer"
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 cursor-pointer"
                  style={{ background: '#fafafa', color: '#09090b' }}
                >
                  <ExternalLink size={14} />
                  View Posts
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Goal */}
        {campaign && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Campaign Goal</p>
            <p className="text-base text-zinc-200">{campaign.goal}</p>
          </motion.div>
        )}

        {/* Pipeline */}
        <PipelineView />

        {/* Strategy review */}
        <AnimatePresence>
          {campaign?.status === 'awaiting_strategy_review' && (
            <StrategyReview campaign={campaign} onApproved={handleStrategyApproved} />
          )}
        </AnimatePresence>

        {/* Content review prompt */}
        <AnimatePresence>
          {campaign?.status === 'awaiting_content_review' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border bg-zinc-900 mt-6 flex items-center justify-between px-5 py-4"
              style={{ borderColor: 'rgba(245,158,11,0.3)' }}
            >
              <div className="flex items-center gap-3">
                <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Content is ready for review</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Approve, reject, or refine posts before publishing
                  </p>
                </div>
              </div>
              <Link href={`/campaign/${id}/review`}>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 cursor-pointer flex-shrink-0"
                  style={{ background: '#f59e0b', color: '#000' }}
                >
                  <FileCheck size={14} />
                  Review Now
                </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completed */}
        <AnimatePresence>
          {campaign?.status === 'completed' && <SuccessState campaignId={id} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
