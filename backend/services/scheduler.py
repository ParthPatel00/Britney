"""APScheduler for auto-pilot mode."""
import json
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from schemas.brand import AutoPilotConfig

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

FREQUENCY_CRONS = {
    "1x_day": [CronTrigger(hour=9, minute=0)],
    "2x_day": [CronTrigger(hour=9, minute=0), CronTrigger(hour=17, minute=0)],
    "3x_day": [CronTrigger(hour=9, minute=0), CronTrigger(hour=13, minute=0), CronTrigger(hour=18, minute=0)],
}


def start_scheduler():
    """Start the APScheduler on app startup."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")
        _load_all_schedules()


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()


def update_brand_schedule(brand_id: str, config: AutoPilotConfig):
    """Update or remove schedule jobs for a brand."""
    # Remove existing jobs for this brand
    for job in scheduler.get_jobs():
        if job.id.startswith(f"autopilot_{brand_id}"):
            scheduler.remove_job(job.id)

    if not config.enabled or not config.email:
        return

    triggers = FREQUENCY_CRONS.get(config.frequency, FREQUENCY_CRONS["2x_day"])
    for i, trigger in enumerate(triggers):
        scheduler.add_job(
            _run_autopilot,
            trigger=trigger,
            id=f"autopilot_{brand_id}_{i}",
            args=[brand_id, config.email],
            replace_existing=True,
        )
    logger.info(f"Scheduled {len(triggers)} jobs for brand {brand_id}")


def _load_all_schedules():
    """Load all active autopilot schedules from DB on startup."""
    from database import SessionLocal
    from models.brand import Brand

    db = SessionLocal()
    try:
        brands = db.query(Brand).filter(Brand.autopilot_json.isnot(None)).all()
        for brand in brands:
            try:
                config_dict = json.loads(brand.autopilot_json or "{}")
                config = AutoPilotConfig(**config_dict)
                if config.enabled:
                    update_brand_schedule(brand.id, config)
            except Exception:
                pass
    finally:
        db.close()


async def _run_autopilot(brand_id: str, email: str):
    """Run the full pipeline automatically and email results."""
    import uuid
    from database import SessionLocal
    from models.brand import Brand
    from models.campaign import Campaign
    from pipeline.orchestrator import run_pipeline

    logger.info(f"Auto-pilot running for brand {brand_id}")
    db = SessionLocal()
    try:
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            return

        campaign = Campaign(
            id=str(uuid.uuid4()),
            brand_id=brand_id,
            goal="Auto-pilot: Generate engaging weekly content",
            platforms_json=json.dumps(["instagram", "twitter", "linkedin", "facebook"]),
            num_posts=3,
            status="created",
            is_auto_pilot="true",
        )
        db.add(campaign)
        db.commit()
        campaign_id = campaign.id
    finally:
        db.close()

    # Run pipeline (auto-approve strategy, send email for content)
    await _run_headless_pipeline(campaign_id, email)


async def _run_headless_pipeline(campaign_id: str, email: str):
    """Run pipeline with auto-approval and email digest at the end."""
    from database import SessionLocal
    from models.campaign import Campaign, ResearchOutput
    from models.brand import Brand
    from models.content import Post
    from pipeline.event_bus import EventBus
    from agents.research_agent import ResearchAgent
    from agents.strategy_agent import StrategyAgent
    from agents.creative_agent import CreativeAgent
    from schemas.agent import AgentEvent, AgentEventType
    import json
    import asyncio

    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        brand = db.query(Brand).filter(Brand.id == campaign.brand_id).first()
        platforms = json.loads(campaign.platforms_json or "[]")
        dna = json.loads(brand.dna_json or "{}")
    finally:
        db.close()

    bus = EventBus(campaign_id)

    try:
        # Research
        research_output = await ResearchAgent(bus, campaign_id).run(
            niche=brand.niche or "general",
            brand_description=brand.description or "",
            brand_name=brand.name,
        )

        # Strategy (auto-approve)
        strategy_output = await StrategyAgent(bus, campaign_id).run(
            research_output=research_output,
            brand_name=brand.name,
            brand_dna=dna,
            brand_description=brand.description or "",
            goal=campaign.goal or "",
            platforms=platforms,
            num_posts=campaign.num_posts,
        )

        # Creative
        await CreativeAgent(bus, campaign_id).run(
            strategy_output=strategy_output,
            brand_name=brand.name,
            brand_dna=dna,
            campaign_id=campaign_id,
        )

        # Update status
        db2 = SessionLocal()
        try:
            camp = db2.query(Campaign).filter(Campaign.id == campaign_id).first()
            if camp:
                camp.status = "awaiting_content_review"
                db2.commit()
        finally:
            db2.close()

        # Send email digest
        from services.email_service import send_campaign_digest
        await send_campaign_digest(campaign_id, email)

    except Exception as e:
        logger.error(f"Headless pipeline failed: {e}")
