"""Campaign routes: create, start, approve gates."""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.campaign import Campaign, StrategyOutput, ResearchOutput
from models.content import Post
from schemas.campaign import CampaignCreateRequest, ApproveStrategyRequest, ApproveContentRequest
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/campaign", tags=["campaign"])


@router.post("")
async def create_campaign(req: CampaignCreateRequest, db: Session = Depends(get_db)):
    campaign = Campaign(
        id=str(uuid.uuid4()),
        brand_id=req.brand_id,
        goal=req.goal,
        platforms_json=json.dumps(req.platforms),
        num_posts=req.num_posts,
        status="created",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return {
        "id": campaign.id,
        "brand_id": campaign.brand_id,
        "goal": campaign.goal,
        "status": campaign.status,
        "platforms": req.platforms,
        "num_posts": campaign.num_posts,
        "created_at": campaign.created_at.isoformat(),
        "updated_at": campaign.created_at.isoformat(),
    }


@router.post("/{campaign_id}/start")
async def start_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    if campaign.status not in ("created", "failed"):
        raise HTTPException(400, f"Campaign already {campaign.status}")

    campaign.status = "running"
    db.commit()

    from pipeline.orchestrator import run_pipeline
    background_tasks.add_task(run_pipeline, campaign_id)
    return {"started": True, "campaign_id": campaign_id}


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    platforms = json.loads(campaign.platforms_json or "[]")
    posts = db.query(Post).filter(Post.campaign_id == campaign_id).all()

    research = db.query(ResearchOutput).filter(ResearchOutput.campaign_id == campaign_id).first()
    strategy = db.query(StrategyOutput).filter(StrategyOutput.campaign_id == campaign_id).first()

    return {
        "id": campaign.id,
        "brand_id": campaign.brand_id,
        "goal": campaign.goal,
        "platforms": platforms,
        "num_posts": campaign.num_posts,
        "status": campaign.status,
        "post_count": len(posts),
        "has_research": research is not None,
        "has_strategy": strategy is not None,
        "research": {
            "opportunity_score": research.opportunity_score,
            "recommended_angle": research.recommended_angle,
            "trends": json.loads(research.trends_json or "[]"),
        } if research else None,
        "strategy": {
            "overall_narrative": strategy.overall_narrative,
            "post_briefs": json.loads(strategy.post_briefs_json or "[]"),
        } if strategy else None,
        "created_at": campaign.created_at.isoformat(),
        "updated_at": campaign.created_at.isoformat(),
    }


@router.get("")
async def list_campaigns(brand_id: str = None, db: Session = Depends(get_db)):
    q = db.query(Campaign)
    if brand_id:
        q = q.filter(Campaign.brand_id == brand_id)
    campaigns = q.order_by(Campaign.created_at.desc()).limit(20).all()
    return [
        {
            "id": c.id,
            "brand_id": c.brand_id,
            "goal": c.goal,
            "status": c.status,
            "platforms": json.loads(c.platforms_json or "[]"),
            "num_posts": c.num_posts,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.created_at.isoformat(),
        }
        for c in campaigns
    ]


@router.post("/{campaign_id}/approve-strategy")
async def approve_strategy(
    campaign_id: str,
    req: ApproveStrategyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    if campaign.status != "awaiting_strategy_review":
        raise HTTPException(400, f"Campaign not awaiting strategy review (status: {campaign.status})")

    if req.modifications:
        # Re-run strategy with modifications
        strategy = db.query(StrategyOutput).filter(StrategyOutput.campaign_id == campaign_id).first()
        if strategy:
            strategy.approved_modifications = req.modifications
            db.commit()
        background_tasks.add_task(_rerun_strategy_with_mods, campaign_id, req.modifications)
    else:
        # Mark approved and let orchestrator continue
        campaign.status = "strategy_approved"
        db.commit()

    return {"approved": True, "modifications": req.modifications}


@router.post("/{campaign_id}/approve-content")
async def approve_content(
    campaign_id: str,
    req: ApproveContentRequest,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    # Update post statuses
    for post_id in req.approved_post_ids:
        post = db.query(Post).filter(Post.id == post_id, Post.campaign_id == campaign_id).first()
        if post:
            post.status = "approved"

    for post_id in req.rejected_post_ids:
        post = db.query(Post).filter(Post.id == post_id, Post.campaign_id == campaign_id).first()
        if post:
            post.status = "rejected"

    campaign.status = "content_approved"
    db.commit()
    return {"approved": True, "approved_count": len(req.approved_post_ids)}


async def _rerun_strategy_with_mods(campaign_id: str, modifications: str):
    """Re-run strategy agent with user modifications."""
    from database import SessionLocal
    from models.campaign import Campaign, StrategyOutput
    from models.brand import Brand
    from pipeline.event_bus import EventBus
    from agents.strategy_agent import StrategyAgent
    from schemas.agent import AgentEvent, AgentEventType
    import json

    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        brand = db.query(Brand).filter(Brand.id == campaign.brand_id).first()
        research_out = db.query(ResearchOutput).filter(ResearchOutput.campaign_id == campaign_id).first()

        if not all([campaign, brand, research_out]):
            return

        dna = json.loads(brand.dna_json or "{}")
        platforms = json.loads(campaign.platforms_json or "[]")
        research_data = {
            "trends": json.loads(research_out.trends_json or "[]"),
            "competitor_insights": json.loads(research_out.competitor_activity_json or "[]"),
            "news_opportunities": json.loads(research_out.news_items_json or "[]"),
            "opportunity_score": research_out.opportunity_score or 0.7,
            "recommended_angle": (research_out.recommended_angle or "") + f"\n\nUSER MODIFICATIONS: {modifications}",
        }
    finally:
        db.close()

    bus = EventBus(campaign_id)
    await bus.emit(AgentEvent(
        event_type=AgentEventType.AGENT_START,
        agent_name="strategy",
        campaign_id=campaign_id,
        message="Revising strategy with your feedback...",
    ))

    agent = StrategyAgent(bus, campaign_id)
    await agent.run(
        research_output=research_data,
        brand_name=brand.name,
        brand_dna=dna,
        brand_description=brand.description or "",
        goal=campaign.goal or "",
        platforms=platforms,
        num_posts=campaign.num_posts,
    )

    db2 = SessionLocal()
    try:
        camp = db2.query(Campaign).filter(Campaign.id == campaign_id).first()
        if camp:
            camp.status = "strategy_approved"
            db2.commit()
    finally:
        db2.close()

    await bus.emit(AgentEvent(
        event_type=AgentEventType.AGENT_COMPLETE,
        agent_name="strategy",
        campaign_id=campaign_id,
        message="Strategy revised! Proceeding to content generation...",
    ))
