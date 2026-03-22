'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Paperclip, Send, X, Globe, Check, ArrowRight, Loader2, Sparkles, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { getBrands, createBrand, createCampaign, startCampaign } from '../lib/api'
import type { Platform, Brand } from '../lib/types'

// ─── Platform data ─────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: 'instagram', label: 'Instagram', color: '#e1306c' },
  { id: 'twitter', label: 'X / Twitter', color: '#ffffff' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
  { id: 'facebook', label: 'Facebook', color: '#1877f2' },
  { id: 'tiktok', label: 'TikTok', color: '#69c9d0' },
  { id: 'youtube', label: 'YouTube', color: '#ff0000' },
]

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | 'brand-input'
  | 'brand-processing'
  | 'brand-confirmed'
  | 'campaign-goal'
  | 'campaign-platforms'
  | 'campaign-posts'
  | 'campaign-creating'
  | 'done'

interface ChatMessage {
  id: string
  role: 'ai' | 'user' | 'card'
  content?: string
  card?: 'brand-dna' | 'platform-picker' | 'posts-picker' | 'loading'
  brand?: Brand
  platforms?: Platform[]
  numPosts?: number
}

// ─── URL detection ─────────────────────────────────────────────────────────────

function detectUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i)
  return match ? match[0] : null
}

// ─── Atmospheric Background ────────────────────────────────────────────────────

function AtmosphericBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Main violet glow */}
      <div
        className="absolute"
        style={{
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 900,
          height: 600,
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Secondary accent */}
      <div
        className="absolute"
        style={{
          bottom: '10%',
          right: '-10%',
          width: 500,
          height: 400,
          background: 'radial-gradient(ellipse, rgba(168,85,247,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid-subtle opacity-60" />
    </div>
  )
}

// ─── BrandDNA Block ────────────────────────────────────────────────────────────

function BrandDNABlock({ brand }: { brand: Brand }) {
  const dna = brand.brand_dna
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(18,18,26,0.95), rgba(26,26,40,0.95)) padding-box, linear-gradient(135deg, rgba(124,58,237,0.5), rgba(168,85,247,0.2), rgba(232,121,249,0.3)) border-box',
        border: '1px solid transparent',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)' }}
        />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#a78bfa' }}>
          Brand DNA Extracted
        </span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-base font-bold text-zinc-50">{brand.name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#a1a1aa' }}>{brand.niche}</p>
        </div>

        {dna?.colors && dna.colors.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#52525b' }}>Brand Colors</p>
            <div className="flex gap-1.5 flex-wrap">
              {dna.colors.map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full"
                  style={{ background: c, boxShadow: `0 0 10px ${c}40`, border: '1px solid rgba(255,255,255,0.1)' }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}

        {dna?.voice_tone && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#52525b' }}>Voice</p>
            <p className="text-sm italic" style={{ color: '#c4b5fd' }}>"{dna.voice_tone}"</p>
          </div>
        )}

        {dna?.keywords && dna.keywords.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#52525b' }}>Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {dna.keywords.slice(0, 6).map((kw, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: 'rgba(124,58,237,0.12)',
                    color: '#a78bfa',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {dna?.personality && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#71717a' }}>{dna.personality}</p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Platform Picker ──────────────────────────────────────────────────────────

function PlatformPicker({
  selected,
  onChange,
  onConfirm,
}: {
  selected: Platform[]
  onChange: (p: Platform[]) => void
  onConfirm: () => void
}) {
  const toggle = (id: Platform) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(18,18,26,0.95)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#71717a' }}>Choose Platforms</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => {
            const active = selected.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
                style={{
                  background: active ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                  borderColor: active ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${active ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: active ? '#c4b5fd' : '#52525b',
                }}
              >
                <span
                  className={`platform-${p.id} w-3 h-3 rounded-full flex-shrink-0`}
                />
                {p.label}
                {active && <Check size={11} className="ml-auto flex-shrink-0" style={{ color: '#a78bfa' }} />}
              </button>
            )
          })}
        </div>

        <button
          onClick={onConfirm}
          disabled={selected.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#fafafa', color: '#09090b' }}
        >
          Continue
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Posts Picker ─────────────────────────────────────────────────────────────

function PostsPicker({
  value,
  onChange,
  onLaunch,
  loading,
}: {
  value: number
  onChange: (n: number) => void
  onLaunch: () => void
  loading: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(18,18,26,0.95)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#71717a' }}>Posts Per Platform</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#a1a1aa' }}>Number of posts</span>
          <span
            className="text-2xl font-bold"
            style={{ color: '#a78bfa', textShadow: '0 0 20px rgba(167,139,250,0.4)' }}
          >
            {value}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{ accentColor: '#7c3aed' }}
        />
        <div className="flex justify-between text-xs" style={{ color: '#3f3f46' }}>
          <span>1</span>
          <span>10</span>
        </div>

        <button
          onClick={onLaunch}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed btn-shine"
          style={{
            background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: '#fff',
            boxShadow: loading ? 'none' : '0 0 24px rgba(168,85,247,0.4)',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <Zap size={14} />
              Launch Campaign
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

// ─── AI Avatar ────────────────────────────────────────────────────────────────

function AIAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        boxShadow: '0 0 20px rgba(168,85,247,0.4)',
      }}
    >
      <Sparkles size={13} className="text-white" />
    </div>
  )
}

// ─── Chat Message ─────────────────────────────────────────────────────────────

function ChatMessageItem({
  message,
  selectedPlatforms,
  onPlatformsChange,
  onPlatformsConfirm,
  numPosts,
  onNumPostsChange,
  onLaunch,
  launching,
}: {
  message: ChatMessage
  selectedPlatforms: Platform[]
  onPlatformsChange: (p: Platform[]) => void
  onPlatformsConfirm: () => void
  numPosts: number
  onNumPostsChange: (n: number) => void
  onLaunch: () => void
  launching: boolean
}) {
  if (message.role === 'ai') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3"
      >
        <AIAvatar />
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed max-w-[85%]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(12px)',
            color: '#d4d4d8',
          }}
        >
          {message.content}
        </div>
      </motion.div>
    )
  }

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div
          className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed max-w-[85%]"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#ede9fe',
            boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          }}
        >
          {message.content}
        </div>
      </motion.div>
    )
  }

  if (message.role === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3"
      >
        <AIAvatar />
        <div className="flex-1 max-w-[85%]">
          {message.card === 'loading' && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl rounded-tl-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="flex gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7c3aed' }} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a855f7' }} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7c3aed' }} />
              </motion.div>
              <span className="text-xs" style={{ color: '#71717a' }}>Analyzing your brand...</span>
            </div>
          )}
          {message.card === 'brand-dna' && message.brand && (
            <BrandDNABlock brand={message.brand} />
          )}
          {message.card === 'platform-picker' && (
            <PlatformPicker
              selected={selectedPlatforms}
              onChange={onPlatformsChange}
              onConfirm={onPlatformsConfirm}
            />
          )}
          {message.card === 'posts-picker' && (
            <PostsPicker
              value={numPosts}
              onChange={onNumPostsChange}
              onLaunch={onLaunch}
              loading={launching}
            />
          )}
        </div>
      </motion.div>
    )
  }

  return null
}

