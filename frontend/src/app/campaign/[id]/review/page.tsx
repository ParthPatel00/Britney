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
  ChevronRight,
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 size={24} className="animate-spin text-zinc-400" />
      </div>
    )
  }

  const campaignPlatforms = currentCampaign?.platforms ?? []

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-950 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/campaign/${id}`}>
              <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150 cursor-pointer">
                <ArrowLeft size={16} />
              </button>
            </Link>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <Link href="/dashboard">
                <span className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">Dashboard</span>
              </Link>
              <ChevronRight size={12} className="text-zinc-700" />
              <Link href={`/campaign/${id}`}>
                <span className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">Pipeline</span>
              </Link>
              <ChevronRight size={12} className="text-zinc-700" />
              <span className="text-zinc-200 font-medium">Content Review</span>
            </div>
          </div>

          {/* Stats + action */}
          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-green-500">
                <CheckCircle2 size={13} />
                <span className="font-semibold">{approvedPosts.length}</span>
                <span className="text-zinc-600">approved</span>
              </div>
              <div className="w-px h-3 bg-zinc-800" />
              <div className="flex items-center gap-1.5 text-red-400">
                <XCircle size={13} />
                <span className="font-semibold">{rejectedPosts.length}</span>
                <span className="text-zinc-600">rejected</span>
              </div>
              <div className="w-px h-3 bg-zinc-800" />
              <div className="flex items-center gap-1.5 text-zinc-500">
                <LayoutGrid size={13} />
                <span className="font-semibold">{pendingPosts.length}</span>
                <span className="text-zinc-600">pending</span>
              </div>
            </div>

            {!showPublish && (
              <button
                onClick={handleBulkApprove}
                disabled={submitting || (approvedPosts.length === 0 && rejectedPosts.length === 0)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: '#22c55e', color: '#fff' }}
              >
                {submitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Save Decisions
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Total count */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-zinc-500 mb-4"
        >
          {posts.length} post{posts.length !== 1 ? 's' : ''} generated
        </motion.p>

        <div className="flex gap-6">
          {/* Posts grid */}
          <div className="flex-1 min-w-0">
            {posts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm text-zinc-600">No posts found for this campaign.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <PostCard
                      post={post}
                      onUpdate={handlePostUpdate}
                      onRefine={setRefiningPost}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Side panel */}
          <AnimatePresence>
            {(refiningPost || showPublish) && (
              <motion.div
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 32 }}
                transition={{ duration: 0.22 }}
                className="flex-shrink-0"
                style={{ width: 360 }}
              >
                {refiningPost && (
                  <div style={{ height: 'calc(100vh - 88px)', position: 'sticky', top: '72px' }}>
                    <RefinementChat
                      post={refiningPost}
                      onClose={() => setRefiningPost(null)}
                      onPostUpdate={handlePostUpdate}
                    />
                  </div>
                )}

                {!refiningPost && showPublish && (
                  <div style={{ position: 'sticky', top: '72px' }}>
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
      </div>
    </div>
  )
}
