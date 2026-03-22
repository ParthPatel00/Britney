"""Research Agent: Uses Perplexity for real-time trends, then Gemini to structure results."""
import json
from agents.base import BaseAgent
from services import perplexity, gemini
from pipeline.event_bus import EventBus
from database import SessionLocal
from models.campaign import ResearchOutput
from models.content import Trend
from datetime import datetime, timezone, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

DEMO_LOGS = [
    "Connecting to Perplexity AI Agent...",
    "Scanning trending topics in your niche...",
    "Analyzing competitor social media activity...",
    "Identifying viral content formats...",
    "Searching recent news and cultural moments...",
    "Scoring relevance for your brand...",
    "Extracting content opportunities...",
    "Building trend radar...",
    "Finalizing research insights...",
]


class ResearchAgent(BaseAgent):
    def __init__(self, bus: EventBus, campaign_id: str):
        super().__init__(bus, campaign_id)

    async def run(self, niche: str, brand_description: str, brand_name: str) -> dict:
        await self.log(f"Researching trends for '{niche}'...", "research")

        # Emit demo logs for visual effect
        if self.settings.demo_mode:
            import asyncio
            for log in DEMO_LOGS[:3]:
                await self.log(log, "research")
                await asyncio.sleep(0.3)

        # Step 1: Perplexity real-time research
        await self.log("Querying Perplexity for real-time trends...", "research")
        raw_research = await perplexity.research_trends(niche, brand_name, brand_description)

        if self.settings.demo_mode:
            import asyncio
            for log in DEMO_LOGS[3:6]:
                await self.log(log, "research")
                await asyncio.sleep(0.3)

        await self.progress(50, "Processing research data...", "research")

        # Step 2: Gemini structures the raw Perplexity output
        await self.log("Structuring insights with Gemini...", "research")
        structured = await self._structure_with_gemini(
            raw_research, niche, brand_name, brand_description
        )

        if self.settings.demo_mode:
            import asyncio
            for log in DEMO_LOGS[6:]:
                await self.log(log, "research")
                await asyncio.sleep(0.2)

        await self.progress(90, "Saving research output...", "research")

        # Step 3: Save to DB
        self._save_to_db(structured)
        self._save_trends(structured.get("trends", []))

        await self.progress(100, "Research complete", "research")
        await self.log(f"Found {len(structured.get('trends', []))} trends, "
                       f"opportunity score: {structured.get('opportunity_score', 0.7):.0%}", "research")

        return structured

    async def _structure_with_gemini(
        self, raw: dict, niche: str, brand_name: str, brand_description: str
    ) -> dict:
        prompt = f"""
You are a social media marketing strategist. Analyze the following raw research data and structure it.

Brand: {brand_name}
Description: {brand_description}
Niche: {niche}

TRENDS RESEARCH:
{raw.get('trends_raw', {}).get('content', 'No data available')}

COMPETITOR ACTIVITY:
{raw.get('competitors_raw', {}).get('content', 'No data available')}

NEWS & OPPORTUNITIES:
{raw.get('news_raw', {}).get('content', 'No data available')}

Return a JSON object with this exact structure:
{{
  "trends": [
    {{
      "id": "unique-id",
      "topic": "topic name",
      "score": 0.85,
      "category": "tech|culture|entertainment|business|lifestyle",
      "summary": "2-3 sentence summary of the trend",
      "source_urls": [],
      "hijack_idea": "specific idea for {brand_name} to leverage this trend"
    }}
  ],
  "competitor_insights": ["insight 1", "insight 2", "insight 3"],
  "news_opportunities": ["opportunity 1", "opportunity 2"],
  "opportunity_score": 0.82,
  "recommended_angle": "Overall recommendation for content angle this week",
  "top_hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}}

Generate 4-6 trends. Be specific and actionable. opportunity_score is 0-1.
"""
        try:
            result = await gemini.generate_json(prompt, model=gemini.FLASH)
            # Ensure each trend has an ID
            for trend in result.get("trends", []):
                if not trend.get("id"):
                    trend["id"] = str(uuid.uuid4())
            return result
        except Exception as e:
            logger.error(f"Gemini structuring failed: {e}")
            return self._fallback_structure(niche, brand_name)

    def _fallback_structure(self, niche: str, brand_name: str) -> dict:
        return {
            "trends": [
                {
                    "id": str(uuid.uuid4()),
                    "topic": f"Sustainable {niche}",
                    "score": 0.75,
                    "category": "lifestyle",
                    "summary": f"Growing interest in sustainable and eco-friendly approaches in {niche}.",
                    "source_urls": [],
                    "hijack_idea": f"Share how {brand_name} contributes to sustainability.",
                }
            ],
            "competitor_insights": [f"Competitors in {niche} are focusing on community building."],
            "news_opportunities": ["Trending sustainability conversations are relevant."],
            "opportunity_score": 0.65,
            "recommended_angle": f"Position {brand_name} as the modern, community-focused choice.",
            "top_hashtags": [f"#{niche.replace(' ', '')}", "#innovation", "#community"],
        }

    def _save_to_db(self, structured: dict):
        db = SessionLocal()
        try:
            # Remove existing if any
            existing = db.query(ResearchOutput).filter(
                ResearchOutput.campaign_id == self.campaign_id
            ).first()
            if existing:
                db.delete(existing)
                db.flush()

            db.add(ResearchOutput(
                campaign_id=self.campaign_id,
                trends_json=json.dumps(structured.get("trends", [])),
                competitor_activity_json=json.dumps(structured.get("competitor_insights", [])),
                news_items_json=json.dumps(structured.get("news_opportunities", [])),
                opportunity_score=structured.get("opportunity_score", 0.7),
                recommended_angle=structured.get("recommended_angle", ""),
            ))
            db.commit()
        except Exception as e:
            logger.error(f"Failed to save research: {e}")
            db.rollback()
        finally:
            db.close()

    def _save_trends(self, trends: list):
        if not trends:
            return
        db = SessionLocal()
        try:
            from models.campaign import Campaign
            campaign = db.query(Campaign).filter(Campaign.id == self.campaign_id).first()
            if not campaign:
                return
            brand_id = campaign.brand_id

            # Expire old trends for this brand
            expires = datetime.now(timezone.utc) + timedelta(hours=6)
            for t in trends:
                db.add(Trend(
                    id=t.get("id", str(uuid.uuid4())),
                    brand_id=brand_id,
                    topic=t.get("topic", ""),
                    score=t.get("score", 0.5),
                    category=t.get("category", "general"),
                    summary=t.get("summary", ""),
                    source_urls_json=json.dumps(t.get("source_urls", [])),
                    hijack_content_idea=t.get("hijack_idea", ""),
                    expires_at=expires,
                ))
            db.commit()
        except Exception as e:
            logger.error(f"Failed to save trends: {e}")
            db.rollback()
        finally:
            db.close()
