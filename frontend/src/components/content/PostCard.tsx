'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, MessageSquare, Loader2 } from 'lucide-react'
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
      className={`platform-${platform} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}
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
    <div className="relative w-full aspect-square rounded-xl overflow-hidden" style={{ background: '#1a1a2e' }}>
      {!imgLoaded && !imgError && (
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
          <div className="text-center" style={{ color: '#475569' }}>
            <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: '#2d2d3d' }}>
              <MessageSquare size={20} />
            </div>
            <p className="text-xs">No image</p>
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
      className="flex rounded-lg p-0.5 gap-0.5"
      style={{ background: '#1a1a2e' }}
    >
      {variants.map((v) => {
        const isActive = v.id === activeId
        return (
          <motion.button
            key={v.id}
            layout
            onClick={() => !disabled && onSelect(v.id)}
            className="flex-1 text-xs font-bold py-1 rounded-md cursor-pointer transition-colors duration-150"
            animate={{
              background: isActive ? '#7c3aed' : 'transparent',
              color: isActive ? '#f8fafc' : '#94a3b8',
            }}
            transition={{ duration: 0.15 }}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden flex flex-col relative"
      style={{
        background: '#12121a',
        border: `1px solid ${isApproved ? '#10b981' : isRejected ? '#ef4444' : '#2d2d3d'}`,
      }}
    >
      {/* Status overlay */}
      <AnimatePresence>
        {isApproved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl pointer-events-none"
            style={{ background: 'rgba(16,185,129,0.08)' }}
          >
            <div
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(16,185,129,0.9)', color: '#fff' }}
            >
              <CheckCircle2 size={12} />
              Approved
            </div>
          </motion.div>
        )}
        {isRejected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl pointer-events-none"
            style={{ background: 'rgba(239,68,68,0.08)' }}
          >
            <div
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
            >
              <XCircle size={12} />
              Rejected
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image */}
      <div className="p-3 pb-0">
        <ImagePreview variant={activeVariant} />
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-3">
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
          className="text-xs leading-relaxed line-clamp-4"
          style={{ color: '#94a3b8' }}
        >
          {activeVariant?.caption ?? 'No caption generated'}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={handleApprove}
            disabled={!!loading || isLocked}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isApproved ? '#10b981' : 'rgba(16,185,129,0.15)',
              color: '#10b981',
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            {loading === 'approve' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCircle2 size={12} />
            )}
            Approve
          </button>

          <button
            onClick={handleReject}
            disabled={!!loading || isLocked}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isRejected ? '#ef4444' : 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            {loading === 'reject' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <XCircle size={12} />
            )}
            Reject
          </button>

          <button
            onClick={() => onRefine(post)}
            disabled={!!loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(124,58,237,0.15)',
              color: '#a855f7',
              border: '1px solid rgba(124,58,237,0.3)',
            }}
          >
            <MessageSquare size={12} />
            Refine
          </button>
        </div>
      </div>
    </motion.div>
  )
}
