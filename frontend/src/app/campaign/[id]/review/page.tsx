'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  LayoutGrid,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { getCampaignPosts, approveContent } from '../../../../lib/api'
import { useCampaignStore } from '../../../../store/campaignStore'
import PostCard from '../../../../components/content/PostCard'
import RefinementChat from '../../../../components/content/RefinementChat'
import PublishPanel from '../../../../components/publish/PublishPanel'
import type { Post } from '../../../../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

// ─── Review Page ──────────────────────────────────────────────────────────────

export default function ReviewPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { currentCampaign } = useCampaignStore()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refiningPost, setRefiningPost] = useState<Post | null>(null)
  const [showPublish, setShowPublish] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCampaignPosts(id)
      .then(setPosts)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load posts')
        router.push(`/campaign/${id}`)
      })
      .finally(() => setLoading(false))
  }, [id, router])

  const handlePostUpdate = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    if (refiningPost?.id === updated.id) {
      setRefiningPost(updated)
    }
  }

  const approvedPosts = posts.filter((p) => p.status === 'approved')
  const rejectedPosts = posts.filter((p) => p.status === 'rejected')
  const pendingPosts = posts.filter((p) => p.status === 'pending')

  const handleBulkApprove = async () => {
    setSubmitting(true)
    try {
      const approvedIds = approvedPosts.map((p) => p.id)
      const rejectedIds = rejectedPosts.map((p) => p.id)

      if (approvedIds.length === 0 && rejectedIds.length === 0) {
        toast.error('Please approve or reject at least one post')
        return
      }

      await approveContent(id, approvedIds, rejectedIds)
      toast.success('Content decisions saved!')
      setShowPublish(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save decisions')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#7c3aed' }} />
      </div>
    )
  }

  const campaignPlatforms = currentCampaign?.platforms ?? []

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <Link href={`/campaign/${id}`}>
              <button
                className="p-2 rounded-xl cursor-pointer transition-all duration-150 hover:bg-white/5"
                style={{ color: '#94a3b8' }}
              >
                <ArrowLeft size={18} />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#f8fafc' }}>
                Content Review
              </h1>
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                {posts.length} post{posts.length !== 1 ? 's' : ''} generated
              </p>
            </div>
          </div>

          {/* Stats + action */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1" style={{ color: '#10b981' }}>
                <CheckCircle2 size={14} />
                {approvedPosts.length}
              </span>
              <span style={{ color: '#2d2d3d' }}>|</span>
              <span className="flex items-center gap-1" style={{ color: '#ef4444' }}>
                <XCircle size={14} />
                {rejectedPosts.length}
              </span>
              <span style={{ color: '#2d2d3d' }}>|</span>
              <span className="flex items-center gap-1" style={{ color: '#94a3b8' }}>
                <LayoutGrid size={14} />
                {pendingPosts.length} pending
              </span>
            </div>

            {!showPublish && (
              <button
                onClick={handleBulkApprove}
                disabled={submitting || (approvedPosts.length === 0 && rejectedPosts.length === 0)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#10b981', color: '#000' }}
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Save Decisions
              </button>
            )}
          </div>
        </motion.div>

        <div className="flex gap-6">
          {/* Posts grid */}
          <div className="flex-1 min-w-0">
            {posts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm" style={{ color: '#475569' }}>
                  No posts found for this campaign.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onUpdate={handlePostUpdate}
                    onRefine={setRefiningPost}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Side panel */}
          <AnimatePresence>
            {(refiningPost || showPublish) && (
              <motion.div
                initial={{ opacity: 0, x: 40, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 360 }}
                exit={{ opacity: 0, x: 40, width: 0 }}
                transition={{ duration: 0.25 }}
                className="flex-shrink-0"
                style={{ width: 360 }}
              >
                {refiningPost && (
                  <div style={{ height: 'calc(100vh - 120px)', position: 'sticky', top: '24px' }}>
                    <RefinementChat
                      post={refiningPost}
                      onClose={() => setRefiningPost(null)}
                      onPostUpdate={handlePostUpdate}
                    />
                  </div>
                )}

                {!refiningPost && showPublish && (
                  <div style={{ position: 'sticky', top: '24px' }}>
                    <PublishPanel
                      postIds={approvedPosts.map((p) => p.id)}
                      availablePlatforms={campaignPlatforms}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating publish button when decisions saved and panel not shown */}
        <AnimatePresence>
          {showPublish && !refiningPost && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-6 right-6 z-40"
            >
              {/* Panel is already shown as sticky side panel */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
