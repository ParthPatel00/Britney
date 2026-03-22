'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Paperclip, Send, X, Globe, Check, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getBrands, createBrand, createCampaign, startCampaign } from '../lib/api'
import type { Platform, Brand } from '../lib/types'

// ─── Platform data ────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: 'instagram', label: 'Instagram', color: '#e1306c' },
  { id: 'twitter', label: 'X / Twitter', color: '#ffffff' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
  { id: 'facebook', label: 'Facebook', color: '#1877f2' },
  { id: 'tiktok', label: 'TikTok', color: '#69c9d0' },
  { id: 'youtube', label: 'YouTube', color: '#ff0000' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── URL detection ────────────────────────────────────────────────────────────

function detectUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i)
  return match ? match[0] : null
}

// ─── BrandDNA Block ───────────────────────────────────────────────────────────

function BrandDNABlock({ brand }: { brand: Brand }) {
  const dna = brand.brand_dna
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Brand DNA Extracted</span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-lg font-700 text-zinc-50">{brand.name}</p>
          <p className="text-sm text-zinc-400 mt-0.5">{brand.niche}</p>
        </div>

        {dna?.colors && dna.colors.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Colors</p>
            <div className="flex gap-1.5 flex-wrap">
              {dna.colors.map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border border-zinc-700"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}

        {dna?.voice_tone && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Voice</p>
            <p className="text-sm text-zinc-300 italic">"{dna.voice_tone}"</p>
          </div>
        )}

        {dna?.keywords && dna.keywords.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {dna.keywords.slice(0, 6).map((kw, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {dna?.personality && (
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{dna.personality}</p>
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Choose Platforms</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => {
            const active = selected.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer text-left"
                style={{
                  background: active ? 'rgba(250,250,250,0.06)' : 'transparent',
                  borderColor: active ? 'rgba(250,250,250,0.2)' : '#27272a',
                  color: active ? '#f4f4f5' : '#71717a',
                }}
              >
                <span
                  className={`platform-${p.id} w-3 h-3 rounded-full flex-shrink-0`}
                />
                {p.label}
                {active && <Check size={12} className="ml-auto flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        <button
          onClick={onConfirm}
          disabled={selected.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Number of Posts</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Posts per platform</span>
          <span className="text-lg font-700 text-zinc-50">{value}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full cursor-pointer accent-violet-500"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>1</span>
          <span>10</span>
        </div>

        <button
          onClick={onLaunch}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: '#fafafa', color: '#09090b' }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Launching...
            </>
          ) : (
            <>
              Launch Campaign
              <ArrowRight size={14} />
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
      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold gradient-text"
      style={{ background: '#1c1c1f', border: '1px solid #27272a', color: '#e879f9' }}
    >
      B
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
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3"
      >
        <AIAvatar />
        <div
          className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-zinc-200 max-w-[85%]"
          style={{ background: '#27272a' }}
        >
          {message.content}
        </div>
      </motion.div>
    )
  }

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div
          className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-zinc-50 max-w-[85%]"
          style={{ background: '#3f3f46' }}
        >
          {message.content}
        </div>
      </motion.div>
    )
  }

  if (message.role === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3"
      >
        <AIAvatar />
        <div className="flex-1 max-w-[85%]">
          {message.card === 'loading' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: '#27272a' }}>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="flex gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              </motion.div>
              <span className="text-xs text-zinc-500">Analyzing your brand...</span>
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
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium"
      style={{ background: '#27272a', color: '#a1a1aa', border: '1px solid #3f3f46' }}
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

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Check for existing brands on load
  useEffect(() => {
    getBrands()
      .then((brands) => {
        if (brands && brands.length > 0) {
          router.replace('/dashboard')
        } else {
          setPageLoading(false)
          // Show greeting
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

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [inputValue])

  // Detect URL in input
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

    // User message
    let userContent = text
    if (files.length > 0) {
      userContent += userContent ? ` [+ ${files.length} file(s)]` : `[${files.length} file(s) attached]`
    }
    addMessage({ role: 'user', content: userContent })
    setInputValue('')
    setFiles([])

    // Show loading card
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

      // Replace loading with brand DNA card
      updateMessage(loadingId, { card: 'brand-dna', brand })
      setPhase('brand-confirmed')

      // AI follow-up
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
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-600 border-t-zinc-200 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: '#1c1c1f', border: '1px solid #27272a', color: '#e879f9' }}
          >
            B
          </div>
          <div>
            <h1 className="text-sm font-700 gradient-text leading-none">Britney</h1>
            <p className="text-xs text-zinc-500 mt-0.5">AI Marketing Agent</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex-shrink-0 border-t border-zinc-800 px-4 py-4"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ background: '#27272a', border: '1px solid #3f3f46' }}
                >
                  <Globe size={12} className="text-zinc-500 flex-shrink-0" />
                  <span className="text-zinc-400 truncate">{detectedUrl}</span>
                  <span className="text-zinc-600 flex-shrink-0">will be scraped</span>
                </div>
              )}

              {/* Input row */}
              <div
                className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{ background: '#27272a', border: '1px solid #3f3f46' }}
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
                  title="Attach files"
                >
                  <Paperclip size={16} />
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
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-zinc-100 placeholder-zinc-600 min-h-[24px] max-h-[120px]"
                  rows={1}
                />

                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: canSend ? '#fafafa' : 'transparent' }}
                >
                  <Send size={14} style={{ color: canSend ? '#09090b' : '#52525b' }} />
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
