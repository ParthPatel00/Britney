'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, MessageSquare, Loader2, Image } from 'lucide-react'
import { toast } from 'sonner'
import { approvePost, rejectPost, selectVariant } from '../../lib/api'
import { formatPlatformName } from '../../lib/utils'
import type { Post, PostVariant } from '../../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: Post
  onUpdate: (post: Post) => void
  onRefine: (post: Post) => void
}

// ─── Platform Badge ───────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`platform-${platform} text-white text-[10px] font-semibold px-2 py-0.5 rounded-full`}
    >
      {formatPlatformName(platform as Post['platform'])}
    </span>
  )
}

// ─── Image Preview ────────────────────────────────────────────────────────────

function ImagePreview({ variant }: { variant: PostVariant | undefined }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const url = variant?.media?.filename ? `/api/media/${variant.media.filename}` : null

  return (
    <div
      className="relative w-full aspect-square rounded-lg overflow-hidden"
      style={{ background: '#27272a' }}
    >
      {!imgLoaded && !imgError && url && (
        <div className="absolute inset-0 skeleton" />
      )}
      {url && !imgError ? (
        <img
          src={url}
          alt="Generated content"
          className="w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: imgLoaded ? 1 : 0 }}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Image size={20} className="mx-auto mb-1 text-zinc-700" />
            <p className="text-[10px] text-zinc-700">No image</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── A/B Toggle ──────────────────────────────────────────────────────────────

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
      className="flex rounded-md p-0.5 gap-0.5"
      style={{ background: '#27272a' }}
    >
      {variants.map((v) => {
        const isActive = v.id === activeId
        return (
          <motion.button
            key={v.id}
            layout
            onClick={() => !disabled && onSelect(v.id)}
            className="flex-1 text-[11px] font-bold py-1 px-2 rounded cursor-pointer transition-colors duration-100 disabled:cursor-not-allowed"
            animate={{
              background: isActive ? '#fafafa' : 'transparent',
              color: isActive ? '#09090b' : '#52525b',
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

// ─── PostCard ─────────────────────────────────────────────────────────────────

export default function PostCard({ post, onUpdate, onRefine }: PostCardProps) {
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl overflow-hidden flex flex-col relative"
      style={{
        background: '#111113',
        border: `1px solid ${isApproved ? 'rgba(34,197,94,0.3)' : isRejected ? 'rgba(239,68,68,0.3)' : '#1c1c1f'}`,
      }}
    >
      {/* Status overlay badge */}
      <AnimatePresence>
        {isApproved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(34,197,94,0.9)', color: '#fff' }}
          >
            <CheckCircle2 size={10} />
            Approved
          </motion.div>
        )}
        {isRejected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
          >
            <XCircle size={10} />
            Rejected
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approved tint overlay */}
      {isApproved && (
        <div className="absolute inset-0 pointer-events-none z-0 rounded-xl" style={{ background: 'rgba(34,197,94,0.04)' }} />
      )}
      {isRejected && (
        <div className="absolute inset-0 pointer-events-none z-0 rounded-xl" style={{ background: 'rgba(239,68,68,0.04)' }} />
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
        <p className="text-xs leading-relaxed text-zinc-400 line-clamp-3">
          {activeVariant?.caption ?? 'No caption generated'}
        </p>

        {/* Actions */}
        <div className="flex gap-1.5 mt-auto">
          <button
            onClick={handleApprove}
            disabled={!!loading || isLocked}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isApproved ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.08)',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            {loading === 'approve' ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <CheckCircle2 size={11} />
            )}
            Approve
          </button>

          <button
            onClick={handleReject}
            disabled={!!loading || isLocked}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isRejected ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {loading === 'reject' ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <XCircle size={11} />
            )}
            Reject
          </button>

          <button
            onClick={() => onRefine(post)}
            disabled={!!loading}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{
              background: 'rgba(250,250,250,0.04)',
              color: '#71717a',
              border: '1px solid #27272a',
            }}
          >
            <MessageSquare size={11} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
