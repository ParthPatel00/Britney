'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Bot, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Post } from '../../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  state?: 'analyzing' | 'updating-caption' | 'regenerating-image' | 'done'
}

interface RefinementChatProps {
  post: Post
  onClose: () => void
  onPostUpdate: (post: Post) => void
}

// ─── Animated Dots ────────────────────────────────────────────────────────────

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5 items-center ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          className="w-1 h-1 rounded-full inline-block"
          style={{ background: '#94a3b8' }}
        />
      ))}
    </span>
  )
}

// ─── State label ──────────────────────────────────────────────────────────────

function StateLabel({ state }: { state: Message['state'] }) {
  if (!state || state === 'done') return null
  const labels = {
    analyzing: 'Analyzing your request',
    'updating-caption': 'Updating caption',
    'regenerating-image': 'Regenerating image',
  }
  return (
    <span className="text-xs italic" style={{ color: '#94a3b8' }}>
      {labels[state]}
      <AnimatedDots />
    </span>
  )
}

// ─── RefinementChat ───────────────────────────────────────────────────────────

export default function RefinementChat({ post, onClose, onPostUpdate }: RefinementChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `I'm ready to refine this post. Tell me what you'd like to change — caption, tone, style, or regenerate the image.`,
      state: 'done',
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    setIsStreaming(true)

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    }

    const assistantId = `assistant-${Date.now()}`
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      state: 'analyzing',
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    try {
      // Use the active variant id
      const variantId = post.selected_variant_id ?? post.variants[0]?.id

      const res = await fetch(`/api/content/${post.id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, variant_id: variantId }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data) as {
              type?: string
              content?: string
            }

            if (parsed.type === 'state') {
              const stateMap: Record<string, Message['state']> = {
                analyzing: 'analyzing',
                caption: 'updating-caption',
                image: 'regenerating-image',
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, state: stateMap[parsed.content ?? ''] ?? 'analyzing' }
                    : m,
                ),
              )
            } else if (parsed.type === 'text') {
              const chunk = parsed.content ?? ''
              fullContent += chunk
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: fullContent, state: 'done' } : m,
                ),
              )
            } else if (parsed.type === 'post_update' && parsed.content) {
              try {
                const { post: updatedPost } = JSON.parse(parsed.content) as { post: Post }
                if (updatedPost) onPostUpdate(updatedPost)
              } catch {
                // ignore
              }
            }
          } catch {
            // Ignore parse errors for partial chunks
          }
        }
      }

      if (!fullContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Done! The post has been updated.', state: 'done' }
              : m,
          ),
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refinement failed')
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.', state: 'done' }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: '#12121a',
        border: '1px solid #2d2d3d',
        height: '100%',
        minHeight: '400px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #2d2d3d' }}
      >
        <div className="flex items-center gap-2">
          <Bot size={16} style={{ color: '#a855f7' }} />
          <span className="text-sm font-semibold" style={{ color: '#f8fafc' }}>
            Refine with AI
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-white/5"
          style={{ color: '#94a3b8' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: msg.role === 'user' ? '#27272a' : '#1c1c1f',
                  border: '1px solid',
                  borderColor: msg.role === 'user' ? '#3f3f46' : '#27272a',
                }}
              >
                {msg.role === 'user' ? (
                  <User size={12} style={{ color: '#a1a1aa' }} />
                ) : (
                  <Bot size={12} style={{ color: '#e879f9' }} />
                )}
              </div>

              {/* Bubble */}
              <div
                className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                style={{
                  background: msg.role === 'user' ? '#27272a' : '#1c1c1f',
                  border: `1px solid ${msg.role === 'user' ? '#3f3f46' : '#27272a'}`,
                  color: '#f8fafc',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : undefined,
                  borderTopLeftRadius: msg.role === 'assistant' ? '4px' : undefined,
                }}
              >
                {msg.state && msg.state !== 'done' ? (
                  <StateLabel state={msg.state} />
                ) : (
                  msg.content || <AnimatedDots />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid #27272a' }}
      >
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what to change..."
            disabled={isStreaming}
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all duration-200 disabled:opacity-50"
            style={{
              background: '#1c1c1f',
              border: '1px solid #27272a',
              color: '#f4f4f5',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(250,250,250,0.2)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#27272a')}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-xl cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: '#fafafa', color: '#09090b' }}
          >
            {isStreaming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
