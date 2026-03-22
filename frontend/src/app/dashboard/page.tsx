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
  Sparkles,
  Activity,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { getBrands, getCampaigns, getTrends } from '../../lib/api'
import { formatRelativeTime } from '../../lib/utils'
import { useCampaignStore } from '../../store/campaignStore'
import BrandDNACard from '../../components/brand/BrandDNACard'
import TrendRadar from '../../components/trends/TrendRadar'
import type { Campaign } from '../../lib/types'

// ─── Status badge ──────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string
  color: string
  bg: string
  icon: React.ReactNode
}

const STATUS_CONFIG: Record<Campaign['status'], StatusConfig> = {
  created: {
    label: 'Created',
    color: '#71717a',
    bg: 'rgba(63,63,70,0.4)',
    icon: <Clock size={10} />,
  },
  running: {
    label: 'Running',
    color: '#a78bfa',
    bg: 'rgba(124,58,237,0.12)',
    icon: <Loader2 size={10} className="animate-spin" />,
  },
  awaiting_strategy_review: {
    label: 'Review Strategy',
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.12)',
    icon: <AlertCircle size={10} />,
  },
  strategy_approved: {
    label: 'Strategy OK',
    color: '#34d399',
    bg: 'rgba(34,197,94,0.12)',
    icon: <CheckCircle2 size={10} />,
  },
  awaiting_content_review: {
    label: 'Review Content',
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.12)',
    icon: <AlertCircle size={10} />,
  },
  content_approved: {
    label: 'Content OK',
    color: '#34d399',
    bg: 'rgba(34,197,94,0.12)',
    icon: <CheckCircle2 size={10} />,
  },
  publishing: {
    label: 'Publishing',
    color: '#a78bfa',
    bg: 'rgba(124,58,237,0.12)',
    icon: <Zap size={10} />,
  },
  completed: {
    label: 'Complete',
    color: '#34d399',
    bg: 'rgba(34,197,94,0.12)',
    icon: <CheckCircle2 size={10} />,
  },
  failed: {
    label: 'Failed',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.12)',
    icon: <XCircle size={10} />,
  },
}

function StatusBadge({ status }: { status: Campaign['status'] }) {
  const c = STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}
    >
      {c.icon}
      {c.label}
    </span>
  )
}

// ─── Campaign card ─────────────────────────────────────────────────────────────

