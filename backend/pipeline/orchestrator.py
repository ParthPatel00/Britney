import asyncio
import json
from database import SessionLocal
from models.campaign import Campaign
from models.brand import Brand
from schemas.agent import AgentEvent, AgentEventType
from pipeline.event_bus import EventBus
import logging

logger = logging.getLogger(__name__)


def _get_campaign(campaign_id: str) -> tuple[Campaign, Brand] | None:
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return None
        brand = db.query(Brand).filter(Brand.id == campaign.brand_id).first()
        return campaign, brand
    finally:
        db.close()


def _set_status(campaign_id: str, status: str):
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.status = status
            db.commit()
    finally:
        db.close()


def _get_status(campaign_id: str) -> str:
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        return campaign.status if campaign else "unknown"
    finally:
        db.close()


async def _wait_for_approval(campaign_id: str, expected_status: str, timeout_seconds: int = 600):
    """Poll DB until status changes from awaiting_xxx_review to something else."""
    elapsed = 0
    while elapsed < timeout_seconds:
        status = _get_status(campaign_id)
        if status != expected_status:
            return status
        await asyncio.sleep(2)
        elapsed += 2
    raise TimeoutError(f"Approval timed out for campaign {campaign_id}")


async def run_pipeline(campaign_id: str):
    """Main pipeline orchestrator. Runs as a background task."""
    bus = EventBus(campaign_id)

    result = _get_campaign(campaign_id)
    if not result:
        return
    campaign, brand = result

    platforms: list[str] = json.loads(campaign.platforms_json or "[]")
    dna: dict = json.loads(brand.dna_json or "{}") if brand.dna_json else {}

    async def emit(event_type: AgentEventType, agent: str = "", msg: str = "", data: dict = None, progress: int = 0):
        await bus.emit(AgentEvent(
            event_type=event_type,
            agent_name=agent,
            campaign_id=campaign_id,
            message=msg,
            data=data or {},
            progress=progress,
        ))

    try:
        _set_status(campaign_id, "running")

        # ── PHASE 1: Research ──────────────────────────────────────────────
        await emit(AgentEventType.AGENT_START, "research", "Starting research...")
        from agents.research_agent import ResearchAgent
        research_output = await ResearchAgent(bus, campaign_id).run(
            niche=brand.niche or "general",
            brand_description=brand.description or "",
            brand_name=brand.name,
        )
        await emit(AgentEventType.AGENT_COMPLETE, "research", "Research complete",
                   {"trends_count": len(research_output.get("trends", []))})

        # ── PHASE 2: Strategy ──────────────────────────────────────────────
        await emit(AgentEventType.AGENT_START, "strategy", "Building content strategy...")
        from agents.strategy_agent import StrategyAgent
        strategy_output = await StrategyAgent(bus, campaign_id).run(
            research_output=research_output,
            brand_name=brand.name,
            brand_dna=dna,
            brand_description=brand.description or "",
            goal=campaign.goal or "",
            platforms=platforms,
            num_posts=campaign.num_posts,
        )
        await emit(AgentEventType.AGENT_COMPLETE, "strategy", "Strategy ready",
                   {"post_count": len(strategy_output.get("post_briefs", []))})

        # ── GATE 1: Strategy Review ────────────────────────────────────────
        _set_status(campaign_id, "awaiting_strategy_review")
        await emit(AgentEventType.HUMAN_REVIEW_REQUIRED, "", "Review your content strategy",
                   {"review_type": "strategy", "campaign_id": campaign_id})

        final_status = await _wait_for_approval(campaign_id, "awaiting_strategy_review")
        if final_status == "failed":
            raise RuntimeError("Campaign cancelled during strategy review")

        # ── PHASE 3: Creative Generation ───────────────────────────────────
        _set_status(campaign_id, "running")
        await emit(AgentEventType.AGENT_START, "creative", "Generating content...")
        from agents.creative_agent import CreativeAgent
        await CreativeAgent(bus, campaign_id).run(
            strategy_output=strategy_output,
            brand_name=brand.name,
            brand_dna=dna,
            campaign_id=campaign_id,
        )
        await emit(AgentEventType.AGENT_COMPLETE, "creative", "Content generated")

        # ── GATE 2: Content Review ─────────────────────────────────────────
        _set_status(campaign_id, "awaiting_content_review")
        await emit(AgentEventType.HUMAN_REVIEW_REQUIRED, "", "Review and approve your posts",
                   {"review_type": "content", "campaign_id": campaign_id})

        final_status = await _wait_for_approval(campaign_id, "awaiting_content_review")
        if final_status == "failed":
            raise RuntimeError("Campaign cancelled during content review")

        # ── PHASE 4: Publishing ────────────────────────────────────────────
        _set_status(campaign_id, "running")
        await emit(AgentEventType.AGENT_START, "publishing", "Publishing to social media...")
        from agents.publishing_agent import PublishingAgent
        await PublishingAgent(bus, campaign_id).run(campaign_id=campaign_id)
        await emit(AgentEventType.AGENT_COMPLETE, "publishing", "Published successfully!")

        _set_status(campaign_id, "completed")
        await emit(AgentEventType.PIPELINE_COMPLETE, "", "Campaign complete!")

    except Exception as e:
        logger.exception(f"Pipeline failed for {campaign_id}: {e}")
        _set_status(campaign_id, "failed")
        await emit(AgentEventType.AGENT_ERROR, "", f"Pipeline error: {str(e)}", {"error": str(e)})
    finally:
        await asyncio.sleep(1)
        await EventBus.close(campaign_id)
