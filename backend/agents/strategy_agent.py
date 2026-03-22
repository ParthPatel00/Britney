"""Strategy Agent: Creates PostBriefs from research using Gemini."""
import json
import uuid
from agents.base import BaseAgent
from services import gemini
from pipeline.event_bus import EventBus
from database import SessionLocal
from models.campaign import StrategyOutput
import logging

logger = logging.getLogger(__name__)

DEMO_LOGS = [
    "Analyzing research findings...",
    "Identifying top content opportunities...",
    "Matching opportunities to platforms...",
    "Crafting platform-specific strategies...",
    "Defining visual directions for each post...",
    "Optimizing posting schedule for maximum reach...",
    "Writing detailed post briefs...",
    "Finalizing content calendar...",
]

PLATFORM_CONSTRAINTS = {
    "instagram": "Visual-first. 2200 char caption limit. Use 5-10 hashtags. Stories and Reels perform best. Aesthetic consistency matters.",
    "twitter": "280 char limit. Punchy, conversational. 1-2 hashtags max. Threads work well for longer content. Real-time engagement.",
    "linkedin": "Professional tone. 3000 char limit. Thought leadership performs well. 3-5 hashtags. Articles and native video do well.",
    "facebook": "Conversational. 63,206 char limit. Video gets most reach. Community-focused content. Mix of formats.",
    "tiktok": "Video-first, 60-180 seconds ideal. Trending audio. Casual, authentic tone. Educational or entertaining hooks. Captions in video.",
    "youtube": "Long-form or Shorts (< 60s). Searchable titles. Detailed descriptions. Educational/tutorial content performs well.",
}


