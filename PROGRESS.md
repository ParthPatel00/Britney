# HackHayward - Social Media Marketing Agent: Progress

> Update this file after completing each task. Check it at the start of every session.

## Phase 1: Backend Foundation
- [ ] Create monorepo structure (`frontend/`, `backend/`)
- [ ] FastAPI app scaffold (`main.py`, `config.py`, CORS)
- [ ] SQLite + SQLAlchemy setup (`database.py`, all ORM models)
- [ ] Pydantic schemas (brand, campaign, content, agent events)
- [ ] SSE event bus (`pipeline/event_bus.py`)
- [ ] Pipeline orchestrator skeleton (`pipeline/orchestrator.py`)
- [ ] File storage manager (`storage/file_manager.py`, `uploads/`, `generated/`)
- [ ] All router stubs mounted (brand, campaign, content, trends, publish, stream)

## Phase 2: Brand Context Ingestion
- [ ] Text input → brand context
- [ ] Image upload → Gemini vision analysis → brand DNA extraction
- [ ] URL scraping (BeautifulSoup + httpx) → extract text + OG images
- [ ] PDF parsing (`pymupdf`) → text extraction
- [ ] DOCX parsing (`python-docx`) → text extraction
- [ ] `POST /api/brand/setup` fully working end-to-end
- [ ] Brand DNA stored in SQLite (colors, voice, visual style, keywords)

## Phase 3: Research + Strategy Agents
- [ ] Perplexity API service (`services/perplexity.py`)
- [ ] Research Agent: trend queries + competitor activity search
- [ ] Research Agent: Gemini post-processing → structured `TrendItem` objects
- [ ] Research Agent: 6-hour cache in trends table
- [ ] Strategy Agent: Gemini structured JSON output with PostBriefs
- [ ] Strategy Agent: platform-aware content planning (Instagram, Twitter, LinkedIn, etc.)
- [ ] SSE events emitting from both agents (AGENT_START, AGENT_LOG, AGENT_PROGRESS, AGENT_COMPLETE)
- [ ] Human review Gate 1: pipeline pauses, HUMAN_REVIEW_REQUIRED emitted
- [ ] `POST /api/campaign/{id}/approve-strategy` resumes pipeline

## Phase 4: Frontend - Brand Setup + Pipeline View
- [ ] Next.js 14 project scaffold with Tailwind + shadcn/ui + Framer Motion
- [ ] Dark purple theme configured (bg: #0a0a0f, accent: #7c3aed)
- [ ] `BrandSetupWizard` component (multi-step: text, URL, file upload)
- [ ] `AssetUploader` component (drag-and-drop with preview)
- [ ] `BrandDNACard` with animated color swatch reveal
- [ ] Campaign creation form (goal, platforms, num_posts)
- [ ] `PipelineView` component with 4 `AgentNode` cards
- [ ] `AgentConnector` SVG path-draw animation between nodes
- [ ] `StreamingLog` component (live SSE log lines per agent)
- [ ] `usePipeline` hook wired to SSE stream → Zustand store
- [ ] Node glow animations (idle/active/complete/error states via Framer Motion)
- [ ] Strategy review gate UI (editable PostBrief cards)

## Phase 5: Creative Agent (Images + Captions)
- [ ] Gemini caption generation (2 A/B variants per post)
- [ ] Gemini FLUX prompt enhancement (brief → enriched image prompt)
- [ ] FLUX image generation via Replicate (`services/replicate_flux.py`)
- [ ] Brand colors + visual style injected into every FLUX prompt
- [ ] Concurrency limit (asyncio Semaphore, max 2 simultaneous generations)
- [ ] Fallback: placeholder image with brand color overlay if FLUX fails
- [ ] AGENT_PROGRESS events emitted as posts complete (percentage)
- [ ] All generated assets saved to `backend/generated/`

## Phase 6: Human Review UI
- [ ] `ContentGrid` component (gallery of all generated posts)
- [ ] `PostCard` component (image preview, caption, platform badges)
- [ ] `ABVariantToggle` with Framer Motion layout animation
- [ ] Inline caption editing
- [ ] Approve / reject individual posts
- [ ] `RefinementChat` side panel component
- [ ] `POST /api/content/{id}/refine` SSE endpoint
- [ ] RefinementChat: Gemini determines caption-only vs. image regeneration
- [ ] In-place PostCard update with AnimatePresence (no page reload)
- [ ] Refinement history saved to DB

## Phase 7: Publishing
- [ ] Bluesky direct publishing (`atproto` library, `services/bluesky.py`)
- [ ] Zernio API service (`services/zernio.py`)
- [ ] Media upload to Zernio before posting
- [ ] Twitter/X OAuth 1.0a credentials passed in Zernio headers
- [ ] `POST /api/publish/now` endpoint
- [ ] `POST /api/publish/schedule` endpoint
- [ ] Platform-specific caption trimming (Twitter 280 chars, etc.)
- [ ] Publish status badges in UI
- [ ] Live post URL displayed after publishing
- [ ] Fallback: ZIP download of all posts + captions

## Phase 8: Auto-Pilot Mode
- [ ] APScheduler integrated into FastAPI startup
- [ ] Per-brand schedule config (frequency, enabled toggle, email, timezone)
- [ ] `PUT /api/brand/{id}/autopilot` endpoint
- [ ] Headless pipeline run on schedule
- [ ] HTML email digest template (thumbnails + approve/reject links)
- [ ] SendGrid or Gmail SMTP integration (`services/email.py`)
- [ ] One-click approve link (token-based, no login required)
- [ ] Settings page in frontend (auto-pilot toggle, frequency, email)

## Phase 9: Trend Radar + Trend Hijack
- [ ] `GET /api/trends` endpoint (returns cached trend data)
- [ ] `TrendRadar` component (Recharts bubble chart)
- [ ] Trend bubbles: size = relevance score, color = category
- [ ] `TrendCard` component with hijack button
- [ ] `TrendHijackModal` confirm dialog
- [ ] `POST /api/trends/hijack` triggers mini single-post pipeline
- [ ] Trend hijack posts go directly to content review

## Phase 10: Video + Audio
- [ ] Gemini Veo video generation (`services/gemini_veo.py`)
- [ ] ElevenLabs TTS voiceover (`services/elevenlabs.py`)
- [ ] ffmpeg: stitch audio onto video
- [ ] Fallback: ffmpeg image+audio slideshow if Veo unavailable
- [ ] `MediaPreview` component supports video + audio playback
- [ ] Video posts handled correctly by Zernio publisher

## Phase 11: Polish + Demo Prep
- [ ] `DEMO_MODE=true` fake progress log emission during slow API calls
- [ ] Loading skeletons on all async UI sections
- [ ] Error states handled gracefully everywhere (no crashes)
- [ ] Page refresh recovery (SSE replays past events from DB)
- [ ] Pre-seeded PlantPal brand in DB for instant demo start
- [ ] Pre-run campaign at content review stage for demo
- [ ] Mobile-responsive layout check
- [ ] README with setup instructions
- [ ] `.env.example` with all keys documented

---

## Notes / Blockers

_Add any blockers, decisions, or notes here as you go._
