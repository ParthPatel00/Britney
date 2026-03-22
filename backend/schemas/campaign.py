from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CampaignCreateRequest(BaseModel):
    brand_id: str
    goal: str
    platforms: list[str] = ["instagram", "twitter", "linkedin", "facebook"]
    num_posts: int = 5


class CampaignResponse(BaseModel):
    id: str
    brand_id: str
    goal: Optional[str]
    platforms: list[str] = []
    num_posts: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ApproveStrategyRequest(BaseModel):
    modifications: Optional[str] = None


class ApproveContentRequest(BaseModel):
    approved_post_ids: list[str]
    rejected_post_ids: list[str] = []


class PostBrief(BaseModel):
    brief_id: str
    platform: str
    content_type: str = "image"  # image | video | carousel
    caption_direction: str
    visual_direction: str
    hashtags: list[str] = []
    best_post_time: str = ""
    tone: str = "professional"
    trend_reference: Optional[str] = None


class StrategyOutputSchema(BaseModel):
    strategy_id: str
    overall_narrative: str
    post_briefs: list[PostBrief]
    posting_schedule: dict = {}


class TrendItem(BaseModel):
    id: str
    topic: str
    score: float = 0.5
    category: str = "general"
    summary: str
    source_urls: list[str] = []
    hijack_idea: str = ""
