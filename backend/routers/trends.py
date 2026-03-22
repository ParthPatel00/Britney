"""Trends routes: get cached trends, trend hijack."""
import json
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.content import Trend
from models.brand import Brand
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/trends", tags=["trends"])


@router.get("")
async def get_trends(brand_id: str, db: Session = Depends(get_db)):
    """Get cached trends for a brand. Auto-refreshes if stale."""
    now = datetime.now(timezone.utc)
    trends = (
        db.query(Trend)
        .filter(Trend.brand_id == brand_id)
        .filter(Trend.expires_at > now)
        .order_by(Trend.score.desc())
        .limit(12)
        .all()
    )

    if not trends:
        # No fresh trends - return empty, frontend will trigger a new campaign
        return {"trends": [], "stale": True}

    return {
        "trends": [
            {
                "id": t.id,
                "topic": t.topic,
                "score": t.score,
                "category": t.category,
                "summary": t.summary,
                "source_urls": json.loads(t.source_urls_json or "[]"),
                "hijack_idea": t.hijack_content_idea,
                "fetched_at": t.fetched_at.isoformat() if t.fetched_at else None,
            }
            for t in trends
        ],
        "stale": False,
    }


@router.post("/hijack")
async def hijack_trend(
    brand_id: str,
    trend_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Generate a single on-brand post from a trending topic."""
    trend = db.query(Trend).filter(Trend.id == trend_id).first()
    if not trend:
        raise HTTPException(404, "Trend not found")

    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")

    # Create a mini campaign
    from models.campaign import Campaign
    campaign = Campaign(
        id=str(uuid.uuid4()),
        brand_id=brand_id,
        goal=f"Capitalize on trending topic: {trend.topic}",
        platforms_json=json.dumps(["instagram", "twitter"]),
        num_posts=1,
        status="created",
        is_auto_pilot="hijack",
    )
    db.add(campaign)
    db.commit()

    background_tasks.add_task(_run_hijack_pipeline, campaign.id, trend_id)
    return {"campaign_id": campaign.id, "status": "started"}


async def _run_hijack_pipeline(campaign_id: str, trend_id: str):
    """Simplified pipeline for trend hijacking."""
    from database import SessionLocal
    from models.content import Trend
    from models.brand import Brand
    from models.campaign import Campaign, StrategyOutput
    from agents.creative_agent import CreativeAgent
    from pipeline.event_bus import EventBus
    from schemas.agent import AgentEvent, AgentEventType
    from services import gemini
    import json
    import uuid

    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        trend = db.query(Trend).filter(Trend.id == trend_id).first()
        brand = db.query(Brand).filter(Brand.id == campaign.brand_id).first()
        if not all([campaign, trend, brand]):
            return
        dna = json.loads(brand.dna_json or "{}")
    finally:
        db.close()

    bus = EventBus(campaign_id)

    await bus.emit(AgentEvent(
        event_type=AgentEventType.AGENT_START, agent_name="creative",
        campaign_id=campaign_id,
        message=f"Creating content for trend: {trend.topic}",
    ))

    # Build a single post brief from the trend
    brief_id = str(uuid.uuid4())
    brief = {
        "brief_id": brief_id,
        "platform": "instagram",
        "content_type": "image",
        "caption_direction": f"Create engaging content about '{trend.topic}'. {trend.hijack_content_idea}",
        "visual_direction": f"Visually represent '{trend.topic}' in context of {brand.name}. Modern, eye-catching composition.",
        "hashtags": [f"#{trend.topic.replace(' ', '')}", f"#{brand.niche}", "#trending"],
        "best_post_time": "Now",
        "tone": "engaging",
        "trend_reference": trend.topic,
    }

    strategy = {
        "post_briefs": [brief],
        "overall_narrative": f"Joining the conversation around {trend.topic}",
    }

    agent = CreativeAgent(bus, campaign_id)
    await agent.run(
        strategy_output=strategy,
        brand_name=brand.name,
        brand_dna=dna,
        campaign_id=campaign_id,
    )

    # Auto-move to content review
    db2 = SessionLocal()
    try:
        camp = db2.query(Campaign).filter(Campaign.id == campaign_id).first()
        if camp:
            camp.status = "awaiting_content_review"
            db2.commit()
    finally:
        db2.close()

    await bus.emit(AgentEvent(
        event_type=AgentEventType.HUMAN_REVIEW_REQUIRED,
        campaign_id=campaign_id,
        message="Trend hijack post ready for review!",
        data={"review_type": "content", "campaign_id": campaign_id},
    ))
