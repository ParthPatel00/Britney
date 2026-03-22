'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Zap,
  ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { getBrands, getCampaigns, getTrends } from '../../lib/api'
import { formatRelativeTime } from '../../lib/utils'
import { useCampaignStore } from '../../store/campaignStore'
import BrandDNACard from '../../components/brand/BrandDNACard'
import TrendRadar from '../../components/trends/TrendRadar'
import type { Campaign } from '../../lib/types'

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string
  color: string
  bg: string
  icon: React.ReactNode
}

const STATUS_CONFIG: Record<Campaign['status'], StatusConfig> = {
  created: {
    label: 'Created',
    color: '#a1a1aa',
    bg: 'rgba(63,63,70,0.5)',
    icon: <Clock size={11} />,
  },
  running: {
    label: 'Running',
    color: '#a78bfa',
    bg: 'rgba(139,92,246,0.12)',
    icon: <Loader2 size={11} className="animate-spin" />,
  },
  awaiting_strategy_review: {
    label: 'Review Strategy',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    icon: <AlertCircle size={11} />,
  },
  strategy_approved: {
    label: 'Strategy OK',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    icon: <CheckCircle2 size={11} />,
  },
  awaiting_content_review: {
    label: 'Review Content',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    icon: <AlertCircle size={11} />,
  },
  content_approved: {
    label: 'Content OK',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    icon: <CheckCircle2 size={11} />,
  },
  publishing: {
    label: 'Publishing',
    color: '#a78bfa',
    bg: 'rgba(139,92,246,0.12)',
    icon: <Zap size={11} />,
  },
  completed: {
    label: 'Complete',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    icon: <CheckCircle2 size={11} />,
  },
  failed: {
    label: 'Failed',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    icon: <XCircle size={11} />,
  },
}

function StatusBadge({ status }: { status: Campaign['status'] }) {
  const c = STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/campaign/${campaign.id}`}>
        <div className="group flex items-center gap-4 px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-150 cursor-pointer">
          {/* Platform dots */}
          <div className="flex -space-x-1 flex-shrink-0">
            {campaign.platforms.slice(0, 4).map((p) => (
              <span
                key={p}
                className={`platform-${p} w-5 h-5 rounded-full border-2 border-zinc-900`}
                title={p}
              />
            ))}
            {campaign.platforms.length > 4 && (
              <span className="w-5 h-5 rounded-full border-2 border-zinc-900 bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-400">
                +{campaign.platforms.length - 4}
              </span>
            )}
          </div>

          {/* Goal */}
          <p className="flex-1 text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors duration-150 line-clamp-1 min-w-0">
            {campaign.goal || `Campaign ${campaign.id.slice(0, 8)}`}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={campaign.status} />
            <span className="text-xs text-zinc-600 hidden sm:block">
              {formatRelativeTime(campaign.created_at)}
            </span>
            <ArrowUpRight
              size={14}
              className="text-zinc-700 group-hover:text-zinc-400 transition-colors duration-150"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Empty Campaigns ──────────────────────────────────────────────────────────

function EmptyCampaigns() {
  return (
    <div className="text-center py-12">
      <div
        className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: '#27272a', border: '1px solid #3f3f46' }}
      >
        <Zap size={20} className="text-zinc-500" />
      </div>
      <p className="text-sm font-medium text-zinc-400 mb-1">No campaigns yet</p>
      <p className="text-xs text-zinc-600 mb-4">Start by creating your first campaign</p>
      <Link href="/">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 cursor-pointer"
          style={{ background: '#fafafa', color: '#09090b' }}
        >
          <Plus size={14} />
          New Campaign
        </button>
      </Link>
    </div>
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

  // Counts
  const runningCount = campaigns.filter(
    (c) => c.status === 'running' || c.status === 'publishing',
  ).length
  const completedCount = campaigns.filter((c) => c.status === 'completed').length
  const reviewCount = campaigns.filter(
    (c) =>
      c.status === 'awaiting_strategy_review' || c.status === 'awaiting_content_review',
  ).length

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top nav */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: '#1c1c1f', border: '1px solid #27272a', color: '#e879f9' }}
            >
              B
            </div>
            <div>
              <span className="text-sm font-700 gradient-text">Britney</span>
            </div>
          </div>

          {currentBrand && (
            <div className="hidden md:flex items-center gap-2 text-center">
              <p className="text-sm font-semibold text-zinc-200">{currentBrand.name}</p>
              <span className="text-zinc-700">·</span>
              <p className="text-xs text-zinc-500">{currentBrand.niche}</p>
            </div>
          )}

          <Link href="/">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 cursor-pointer"
              style={{ background: '#fafafa', color: '#09090b' }}
            >
              <Plus size={14} />
              New Campaign
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { label: 'Active Now', value: runningCount, color: '#f4f4f5' },
            { label: 'Needs Review', value: reviewCount, color: '#f59e0b' },
            { label: 'Completed', value: completedCount, color: '#22c55e' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-900"
            >
              <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
              <p className="text-xl font-700" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Brand DNA */}
          <div className="lg:col-span-1 space-y-4">
            {currentBrand ? (
              <BrandDNACard brand={currentBrand} />
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
                <div className="skeleton h-5 w-28 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
                <div className="skeleton h-16 rounded" />
              </div>
            )}
          </div>

          {/* Right: Campaigns + Trends */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaigns */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-zinc-800 bg-zinc-900"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-200">Campaigns</h2>
                <span className="text-xs text-zinc-600">{campaigns.length} total</span>
              </div>

              <div className="p-3">
                {loadingCampaigns ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-12 rounded-lg" />
                    ))}
                  </div>
                ) : campaigns.length === 0 ? (
                  <EmptyCampaigns />
                ) : (
                  <div className="space-y-1.5">
                    {campaigns.map((c, i) => (
                      <CampaignCard key={c.id} campaign={c} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Trend Radar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-zinc-800 bg-zinc-900"
            >
              <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
                <TrendingUp size={14} className="text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Trend Radar</h2>
              </div>

              <div className="p-5">
                {loadingTrends ? (
                  <div className="skeleton h-40 rounded-lg" />
                ) : (
                  <TrendRadar trends={trends} brandId={currentBrand?.id ?? ''} />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
