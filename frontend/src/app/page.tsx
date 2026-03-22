'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Check,
  Sparkles,
  Globe,
  FileText,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { getBrands, createBrand, createCampaign, startCampaign } from '../lib/api'
import type { Platform } from '../lib/types'

// ─── Particle Background ──────────────────────────────────────────────────────

// Pre-computed stable particles to avoid SSR hydration mismatch
const PARTICLES = Array.from({ length: 40 }).map((_, i) => {
  // Deterministic pseudo-random using index
  const seed = (i * 2654435761) >>> 0
  const size = 1 + (seed % 400) / 100
  const left = (seed % 10000) / 100
  const top = ((seed >> 8) % 10000) / 100
  const duration = 15 + (seed % 2000) / 100
  const delay = (seed % 1000) / 100
  const color = i % 3 === 0 ? '#7c3aed' : i % 3 === 1 ? '#a855f7' : '#4f46e5'
  return { id: i, size, color, left: `${left}%`, top: `${top}%`, duration, delay }
})

function ParticleBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-0"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            left: p.left,
            top: p.top,
            animation: `floatParticle ${p.duration}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatParticle {
          0% { opacity: 0; transform: translateY(0px) scale(1); }
          10% { opacity: 0.6; }
          90% { opacity: 0.3; }
          100% { opacity: 0; transform: translateY(-120vh) scale(0.5); }
        }
      `}</style>
    </div>
  )
}