function CampaignCard({ campaign, index }: { campaign: Campaign; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/campaign/${campaign.id}`}>
        <div
          className="group flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(124,58,237,0.06)'
            e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
          }}
        >
          {/* Platform dots */}
          <div className="flex -space-x-1.5 flex-shrink-0">
            {campaign.platforms.slice(0, 4).map((p) => (
              <span
                key={p}
                className={`platform-${p} w-5 h-5 rounded-full border-2 flex-shrink-0`}
                style={{ borderColor: '#0a0a0f' }}
                title={p}
              />
            ))}
            {campaign.platforms.length > 4 && (
              <span
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                style={{ borderColor: '#0a0a0f', background: '#242436', color: '#71717a' }}
              >
                +{campaign.platforms.length - 4}
              </span>
            )}
          </div>

          {/* Goal */}
          <p className="flex-1 text-sm min-w-0 line-clamp-1 transition-colors duration-200" style={{ color: '#a1a1aa' }}>
            {campaign.goal || `Campaign ${campaign.id.slice(0, 8)}`}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={campaign.status} />
            <span className="text-xs hidden sm:block" style={{ color: '#3f3f46' }}>
              {formatRelativeTime(campaign.created_at)}
            </span>
            <ArrowUpRight
              size={14}
              className="transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              style={{ color: '#3f3f46' }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Empty Campaigns ───────────────────────────────────────────────────────────

function EmptyCampaigns() {
  return (
    <div className="text-center py-14">
      <div
        className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.1))',
          border: '1px solid rgba(124,58,237,0.2)',
        }}
      >
        <Zap size={20} style={{ color: '#a78bfa' }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: '#71717a' }}>No campaigns yet</p>
      <p className="text-xs mb-5" style={{ color: '#3f3f46' }}>Start by creating your first campaign</p>
      <Link href="/">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 cursor-pointer"
          style={{ background: '#fafafa', color: '#09090b' }}
        >
          <Plus size={14} />
          New Campaign
        </button>
      </Link>
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  glowColor,
  index,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  glowColor: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative rounded-2xl p-5 overflow-hidden"
      style={{
        background: 'rgba(18,18,26,0.8)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          transform: 'translate(30%, -30%)',
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#52525b' }}>
            {label}
          </span>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${glowColor}20`, color }}
          >
            {icon}
          </div>
        </div>
        <p
          className="text-3xl font-bold tracking-tight"
          style={{ color, textShadow: `0 0 30px ${glowColor}60` }}
        >
          {value}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

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
      .catch(() => {})
      .finally(() => setLoadingTrends(false))
  }, [currentBrand, setTrends])

  const runningCount = campaigns.filter(
    (c) => c.status === 'running' || c.status === 'publishing',
  ).length
  const completedCount = campaigns.filter((c) => c.status === 'completed').length
  const reviewCount = campaigns.filter(
    (c) =>
      c.status === 'awaiting_strategy_review' || c.status === 'awaiting_content_review',
  ).length

  return (
    <div className="min-h-screen relative" style={{ background: '#0a0a0f' }}>
      {/* Atmospheric background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute"
          style={{
            top: '-20%',
            left: '60%',
            width: 800,
            height: 600,
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 65%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '0%',
            left: '-10%',
            width: 500,
            height: 400,
            background: 'radial-gradient(ellipse, rgba(168,85,247,0.05) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div className="absolute inset-0 bg-grid-subtle opacity-50" />
      </div>

      {/* Top nav */}
      <header
        className="relative z-10 px-6 py-4"
        style={{
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  boxShadow: '0 0 20px rgba(168,85,247,0.35)',
                }}
              >
                <Sparkles size={15} className="text-white" />
              </div>
              <span className="text-sm font-bold gradient-text">Britney</span>
            </div>

            {currentBrand && (
              <div
                className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: currentBrand.brand_dna?.colors?.[0] ?? '#7c3aed' }}
                >
                  {currentBrand.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold" style={{ color: '#e4e4e7' }}>{currentBrand.name}</span>
                {currentBrand.niche && (
                  <>
                    <span style={{ color: '#27272a' }}>·</span>
                    <span className="text-xs" style={{ color: '#52525b' }}>{currentBrand.niche}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <Link href="/">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 cursor-pointer"
              style={{ background: '#fafafa', color: '#09090b' }}
            >
              <Plus size={14} />
              New Campaign
            </button>
          </Link>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Active Now"
            value={runningCount}
            icon={<Activity size={14} />}
            color="#a78bfa"
            glowColor="#7c3aed"
            index={0}
          />
          <StatCard
            label="Needs Review"
            value={reviewCount}
            icon={<AlertCircle size={14} />}
            color="#fbbf24"
            glowColor="#f59e0b"
            index={1}
          />
          <StatCard
            label="Completed"
            value={completedCount}
            icon={<CheckCircle2 size={14} />}
            color="#34d399"
            glowColor="#22c55e"
            index={2}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Brand DNA */}
          <div className="lg:col-span-1">
            {currentBrand ? (
              <BrandDNACard brand={currentBrand} />
            ) : (
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{ background: 'rgba(18,18,26,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="skeleton h-5 w-28 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
                <div className="skeleton h-16 rounded-xl" />
              </div>
            )}
          </div>

          {/* Right: Campaigns + Trends */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaigns */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(18,18,26,0.8)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 size={15} style={{ color: '#a78bfa' }} />
                  <h2 className="text-sm font-semibold" style={{ color: '#e4e4e7' }}>Campaigns</h2>
                </div>
                <span className="text-xs" style={{ color: '#3f3f46' }}>{campaigns.length} total</span>
              </div>

              <div className="p-3">
                {loadingCampaigns ? (
                  <div className="space-y-2 p-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-12 rounded-xl" />
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(18,18,26,0.8)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div
                className="flex items-center gap-2.5 px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <TrendingUp size={15} style={{ color: '#a78bfa' }} />
                <h2 className="text-sm font-semibold" style={{ color: '#e4e4e7' }}>Trend Radar</h2>
              </div>

              <div className="p-5">
                {loadingTrends ? (
                  <div className="skeleton h-40 rounded-xl" />
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