class StrategyAgent(BaseAgent):
    def __init__(self, bus: EventBus, campaign_id: str):
        super().__init__(bus, campaign_id)

    async def run(
        self,
        research_output: dict,
        brand_name: str,
        brand_dna: dict,
        brand_description: str,
        goal: str,
        platforms: list[str],
        num_posts: int,
    ) -> dict:
        if self.settings.demo_mode:
            import asyncio
            for log in DEMO_LOGS[:2]:
                await self.log(log, "strategy")
                await asyncio.sleep(0.4)

        await self.log("Building content strategy with Gemini...", "strategy")
        await self.progress(20, "Analyzing research...", "strategy")

        strategy = await self._generate_strategy(
            research_output, brand_name, brand_dna, brand_description, goal, platforms, num_posts
        )

        if self.settings.demo_mode:
            import asyncio
            for log in DEMO_LOGS[2:6]:
                await self.log(log, "strategy")
                await asyncio.sleep(0.3)

        await self.progress(80, "Finalizing strategy...", "strategy")

        self._save_to_db(strategy)

        if self.settings.demo_mode:
            import asyncio
            for log in DEMO_LOGS[6:]:
                await self.log(log, "strategy")
                await asyncio.sleep(0.2)

        await self.progress(100, "Strategy ready for review", "strategy")
        await self.log(
            f"Created {len(strategy.get('post_briefs', []))} post briefs across {len(platforms)} platforms",
            "strategy"
        )
        return strategy

    async def _generate_strategy(
        self, research: dict, brand_name: str, dna: dict, description: str,
        goal: str, platforms: list[str], num_posts: int
    ) -> dict:
        trends_text = json.dumps(research.get("trends", [])[:5], indent=2)
        competitors_text = "\n".join(research.get("competitor_insights", []))
        platform_constraints = "\n".join(
            f"- {p.upper()}: {PLATFORM_CONSTRAINTS.get(p, 'Standard platform')}"
            for p in platforms
        )

        prompt = f"""
You are a senior social media marketing strategist. Create a detailed content strategy.

BRAND: {brand_name}
DESCRIPTION: {description}
GOAL: {goal}
BRAND VOICE: {dna.get('voice_tone', 'professional and engaging')}
VISUAL STYLE: {dna.get('visual_style', 'modern and clean')}
BRAND COLORS: {', '.join(dna.get('colors', ['#7c3aed', '#a855f7']))}
KEYWORDS: {', '.join(dna.get('keywords', []))}

TRENDING NOW:
{trends_text}

COMPETITOR INSIGHTS:
{competitors_text}

RECOMMENDED ANGLE: {research.get('recommended_angle', '')}

PLATFORMS & CONSTRAINTS:
{platform_constraints}

Create exactly {num_posts} post briefs distributed across these platforms: {', '.join(platforms)}.

Return JSON with this structure:
{{
  "strategy_id": "unique-strategy-id",
  "overall_narrative": "2-3 sentence overarching content narrative for this campaign",
  "content_pillars": ["pillar 1", "pillar 2", "pillar 3"],
  "post_briefs": [
    {{
      "brief_id": "unique-brief-id",
      "platform": "instagram",
      "content_type": "image",
      "caption_direction": "Specific direction for caption writing. Include desired tone, length, call-to-action.",
      "visual_direction": "Detailed visual description: composition, mood, colors, subject matter, style.",
      "hashtags": ["#relevant", "#hashtags"],
      "best_post_time": "Tuesday 10:00 AM",
      "tone": "playful",
      "trend_reference": "Which trend from research this leverages (or null)"
    }}
  ],
  "posting_schedule": {{
    "week_1": ["brief_id_1", "brief_id_2"]
  }}
}}

Rules:
- Vary content types (image, video, carousel) across posts
- Match tone to platform (casual for TikTok, professional for LinkedIn)
- Reference specific trends from the research data
- Make visual directions VERY specific (colors, composition, mood, specific elements)
- Make caption directions actionable with specific hooks and CTAs
- Distribute posts across all provided platforms evenly
"""
        try:
            result = await gemini.generate_json(prompt, model=gemini.PRO)
            if "strategy_id" not in result:
                result["strategy_id"] = str(uuid.uuid4())
            for brief in result.get("post_briefs", []):
                if "brief_id" not in brief:
                    brief["brief_id"] = str(uuid.uuid4())
            return result
        except Exception as e:
            logger.error(f"Strategy generation failed: {e}")
            return self._fallback_strategy(brand_name, platforms, num_posts)

    def _fallback_strategy(self, brand_name: str, platforms: list[str], num_posts: int) -> dict:
        briefs = []
        for i in range(num_posts):
            platform = platforms[i % len(platforms)]
            briefs.append({
                "brief_id": str(uuid.uuid4()),
                "platform": platform,
                "content_type": "image",
                "caption_direction": f"Share an engaging story about {brand_name}. Use a compelling hook.",
                "visual_direction": "Bright, clean composition with brand colors. Modern aesthetic.",
                "hashtags": ["#innovation", "#brand"],
                "best_post_time": "Tuesday 10:00 AM",
                "tone": "professional",
                "trend_reference": None,
            })
        return {
            "strategy_id": str(uuid.uuid4()),
            "overall_narrative": f"Showcase {brand_name}'s unique value proposition.",
            "content_pillars": ["Education", "Inspiration", "Community"],
            "post_briefs": briefs,
            "posting_schedule": {},
        }

    def _save_to_db(self, strategy: dict):
        db = SessionLocal()
        try:
            existing = db.query(StrategyOutput).filter(
                StrategyOutput.campaign_id == self.campaign_id
            ).first()
            if existing:
                db.delete(existing)
                db.flush()

            db.add(StrategyOutput(
                campaign_id=self.campaign_id,
                overall_narrative=strategy.get("overall_narrative", ""),
                post_briefs_json=json.dumps(strategy.get("post_briefs", [])),
                posting_schedule_json=json.dumps(strategy.get("posting_schedule", {})),
            ))
            db.commit()
        except Exception as e:
            logger.error(f"Failed to save strategy: {e}")
            db.rollback()
        finally:
            db.close()
