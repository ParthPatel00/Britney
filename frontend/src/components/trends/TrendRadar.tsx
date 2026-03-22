'use client'

import { useState } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import TrendHijackModal from './TrendHijackModal'
import type { Trend, TrendCategory } from '../../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendRadarProps {
  trends: Trend[]
  brandId: string
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<TrendCategory, string> = {
  tech: '#3b82f6',
  culture: '#ec4899',
  lifestyle: '#10b981',
  business: '#f59e0b',
  other: '#94a3b8',
}

const CATEGORY_NUMERIC: Record<TrendCategory, number> = {
  tech: 1,
  culture: 2,
  lifestyle: 3,
  business: 4,
  other: 5,
}

// ─── Custom dot ──────────────────────────────────────────────────────────────

interface CustomDotProps {
  cx?: number
  cy?: number
  payload?: Trend & { size: number }
  onClick?: (trend: Trend) => void
}

function CustomDot({ cx = 0, cy = 0, payload, onClick }: CustomDotProps) {
  if (!payload) return null
  const r = Math.max(8, Math.min(30, payload.size / 8))
  const color = CATEGORY_COLORS[payload.category] ?? '#94a3b8'

  return (
    <g onClick={() => onClick?.(payload)} style={{ cursor: 'pointer' }}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy - r - 4}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={10}
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
        {payload.topic.length > 12 ? payload.topic.slice(0, 12) + '…' : payload.topic}
      </text>
    </g>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean
  payload?: { payload: Trend }[]
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const trend = payload[0].payload

  return (
    <div
      className="rounded-xl p-3 text-xs max-w-[200px]"
      style={{ background: '#12121a', border: '1px solid #2d2d3d', color: '#f8fafc' }}
    >
      <p className="font-bold mb-1">{trend.topic}</p>
      <p style={{ color: '#94a3b8' }} className="leading-relaxed line-clamp-3">
        {trend.summary}
      </p>
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: CATEGORY_COLORS[trend.category] }}
        />
        <span style={{ color: '#94a3b8' }} className="capitalize">
          {trend.category}
        </span>
        <span className="ml-auto font-bold" style={{ color: '#f59e0b' }}>
          {Math.round(trend.score * 100)}
        </span>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyTrends() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: '#1a1a2e', border: '1px solid #2d2d3d' }}
      >
        <TrendingUp size={24} style={{ color: '#475569' }} />
      </div>
      <h3 className="text-base font-semibold mb-1.5" style={{ color: '#94a3b8' }}>
        No trends detected yet
      </h3>
      <p className="text-sm max-w-xs" style={{ color: '#475569' }}>
        Britney will surface trending topics relevant to your brand.
      </p>
    </motion.div>
  )
}

// ─── TrendRadar ───────────────────────────────────────────────────────────────

export default function TrendRadar({ trends, brandId }: TrendRadarProps) {
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null)

  if (trends.length === 0) return <EmptyTrends />

  const chartData = trends.map((t) => ({
    ...t,
    x: CATEGORY_NUMERIC[t.category] ?? 5,
    y: t.score,
    size: t.score * 100,
  }))

  // Legend
  const categories = [...new Set(trends.map((t) => t.category))]

  return (
    <>
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: CATEGORY_COLORS[cat] }}
              />
              <span className="capitalize">{cat}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: -20 }}>
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, 6]}
                tickCount={6}
                tick={false}
                axisLine={{ stroke: '#2d2d3d' }}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 1]}
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={{ stroke: '#2d2d3d' }}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v * 100)}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2d2d3d' }} />
              <Scatter
                data={chartData}
                shape={(props: CustomDotProps) => <CustomDot {...props} onClick={setSelectedTrend} />}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[entry.category]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Trend list */}
        <div className="space-y-2 mt-2">
          {trends.slice(0, 5).map((trend, i) => (
            <motion.button
              key={trend.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedTrend(trend)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all duration-150"
              style={{ background: '#1a1a2e', border: '1px solid #2d2d3d' }}
              whileHover={{ borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.05)' }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: CATEGORY_COLORS[trend.category] }}
              />
              <span className="flex-1 text-sm font-medium" style={{ color: '#f8fafc' }}>
                {trend.topic}
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: '#f59e0b' }}
              >
                {Math.round(trend.score * 100)}
              </span>
              <TrendingUp size={14} style={{ color: '#475569' }} />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedTrend && (
        <TrendHijackModal
          trend={selectedTrend}
          brandId={brandId}
          onClose={() => setSelectedTrend(null)}
        />
      )}
    </>
  )
}
