# API Keys Setup Guide

Complete setup instructions for every service used in this project.
After fetching each key, add it to your `.env` file in `backend/`.

---

## 1. Gemini API Key
**Used for:** All AI agents (strategy, captions, brand DNA extraction, refinement chat) + Veo video generation

**Steps:**
1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click **"Get API Key"** in the top left
4. Click **"Create API key"** → select or create a Google Cloud project
5. Copy the key

**Free tier:** 15 RPM (requests per minute), 1M tokens/day on `gemini-2.0-flash`. More than enough.

```env
GEMINI_API_KEY=your_key_here
```

---

## 2. Perplexity API Key
**Used for:** Research Agent - real-time web search for trends, competitor activity, news

**Steps:**
1. Go to https://www.perplexity.ai/settings/api
2. Sign in to your Perplexity account
3. Click **"Generate"** under API Keys
4. Copy the key

**Model to use:** `sonar-pro` (has real-time web access + citations)

```env
PERPLEXITY_API_KEY=your_key_here
```

---

## 3. Replicate API Token
**Used for:** FLUX.1-schnell image generation

**Steps:**
1. Go to https://replicate.com
2. Sign up / sign in
3. Click your avatar (top right) → **"API tokens"**
4. Click **"Create token"**
5. Copy the token

**Free tier:** Replicate gives free credits on signup. FLUX.1-schnell costs ~$0.003/image.
**Model:** `black-forest-labs/flux-schnell`

```env
REPLICATE_API_TOKEN=your_token_here
```

---

## 4. ElevenLabs API Key
**Used for:** Text-to-speech voiceovers for video content

**Steps:**
1. Go to https://elevenlabs.io
2. Sign in to your account (you already have credits)
3. Click your avatar (bottom left) → **"Profile + API key"**
4. Copy the API key shown there

```env
ELEVENLABS_API_KEY=your_key_here
```

---

## 5. Zernio API Key
**Used for:** Publishing to all social media platforms (Instagram, Facebook, Twitter/X, LinkedIn, TikTok, YouTube, etc.) from one API call

**Steps:**
1. Go to https://zernio.com/social-media-api (formerly Late.dev)
2. Sign up with your email
3. In the dashboard, go to **"API Keys"** → **"Generate API Key"**
4. Copy the key

**Then connect your social accounts:**
- In the Zernio dashboard → **"Connected Accounts"**
- Click each platform icon and complete the OAuth flow:
  - **Instagram**: Must be a Business or Creator account + linked to a Facebook Page
  - **Facebook**: Must be a Facebook Page (not personal profile)
  - **Twitter/X**: Connect account (but also need Twitter OAuth keys below)
  - **LinkedIn**: Personal account works for personal profile posting
  - **TikTok**: Connect your TikTok account
  - **YouTube**: Sign in with Google account that has a YouTube channel

**Free tier:** 20 posts/month (enough for the entire hackathon demo)

```env
ZERNIO_API_KEY=your_key_here
```

---

## 6. Twitter/X Developer Credentials
**Used for:** Required by Zernio for Twitter/X posting (post-March 31, 2026, Zernio requires your own OAuth credentials)

**Steps:**
1. Go to https://developer.x.com
2. Sign in with your Twitter/X account
3. Click **"Sign up for Free Account"** if you don't have developer access
   - Fill in the use case form honestly: "Automated social media posting for a personal project"
   - Approval is usually same-day
4. Once approved, go to **"Projects & Apps"** → **"+ New Project"**
   - Project name: "HackHayward Marketing"
   - Use case: "Making a bot"
   - Description: "Automated social media content posting"
5. Create an App within the project
6. Go to **App Settings** → **"User authentication settings"** → Enable OAuth 1.0a, set permissions to **"Read and Write"**
7. Go to **"Keys and Tokens"**:
   - Copy **API Key** and **API Key Secret**
   - Under "Access Token and Secret" → click **"Generate"** → copy both tokens

```env
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_token_secret
```

---

## 7. Bluesky App Password
**Used for:** Direct Bluesky posting as guaranteed free fallback (no approval needed)

**Steps:**
1. Go to https://bsky.app
2. Sign in (create account if needed - it's free)
3. Go to **Settings** → **"Privacy and Security"** → **"App Passwords"**
4. Click **"Add App Password"**
5. Name it "HackHayward" → click **"Create App Password"**
6. Copy the generated password (looks like: `xxxx-xxxx-xxxx-xxxx`)

```env
BLUESKY_HANDLE=yourhandle.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

---

## 8. Email for Auto-Pilot Digests
**Used for:** Sending scheduled content digests with approve/reject links

### Option A: SendGrid (Recommended - 100 free emails/day)
1. Go to https://sendgrid.com → Sign up (free)
2. Go to **Settings** → **"API Keys"** → **"Create API Key"**
3. Select **"Restricted Access"** → enable **"Mail Send"**
4. Copy the key
5. Verify a sender email at **Settings** → **"Sender Authentication"**

```env
SENDGRID_API_KEY=SG.your_key_here
EMAIL_FROM=your-verified@email.com
```

### Option B: Gmail SMTP (Simpler setup)
1. Go to your Google Account → **Security** → **"2-Step Verification"** (must be enabled)
2. Go to **Security** → **"App passwords"**
3. Select app: "Mail", device: "Other" → type "HackHayward" → click **"Generate"**
4. Copy the 16-character app password

```env
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=your@gmail.com
```

---

## 9. App Base URL
**Used for:** Generating deep-links in email digests back to the review page

```env
APP_BASE_URL=http://localhost:3000
```

For deployment, change this to your public URL.

---

## Demo Mode
Enable this to emit fake progress log lines during slow API calls (keeps the UI animated during video generation waits):

```env
DEMO_MODE=true
```

---

## Complete `.env` Template

```env
# AI Agents
GEMINI_API_KEY=

# Research (Real-time web)
PERPLEXITY_API_KEY=

# Image Generation
REPLICATE_API_TOKEN=

# Audio/Voiceover
ELEVENLABS_API_KEY=

# Social Media Publishing
ZERNIO_API_KEY=
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=

# Bluesky (guaranteed fallback)
BLUESKY_HANDLE=
BLUESKY_APP_PASSWORD=

# Email Digests (choose one)
SENDGRID_API_KEY=
EMAIL_FROM=
# -- OR --
GMAIL_USER=
GMAIL_APP_PASSWORD=

# App Config
APP_BASE_URL=http://localhost:3000
DEMO_MODE=true
```
