'use client'

import { motion } from 'framer-motion'
import type { Brand } from '../../lib/types'

// ─── Color Swatch ──────────────────────────────────────────────────────────────

function ColorSwatch({ color, index }: { color: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 240, damping: 18 }}
      className="group relative"
    >
      <div
        className="w-7 h-7 rounded-full cursor-default"
        style={{
          background: color,
          boxShadow: `0 0 12px ${color}50`,
          border: '1.5px solid rgba(255,255,255,0.12)',
        }}
        title={color}
      />
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none" style={{ color: '#52525b' }}>
        {color}
      </span>
    </motion.div>
  )
}

// ─── Keyword pill ──────────────────────────────────────────────────────────────

function Keyword({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.04 }}
      className="text-[11px] font-medium px-2.5 py-1 rounded-full"
      style={{
        background: 'rgba(124,58,237,0.1)',
        color: '#a78bfa',
        border: '1px solid rgba(124,58,237,0.2)',
      }}
    >
      {children}
    </motion.span>
  )
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#3f3f46' }}>
      {children}
    </p>
  )
}

// ─── BrandDNACard ──────────────────────────────────────────────────────────────

export default function BrandDNACard({ brand }: { brand: Brand }) {
  const dna = brand.brand_dna

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(18,18,26,0.95), rgba(26,26,40,0.95)) padding-box, linear-gradient(135deg, rgba(124,58,237,0.4), rgba(168,85,247,0.15), rgba(124,58,237,0.2)) border-box',
        border: '1px solid transparent',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header strip */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(124,58,237,0.12)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold leading-tight" style={{ color: '#f4f4f5' }}>{brand.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#52525b' }}>{brand.niche}</p>
          </div>
          <div
            className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-lg"
            style={{
              background: dna?.colors?.[0] ?? 'linear-gradient(135deg, #7c3aed, #a855f7)',
              boxShadow: `0 0 20px ${dna?.colors?.[0] ?? '#7c3aed'}40`,
            }}
          >
            {brand.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {brand.description && (
          <p className="text-xs mt-2.5 leading-relaxed line-clamp-2" style={{ color: '#52525b' }}>
            {brand.description}
          </p>
        )}
      </div>

      {dna ? (
        <div className="p-5 space-y-5">
          {/* Colors */}
          {dna.colors && dna.colors.length > 0 && (
            <div>
              <SectionLabel>Brand Colors</SectionLabel>
              <div className="flex gap-2 flex-wrap pb-4">
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
              <p className="text-xs italic leading-relaxed" style={{ color: '#c4b5fd' }}>"{dna.voice_tone}"</p>
            </div>
          )}

          {/* Audience */}
          {dna.target_audience && (
            <div>
              <SectionLabel>Target Audience</SectionLabel>
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#71717a' }}>{dna.target_audience}</p>
            </div>
          )}

          {/* Personality */}
          {dna.personality && (
            <div>
              <SectionLabel>Personality</SectionLabel>
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#71717a' }}>{dna.personality}</p>
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
          <p className="text-xs italic" style={{ color: '#27272a' }}>Brand DNA is being analyzed...</p>
        </div>
      )}
    </motion.div>
  )
}
