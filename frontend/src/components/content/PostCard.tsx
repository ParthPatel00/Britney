'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, MessageSquare, Loader2, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { approvePost, rejectPost, selectVariant } from '../../lib/api'
import { formatPlatformName } from '../../lib/utils'
import type { Post, PostVariant } from '../../lib/types'

// ─── Platform Badge ────────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`platform-${platform} text-white text-[10px] font-bold px-2.5 py-1 rounded-full`}
    >
      {formatPlatformName(platform as Post['platform'])}
    </span>
  )
}

// ─── Image Preview ─────────────────────────────────────────────────────────────

function ImagePreview({ variant }: { variant: PostVariant | undefined }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const url = variant?.media?.filename ? `/api/media/${variant.media.filename}` : null

  return (
    <div
      className="relative w-full aspect-square rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {!imgLoaded && !imgError && url && (
        <div className="absolute inset-0 skeleton" />
      )}
      {url && !imgError ? (
        <img
          src={url}
          alt="Generated content"
          className="w-full h-full object-cover transition-opacity duration-400"
          style={{ opacity: imgLoaded ? 1 : 0 }}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <ImageIcon size={18} className="mx-auto mb-1.5" style={{ color: '#27272a' }} />
            <p className="text-[10px]" style={{ color: '#27272a' }}>No image</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── A/B Toggle ───────────────────────────────────────────────────────────────

function ABToggle({
  variants,
  activeId,
  onSelect,
  disabled,
}: {
  variants: PostVariant[]
  activeId: string | undefined
  onSelect: (id: string) => void
  disabled: boolean
}) {
  if (variants.length < 2) return null

  return (
    <div
      className="flex rounded-lg p-0.5 gap-0.5"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      {variants.map((v) => {
        const isActive = v.id === activeId
        return (
          <motion.button
            key={v.id}
            layout
            onClick={() => !disabled && onSelect(v.id)}
            className="flex-1 text-[10px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors duration-150 disabled:cursor-not-allowed"
            animate={{
              background: isActive ? 'rgba(124,58,237,0.25)' : 'transparent',
              color: isActive ? '#a78bfa' : '#3f3f46',
            }}
            transition={{ duration: 0.12 }}
            disabled={disabled}
          >
            {v.label}
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── PostCard ──────────────────────────────────────────────────────────────────

export default function PostCard({ post, onUpdate, onRefine }: {
  post: Post
  onUpdate: (post: Post) => void
  onRefine: (post: Post) => void
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | 'variant' | null>(null)

  const activeVariantId = post.selected_variant_id ?? post.variants[0]?.id
  const activeVariant = post.variants.find((v) => v.id === activeVariantId)

  const handleSelectVariant = async (id: string) => {
    if (id === activeVariantId) return
    setLoading('variant')
    try {
      const updated = await selectVariant(post.id, id)
      onUpdate(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to switch variant')
    } finally {
      setLoading(null)
    }
  }

  const handleApprove = async () => {
    setLoading('approve')
    try {
      const updated = await approvePost(post.id)
      onUpdate(updated)
      toast.success('Post approved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    try {
      const updated = await rejectPost(post.id)
      onUpdate(updated)
      toast.success('Post rejected')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject')
    } finally {
      setLoading(null)
    }
  }

  const isApproved = post.status === 'approved'
  const isRejected = post.status === 'rejected'
  const isLocked = isApproved || isRejected

  const cardBorder = isApproved
    ? 'rgba(34,197,94,0.3)'
    : isRejected
      ? 'rgba(239,68,68,0.3)'
      : 'rgba(255,255,255,0.06)'

  const cardGlow = isApproved
    ? '0 0 30px rgba(34,197,94,0.08)'
    : isRejected
      ? '0 0 30px rgba(239,68,68,0.08)'
      : 'none'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl overflow-hidden flex flex-col relative group cursor-default"
      style={{
        background: 'rgba(18,18,26,0.9)',
        border: `1px solid ${cardBorder}`,
        boxShadow: cardGlow,
        backdropFilter: 'blur(20px)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Status overlay badge */}
      <AnimatePresence>
        {isApproved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(34,197,94,0.9)', color: '#fff' }}
          >
            <CheckCircle2 size={9} />
            Approved
          </motion.div>
        )}
        {isRejected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
          >
            <XCircle size={9} />
            Rejected
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status background tint */}
      {isApproved && (
        <div
          className="absolute inset-0 pointer-events-none z-0 rounded-2xl"
          style={{ background: 'rgba(34,197,94,0.03)' }}
        />
      )}
      {isRejected && (
        <div
          className="absolute inset-0 pointer-events-none z-0 rounded-2xl"
          style={{ background: 'rgba(239,68,68,0.03)' }}
        />
      )}

      {/* Image */}
      <div className="p-2.5 pb-0 relative z-10">
        <ImagePreview variant={activeVariant} />
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2.5 relative z-10">
        {/* Platform + A/B */}
        <div className="flex items-center justify-between gap-2">
          <PlatformBadge platform={post.platform} />
          {post.variants.length > 1 && (
            <ABToggle
              variants={post.variants}
              activeId={activeVariantId}
              onSelect={handleSelectVariant}
              disabled={!!loading || isLocked}
            />
          )}
        </div>

        {/* Caption */}
        <p
          className="text-xs leading-relaxed line-clamp-3"
          style={{ color: '#71717a' }}
        >
          {activeVariant?.caption ?? 'No caption generated'}
        </p>

        {/* Actions */}
        <div className="flex gap-1.5 mt-auto">
          <button
            onClick={handleApprove}
            disabled={!!loading || isLocked}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isApproved ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.07)',
              color: '#34d399',
              border: `1px solid ${isApproved ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.15)'}`,
            }}
          >
            {loading === 'approve' ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <CheckCircle2 size={10} />
            )}
            Approve
          </button>

          <button
            onClick={handleReject}
            disabled={!!loading || isLocked}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isRejected ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.07)',
              color: '#f87171',
              border: `1px solid ${isRejected ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.15)'}`,
            }}
          >
            {loading === 'reject' ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <XCircle size={10} />
            )}
            Reject
          </button>

          <button
            onClick={() => onRefine(post)}
            disabled={!!loading}
            className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{
              background: 'rgba(124,58,237,0.08)',
              color: '#a78bfa',
              border: '1px solid rgba(124,58,237,0.15)',
            }}
          >
            <MessageSquare size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