// ─── File Chip ────────────────────────────────────────────────────────────────

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
      style={{
        background: 'rgba(124,58,237,0.1)',
        color: '#a78bfa',
        border: '1px solid rgba(124,58,237,0.25)',
      }}
    >
      <span className="max-w-[100px] truncate">{file.name}</span>
      <button onClick={onRemove} className="flex-shrink-0 hover:text-zinc-50 transition-colors cursor-pointer">
        <X size={10} />
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const [pageLoading, setPageLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('brand-input')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'twitter'])
  const [numPosts, setNumPosts] = useState(5)
  const [campaignGoal, setCampaignGoal] = useState('')
  const [createdBrand, setCreatedBrand] = useState<Brand | null>(null)
  const [launching, setLaunching] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    getBrands()
      .then((brands) => {
        if (brands && brands.length > 0) {
          router.replace('/dashboard')
        } else {
          setPageLoading(false)
          setMessages([
            {
              id: 'greeting',
              role: 'ai',
              content:
                "Hi, I'm Britney — your AI marketing agent. Tell me about your brand. You can describe it in a few sentences, paste your website URL, or upload brand assets.",
            },
          ])
        }
      })
      .catch(() => {
        setPageLoading(false)
        setMessages([
          {
            id: 'greeting',
            role: 'ai',
            content:
              "Hi, I'm Britney — your AI marketing agent. Tell me about your brand. You can describe it in a few sentences, paste your website URL, or upload brand assets.",
          },
        ])
      })
  }, [router])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [inputValue])

  useEffect(() => {
    setDetectedUrl(detectUrl(inputValue))
  }, [inputValue])

  const addMessage = (msg: Omit<ChatMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setMessages((prev) => [...prev, { ...msg, id }])
    return id
  }

  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
  }

  const handleBrandSubmit = async () => {
    const text = inputValue.trim()
    if (!text && files.length === 0) return

    let userContent = text
    if (files.length > 0) {
      userContent += userContent ? ` [+ ${files.length} file(s)]` : `[${files.length} file(s) attached]`
    }
    addMessage({ role: 'user', content: userContent })
    setInputValue('')
    setFiles([])

    const loadingId = addMessage({ role: 'card', card: 'loading' })
    setPhase('brand-processing')

    try {
      const form = new FormData()
      form.append('name', '')
      form.append('description', '')
      form.append('niche', '')
      form.append('text_context', text)
      if (detectedUrl) form.append('website_url', detectedUrl)
      for (const file of files) {
        form.append('files', file)
      }

      const brand = await createBrand(form)
      setCreatedBrand(brand)
      updateMessage(loadingId, { card: 'brand-dna', brand })
      setPhase('brand-confirmed')

      setTimeout(() => {
        addMessage({
          role: 'ai',
          content: `Got it — I've extracted the DNA for ${brand.name}. Now let's set up your first campaign. What's your marketing goal?`,
        })
        setPhase('campaign-goal')
      }, 400)
    } catch (err) {
      updateMessage(loadingId, {
        role: 'ai',
        card: undefined,
        content: 'Something went wrong analyzing your brand. Try again with more details.',
      })
      setPhase('brand-input')
      toast.error(err instanceof Error ? err.message : 'Failed to analyze brand')
    }
  }

  const handleGoalSubmit = async () => {
    const text = inputValue.trim()
    if (!text) return

    setCampaignGoal(text)
    addMessage({ role: 'user', content: text })
    setInputValue('')
    setPhase('campaign-platforms')

    setTimeout(() => {
      addMessage({
        role: 'ai',
        content: 'Great goal. Which platforms should we create content for?',
      })
      addMessage({ role: 'card', card: 'platform-picker' })
    }, 300)
  }

  const handlePlatformsConfirm = () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform')
      return
    }

    addMessage({
      role: 'user',
      content: selectedPlatforms.map((p) => PLATFORMS.find((x) => x.id === p)?.label ?? p).join(', '),
    })
    setPhase('campaign-posts')

    setTimeout(() => {
      addMessage({
        role: 'ai',
        content: 'How many posts should I generate per platform?',
      })
      addMessage({ role: 'card', card: 'posts-picker' })
    }, 300)
  }

  const handleLaunchCampaign = async () => {
    if (!createdBrand) return

    setLaunching(true)

    try {
      const campaign = await createCampaign({
        brand_id: createdBrand.id,
        goal: campaignGoal,
        platforms: selectedPlatforms,
        num_posts: numPosts,
      })

      await startCampaign(campaign.id)

      addMessage({
        role: 'ai',
        content: `Campaign created. Britney is spinning up ${numPosts * selectedPlatforms.length} posts across ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}. Taking you to the pipeline now...`,
      })

      setPhase('done')

      setTimeout(() => {
        router.push(`/campaign/${campaign.id}`)
      }, 1200)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to launch campaign')
      setLaunching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if (phase === 'brand-input') handleBrandSubmit()
    else if (phase === 'campaign-goal') handleGoalSubmit()
  }

  const canSend =
    (phase === 'brand-input' && (inputValue.trim().length > 0 || files.length > 0)) ||
    (phase === 'campaign-goal' && inputValue.trim().length > 0)

  const showInput = phase === 'brand-input' || phase === 'campaign-goal'

  if (pageLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div
          className="absolute"
          style={{
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 400,
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div className="relative flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center float"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              boxShadow: '0 0 40px rgba(168,85,247,0.5)',
            }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <div
            className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: '#3730a3', borderTopColor: '#a855f7' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen relative" style={{ background: '#0a0a0f' }}>
      <AtmosphericBackground />

      {/* Header */}
      <div
        className="flex-shrink-0 z-10 relative px-6 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              boxShadow: '0 0 20px rgba(168,85,247,0.4)',
            }}
          >
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold gradient-text leading-none">Britney</h1>
            <p className="text-[11px] mt-0.5" style={{ color: '#52525b' }}>AI Marketing Agent</p>
          </div>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa' }}
        >
          <div className="relative">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full ping-slow" style={{ background: '#22c55e' }} />
          </div>
          Ready
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center pt-16 pb-8"
            >
              <div
                className="w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center float"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  boxShadow: '0 0 60px rgba(168,85,247,0.5)',
                }}
              >
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2 gradient-text">Meet Britney</h2>
              <p className="text-sm" style={{ color: '#71717a' }}>
                Your AI-powered marketing agent. Let's build your brand.
              </p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                selectedPlatforms={selectedPlatforms}
                onPlatformsChange={setSelectedPlatforms}
                onPlatformsConfirm={handlePlatformsConfirm}
                numPosts={numPosts}
                onNumPostsChange={setNumPosts}
                onLaunch={handleLaunchCampaign}
                launching={launching}
              />
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="flex-shrink-0 relative z-10 px-4 py-4"
            style={{
              background: 'rgba(10,10,15,0.9)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="max-w-2xl mx-auto space-y-2">
              {/* File chips */}
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {files.map((f, i) => (
                    <FileChip
                      key={i}
                      file={f}
                      onRemove={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              )}

              {/* URL preview */}
              {detectedUrl && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{
                    background: 'rgba(124,58,237,0.08)',
                    border: '1px solid rgba(124,58,237,0.2)',
                  }}
                >
                  <Globe size={11} style={{ color: '#a78bfa' }} className="flex-shrink-0" />
                  <span className="truncate" style={{ color: '#a78bfa' }}>{detectedUrl}</span>
                  <span className="flex-shrink-0" style={{ color: '#52525b' }}>will be scraped</span>
                </div>
              )}

              {/* Input row */}
              <div
                className="flex items-end gap-2 rounded-2xl px-3 py-2.5 transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 p-2 rounded-xl transition-all duration-200 cursor-pointer"
                  style={{ color: '#52525b' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#a78bfa'
                    e.currentTarget.style.background = 'rgba(124,58,237,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#52525b'
                    e.currentTarget.style.background = 'transparent'
                  }}
                  title="Attach files"
                >
                  <Paperclip size={15} />
                </button>

                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    phase === 'brand-input'
                      ? 'Describe your brand, paste a URL, or just say what you do...'
                      : 'e.g. Drive awareness for our new product launch...'
                  }
                  className="flex-1 bg-transparent resize-none outline-none text-sm min-h-[24px] max-h-[120px]"
                  style={{ color: '#f4f4f5' }}
                  rows={1}
                />

                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: canSend ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.04)',
                    boxShadow: canSend ? '0 0 20px rgba(168,85,247,0.4)' : 'none',
                  }}
                >
                  <Send size={13} style={{ color: canSend ? '#fff' : '#3f3f46' }} />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  if (e.target.files) setFiles(Array.from(e.target.files))
                }}
                className="hidden"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
