'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, Clock, CheckCircle2, XCircle, Loader2, AlertCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { getBrands, getCampaigns, getTrends } from '../../lib/api'
import { formatRelativeTime } from '../../lib/utils'
import { useCampaignStore } from '../../store/campaignStore'
import BrandDNACard from '../../components/brand/BrandDNACard'
import TrendRadar from '../../components/trends/TrendRadar'
import type { Campaign, Trend } from '../../lib/types'

// ─── Status badge ─────────────────────────────────────────────────────────────

function CampaignStatusBadge({ status }: { status: Campaign['status'] }) {
  const cfg: Record<Campaign['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    created: { label: 'Created', color: '#94a3b8', bg: '#1a1a2e', icon: <Clock size={12} /> },
    running: { label: 'Running', color: '#a855f7', bg: 'rgba(124,58,237,0.15)', icon: <Loader2 size={12} className="animate-spin" /> },
    awaiting_strategy_review: { label: 'Review Strategy', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: <AlertCircle size={12} /> },
    strategy_approved: { label: 'Strategy OK', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: <CheckCircle2 size={12} /> },
    awaiting_content_review: { label: 'Review Content', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: <AlertCircle size={12} /> },
    content_approved: { label: 'Content OK', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: <CheckCircle2 size={12} /> },
    publishing: { label: 'Publishing', color: '#a855f7', bg: 'rgba(124,58,237,0.15)', icon: <Zap size={12} /> },
    completed: { label: 'Complete', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: <CheckCircle2 size={12} /> },
    failed: { label: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: <XCircle size={12} /> },
  }

  const c = cfg[status]
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}40` }}
    >
      {c.icon}
      {c.label}
    </span>
  )
}

// ─── Campaign card ────────────────────────────────────────────────────────────

function CampaignCard({ campaign, index }: { campaign: Campaign; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link href={`/campaign/${campaign.id}`}>
        <div
          className="p-4 rounded-xl cursor-pointer transition-all duration-200 hover:border-purple-500/50 group"
          style={{ background: '#12121a', border: '1px solid #2d2d3d' }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm font-semibold group-hover:text-purple-400 transition-colors duration-200 line-clamp-1" style={{ color: '#f8fafc' }}>
              {campaign.goal || `Campaign ${campaign.id.slice(0, 8)}`}
            </p>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex -space-x-1">
              {campaign.platforms.slice(0, 4).map((p) => (
                <span
                  key={p}
                  className={`platform-${p} w-5 h-5 rounded-full border border-black flex-shrink-0`}
                  title={p}
                />
              ))}
              {campaign.platforms.length > 4 && (
                <span
                  className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[9px] font-bold"
                  style={{ background: '#2d2d3d', color: '#94a3b8' }}
                >
                  +{campaign.platforms.length - 4}
                </span>
              )}
            </div>
            <span className="text-xs ml-auto" style={{ color: '#475569' }}>
              {formatRelativeTime(campaign.created_at)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { currentBrand, setBrands, setTrends, trends } = useCampaignStore()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [loadingTrends, setLoadingTrends] = useState(false)

  useEffect(() => {
    getBrands()
      .then((brands) => {
        if (!brands || brands.length === 0) {
          router.replace('/')
          return
        }
        setBrands(brands)
      })
      .catch(() => {
        toast.error('Failed to load brands')
        router.replace('/')
      })
  }, [router, setBrands])

  useEffect(() => {
    if (!currentBrand) return

    setLoadingCampaigns(true)
    getCampaigns(currentBrand.id)
      .then(setCampaigns)
      .catch(() => toast.error('Failed to load campaigns'))
      .finally(() => setLoadingCampaigns(false))

    setLoadingTrends(true)
    getTrends(currentBrand.id)
      .then(setTrends)
      .catch(() => {
        // Trends may not be available yet
      })
      .finally(() => setLoadingTrends(false))
  }, [currentBrand, setTrends])

  return (
    <div className="min-h-screen p-6" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 max-w-7xl mx-auto"
      >
        <div>
          <h1 className="text-2xl font-bold gradient-text">Britney</h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            AI Social Media Marketing Agent
          </p>
        </div>
        <Link href="/">
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 glow-purple"
            style={{ background: '#7c3aed', color: '#fff' }}
          >
            <Plus size={16} />
            New Campaign
          </button>
        </Link>
      </motion.div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Brand DNA */}
          {currentBrand ? (
            <BrandDNACard brand={currentBrand} />
          ) : (
            <div className="rounded-2xl p-6" style={{ background: '#12121a', border: '1px solid #2d2d3d' }}>
              <div className="skeleton h-6 w-32 mb-3 rounded" />
              <div className="skeleton h-4 w-24 mb-6 rounded" />
              <div className="skeleton h-20 rounded" />
            </div>
          )}
        </div>

        {/* Right columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaigns */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6"
            style={{ background: '#12121a', border: '1px solid #2d2d3d' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: '#f8fafc' }}>
                Campaigns
              </h2>
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                {campaigns.length} total
              </span>
            </div>

            {loadingCampaigns ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: '#475569' }}>
                  No campaigns yet.{' '}
                  <Link href="/" className="underline" style={{ color: '#a855f7' }}>
                    Create one
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c, i) => (
                  <CampaignCard key={c.id} campaign={c} index={i} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Trend Radar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-6"
            style={{ background: '#12121a', border: '1px solid #2d2d3d' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} style={{ color: '#a855f7' }} />
              <h2 className="text-base font-bold" style={{ color: '#f8fafc' }}>
                Trend Radar
              </h2>
            </div>

            {loadingTrends ? (
              <div className="skeleton h-48 rounded-xl" />
            ) : (
              <TrendRadar trends={trends} brandId={currentBrand?.id ?? ''} />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
