'use client'

import { motion } from 'framer-motion'
import type { Brand } from '../../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandDNACardProps {
  brand: Brand
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ color, index }: { color: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
      className="group relative"
    >
      <div
        className="w-8 h-8 rounded-lg border border-white/10 cursor-default"
        style={{ background: color }}
        title={color}
      />
      <span
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{ color: '#94a3b8' }}
      >
        {color}
      </span>
    </motion.div>
  )
}

// ─── Pill badge ───────────────────────────────────────────────────────────────

function Pill({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(124,58,237,0.15)', color: '#a855f7', border: '1px solid rgba(124,58,237,0.3)' }}
    >
      {children}
    </motion.span>
  )
}

// ─── BrandDNACard ─────────────────────────────────────────────────────────────

export default function BrandDNACard({ brand }: BrandDNACardProps) {
  const dna = brand.brand_dna

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-6 space-y-5"
      style={{ background: '#12121a', border: '1px solid #2d2d3d' }}
    >
      {/* Brand name + niche */}
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-bold gradient-text"
        >
          {brand.name}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm mt-0.5"
          style={{ color: '#94a3b8' }}
        >
          {brand.niche}
        </motion.p>
        {brand.description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm mt-2 leading-relaxed"
            style={{ color: '#94a3b8' }}
          >
            {brand.description}
          </motion.p>
        )}
      </div>

      {dna ? (
        <>
          {/* Colors */}
          {dna.colors && dna.colors.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
                Brand Colors
              </p>
              <div className="flex gap-2 flex-wrap pb-4">
                {dna.colors.map((color, i) => (
                  <ColorSwatch key={color} color={color} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Chips row */}
          <div className="grid grid-cols-1 gap-3">
            {dna.voice_tone && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#475569' }}>
                  Voice Tone
                </p>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{dna.voice_tone}</p>
              </div>
            )}

            {dna.visual_style && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#475569' }}>
                  Visual Style
                </p>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{dna.visual_style}</p>
              </div>
            )}

            {dna.target_audience && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#475569' }}>
                  Target Audience
                </p>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{dna.target_audience}</p>
              </div>
            )}

            {dna.personality && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#475569' }}>
                  Personality
                </p>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{dna.personality}</p>
              </div>
            )}
          </div>

          {/* Keywords */}
          {dna.keywords && dna.keywords.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
                Keywords
              </p>
              <div className="flex flex-wrap gap-2">
                {dna.keywords.map((kw, i) => (
                  <Pill key={kw} index={i}>{kw}</Pill>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm italic" style={{ color: '#475569' }}>
          Brand DNA is being analyzed...
        </p>
      )}
    </motion.div>
  )
}
