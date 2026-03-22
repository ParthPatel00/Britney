# HackHayward - Claude Instructions

## Project Overview

Social media marketing AI agent for HackHayward hackathon. Full-stack monorepo:

- `frontend/` - Next.js 14 + Tailwind + Framer Motion + shadcn/ui
- `backend/` - Python FastAPI + SQLite + SSE streaming

See `PROGRESS.md` for the full task checklist and current status.
See `API_SETUP.md` for credential setup instructions.

## Rules for This Project

### Between Every Phase: Check Progress

Before starting any new phase of work, read `PROGRESS.md` and update it:

1. Mark completed tasks as `[x]`
2. Note any blockers in the Notes section
3. Confirm which phase you're starting next

### UI/UX Quality Standard

This is a hackathon demo that must impress judges. Before writing any frontend component:

- Use the `ui-ux-pro-max` skill to ensure the design is polished and professional
- Never write generic, plain, or "AI-generated looking" UI
- Every component should have thoughtful animations (Framer Motion), proper spacing, and dark theme consistency
- Reference the design system: bg `#0a0a0f`, surface `#12121a`, accent `#7c3aed`, glow `#a855f7`

### Tech Stack Decisions (Do Not Change)

- **All AI agents**: Google Gemini API (`gemini-2.0-flash` for speed, `gemini-1.5-pro` for complex reasoning)
- **Research**: Perplexity AI Agent API (`sonar-pro` model with real-time web access)
- **Images**: FLUX.1-schnell via Replicate
- **Video**: Gemini Veo 2 (same Gemini API key)
- **Audio/voiceover**: ElevenLabs
- **Publishing**: Zernio/Late.dev (primary) + Bluesky AT Protocol (fallback)
- **Database**: SQLite via SQLAlchemy (keep it simple)
- **Streaming**: Server-Sent Events (SSE) via FastAPI StreamingResponse

### Code Style

- Python backend: async/await throughout, Pydantic v2 for all schemas
- TypeScript frontend: strict mode, functional components only
- No unnecessary abstractions - this is a hackathon, ship fast
- Keep error handling graceful but minimal - never crash, always fall back

### Demo Brand

The app is pre-seeded with **PlantPal** (AI plant care app) as the default brand.
This is the demo brand used during hackathon presentation - keep it in the DB seed.

### Publishing Platforms

Target: Instagram, Facebook, Twitter/X, LinkedIn, TikTok, YouTube (via Zernio).
Bluesky is the guaranteed fallback (direct `atproto` library, no approval needed).

### No Auth

No authentication required. This is a hackathon with root access assumed.
All endpoints are open. No login, no sessions, no JWT.