// ─── Platform data ────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'twitter', label: 'X (Twitter)' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
]

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center">
          <motion.div
            animate={{
              background: i < current ? '#10b981' : i === current ? '#7c3aed' : '#2d2d3d',
              scale: i === current ? 1.2 : 1,
            }}
            transition={{ duration: 0.3 }}
            className="w-2 h-2 rounded-full"
          />
          {i < total - 1 && (
            <motion.div
              animate={{ background: i < current ? '#10b981' : '#2d2d3d' }}
              transition={{ duration: 0.3 }}
              className="w-8 h-px mx-1"
            />
          )}
        </div>
      ))}
      <span className="ml-3 text-sm" style={{ color: '#94a3b8' }}>
        Step {current + 1} of {total}
      </span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [niche, setNiche] = useState('')
  const [description, setDescription] = useState('')
  const [brandContext, setBrandContext] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [goal, setGoal] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'twitter'])
  const [numPosts, setNumPosts] = useState(5)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getBrands()
      .then((brands) => {
        if (brands && brands.length > 0) {
          router.replace('/dashboard')
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [router])

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleGenerate = async () => {
    if (!name.trim() || !niche.trim()) {
      toast.error('Please fill in brand name and niche')
      setStep(0)
      return
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform')
      return
    }
    if (!goal.trim()) {
      toast.error('Please enter a campaign goal')
      return
    }

    setStep(3)
    setGenerating(true)

    try {
      const form = new FormData()
      form.append('name', name.trim())
      form.append('niche', niche.trim())
      form.append('description', description.trim())
      if (brandContext.trim()) form.append('brand_context', brandContext.trim())
      if (websiteUrl.trim()) form.append('website_url', websiteUrl.trim())
      for (const file of files) {
        form.append('files', file)
      }

      const brand = await createBrand(form)

      const campaign = await createCampaign({
        brand_id: brand.id,
        goal: goal.trim(),
        platforms: selectedPlatforms,
        num_posts: numPosts,
      })

      await startCampaign(campaign.id)

      router.push(`/campaign/${campaign.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(msg)
      setGenerating(false)
      setStep(2)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6" style={{ background: '#0a0a0f' }}>
      <ParticleBackground />

      {/* Background radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles size={20} className="text-purple-400" />
            <span className="text-sm font-medium tracking-widest uppercase" style={{ color: '#a855f7' }}>
              AI-Powered Social Media
            </span>
            <Sparkles size={20} className="text-purple-400" />
          </div>
          <h1 className="text-6xl font-extrabold mb-4 gradient-text">
            Meet Britney
          </h1>
          <p className="text-lg" style={{ color: '#94a3b8' }}>
            Your autonomous AI marketing agent. Set your brand, watch the magic.
          </p>
        </motion.div>

        {/* Wizard card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass rounded-2xl p-8"
        >
          <AnimatePresence mode="wait">
            {/* Step 0: Brand Basics */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <StepIndicator current={0} total={3} />
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#f8fafc' }}>
                  Tell us about your brand
                </h2>
                <p className="mb-6 text-sm" style={{ color: '#94a3b8' }}>
                  Britney will analyze your brand DNA and craft content that feels authentically yours.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                      Brand Name *
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{
                        background: '#1a1a2e',
                        border: '1px solid #2d2d3d',
                        color: '#f8fafc',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2d2d3d')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                      Niche / Industry *
                    </label>
                    <input
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g. SaaS, Fashion, Food & Beverage"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{
                        background: '#1a1a2e',
                        border: '1px solid #2d2d3d',
                        color: '#f8fafc',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2d2d3d')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                      Brand Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What does your brand stand for? What makes it unique?"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 resize-none"
                      style={{
                        background: '#1a1a2e',
                        border: '1px solid #2d2d3d',
                        color: '#f8fafc',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2d2d3d')}
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!name.trim() || !niche.trim()) {
                      toast.error('Brand name and niche are required')
                      return
                    }
                    setStep(1)
                  }}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                  style={{ background: '#7c3aed', color: '#f8fafc' }}
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* Step 1: Brand Context */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <StepIndicator current={1} total={3} />
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#f8fafc' }}>
                  Add brand context{' '}
                  <span className="text-sm font-normal" style={{ color: '#94a3b8' }}>(optional)</span>
                </h2>
                <p className="mb-6 text-sm" style={{ color: '#94a3b8' }}>
                  The more context you give, the better Britney understands your brand voice.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                      <Globe size={14} className="inline mr-1.5" />
                      Website URL
                    </label>
                    <input
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourbrand.com"
                      type="url"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{
                        background: '#1a1a2e',
                        border: '1px solid #2d2d3d',
                        color: '#f8fafc',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2d2d3d')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                      <FileText size={14} className="inline mr-1.5" />
                      Additional Context
                    </label>
                    <textarea
                      value={brandContext}
                      onChange={(e) => setBrandContext(e.target.value)}
                      placeholder="Paste brand guidelines, tone of voice notes, target audience details..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 resize-none"
                      style={{
                        background: '#1a1a2e',
                        border: '1px solid #2d2d3d',
                        color: '#f8fafc',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2d2d3d')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                      <Upload size={14} className="inline mr-1.5" />
                      Upload Files{' '}
                      <span className="text-xs" style={{ color: '#475569' }}>(images, PDFs, docs)</span>
                    </label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 hover:border-purple-500 hover:bg-purple-500/5"
                      style={{ borderColor: '#2d2d3d', color: '#94a3b8' }}
                    >
                      <Upload size={20} />
                      <span className="text-sm">Click to upload files</span>
                      {files.length > 0 && (
                        <span className="text-xs" style={{ color: '#a855f7' }}>
                          {files.length} file(s) selected
                        </span>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep(0)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-200 hover:opacity-80"
                    style={{ background: '#1a1a2e', color: '#94a3b8' }}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                    style={{ background: '#7c3aed', color: '#f8fafc' }}
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Campaign Goal + Platforms */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <StepIndicator current={2} total={3} />
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#f8fafc' }}>
                  Launch your campaign
                </h2>
                <p className="mb-6 text-sm" style={{ color: '#94a3b8' }}>
                  Define your goal and where you want to publish.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                      <Zap size={14} className="inline mr-1.5" />
                      Campaign Goal *
                    </label>
                    <textarea
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="e.g. Drive awareness for our new product launch targeting Gen Z"
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 resize-none"
                      style={{
                        background: '#1a1a2e',
                        border: '1px solid #2d2d3d',
                        color: '#f8fafc',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2d2d3d')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>
                      Platforms
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PLATFORMS.map((p) => {
                        const active = selectedPlatforms.includes(p.id)
                        return (
                          <button
                            key={p.id}
                            onClick={() => togglePlatform(p.id)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200"
                            style={{
                              background: active ? 'rgba(124,58,237,0.2)' : '#1a1a2e',
                              border: `1px solid ${active ? '#7c3aed' : '#2d2d3d'}`,
                              color: active ? '#a855f7' : '#94a3b8',
                            }}
                          >
                            {active && <Check size={12} />}
                            <span className={`platform-${p.id} inline-block w-2 h-2 rounded-full`} />
                            {p.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>
                      Number of Posts:{' '}
                      <span className="font-bold" style={{ color: '#a855f7' }}>
                        {numPosts}
                      </span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={numPosts}
                      onChange={(e) => setNumPosts(Number(e.target.value))}
                      className="w-full cursor-pointer accent-purple-600"
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: '#475569' }}>
                      <span>1</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-200 hover:opacity-80"
                    style={{ background: '#1a1a2e', color: '#94a3b8' }}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.98] glow-purple"
                    style={{ background: '#7c3aed', color: '#f8fafc' }}
                  >
                    <Sparkles size={16} />
                    Launch Britney
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Generating */}
            {step === 3 && generating && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-6 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, #7c3aed, #a855f7, #7c3aed)',
                  }}
                />

                <h2 className="text-2xl font-bold mb-3 gradient-text">
                  Britney is spinning up...
                </h2>
                <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
                  Building your brand DNA and preparing the AI pipeline. This will only take a moment.
                </p>

                {['Analyzing brand identity', 'Spinning up research agent', 'Configuring creative pipeline'].map(
                  (label, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.5 }}
                      className="flex items-center gap-3 text-sm mb-2 justify-center"
                      style={{ color: '#94a3b8' }}
                    >
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                        className="w-1.5 h-1.5 rounded-full bg-purple-500"
                      />
                      {label}
                    </motion.div>
                  ),
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
