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
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 240, damping: 18 }}
      className="group relative"
    >
      <div
        className="w-6 h-6 rounded-full border border-zinc-700 cursor-default"
        style={{ background: color }}
        title={color}
      />
      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none text-zinc-500">
        {color}
      </span>
    </motion.div>
  )
}

// ─── Keyword pill ─────────────────────────────────────────────────────────────

function Keyword({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.04 }}
      className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700"
    >
      {children}
    </motion.span>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
      {children}
    </p>
  )
}

// ─── BrandDNACard ─────────────────────────────────────────────────────────────

export default function BrandDNACard({ brand }: BrandDNACardProps) {
  const dna = brand.brand_dna

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
    >
      {/* Header strip */}
      <div className="px-5 py-4 border-b border-zinc-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-700 text-zinc-50 leading-tight">{brand.name}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{brand.niche}</p>
          </div>
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
            style={{ background: dna?.colors?.[0] ?? '#e879f9' }}
          >
            {brand.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {brand.description && (
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed line-clamp-2">
            {brand.description}
          </p>
        )}
      </div>

      {dna ? (
        <div className="p-5 space-y-4">
          {/* Colors */}
          {dna.colors && dna.colors.length > 0 && (
            <div>
              <SectionLabel>Brand Colors</SectionLabel>
              <div className="flex gap-1.5 flex-wrap pb-3">
                {dna.colors.map((color, i) => (
                  <ColorSwatch key={color} color={color} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Voice */}
          {dna.voice_tone && (
            <div>
              <SectionLabel>Voice Tone</SectionLabel>
              <p className="text-xs text-zinc-400 italic leading-relaxed">"{dna.voice_tone}"</p>
            </div>
          )}

          {/* Audience */}
          {dna.target_audience && (
            <div>
              <SectionLabel>Target Audience</SectionLabel>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{dna.target_audience}</p>
            </div>
          )}

          {/* Personality */}
          {dna.personality && (
            <div>
              <SectionLabel>Personality</SectionLabel>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{dna.personality}</p>
            </div>
          )}

          {/* Keywords */}
          {dna.keywords && dna.keywords.length > 0 && (
            <div>
              <SectionLabel>Keywords</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {dna.keywords.map((kw, i) => (
                  <Keyword key={kw} index={i}>{kw}</Keyword>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5">
          <p className="text-xs italic text-zinc-700">Brand DNA is being analyzed...</p>
        </div>
      )}
    </motion.div>
  )
}
