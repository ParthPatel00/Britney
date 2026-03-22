from sqlalchemy import Column, String, Text, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base
import uuid


def utcnow():
    return datetime.now(timezone.utc)


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    brand_id = Column(String, ForeignKey("brands.id"), nullable=False)
    goal = Column(Text)
    platforms_json = Column(Text)  # JSON array
    num_posts = Column(Integer, default=5)
    date_range_start = Column(DateTime)
    date_range_end = Column(DateTime)
    status = Column(String, default="created")
    # created | running | awaiting_strategy_review | awaiting_content_review | completed | failed
    pipeline_state_json = Column(Text)  # serialized pipeline state for recovery
    is_auto_pilot = Column(String, default="false")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    brand = relationship("Brand", back_populates="campaigns")
    posts = relationship("Post", back_populates="campaign", cascade="all, delete-orphan")
    research_output = relationship("ResearchOutput", back_populates="campaign", uselist=False)
    strategy_output = relationship("StrategyOutput", back_populates="campaign", uselist=False)
    events = relationship("PipelineEvent", back_populates="campaign", cascade="all, delete-orphan")


class ResearchOutput(Base):
    __tablename__ = "research_outputs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    trends_json = Column(Text)
    competitor_activity_json = Column(Text)
    news_items_json = Column(Text)
    opportunity_score = Column(Float)
    recommended_angle = Column(Text)
    raw_response = Column(Text)
    created_at = Column(DateTime, default=utcnow)

    campaign = relationship("Campaign", back_populates="research_output")


class StrategyOutput(Base):
    __tablename__ = "strategy_outputs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    overall_narrative = Column(Text)
    post_briefs_json = Column(Text)
    posting_schedule_json = Column(Text)
    approved_at = Column(DateTime)
    approved_modifications = Column(Text)
    created_at = Column(DateTime, default=utcnow)

    campaign = relationship("Campaign", back_populates="strategy_output")


class PipelineEvent(Base):
    __tablename__ = "pipeline_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    event_type = Column(String, nullable=False)
    agent_name = Column(String)
    message = Column(Text)
    data_json = Column(Text)
    created_at = Column(DateTime, default=utcnow)

    campaign = relationship("Campaign", back_populates="events")
