from sqlalchemy import Column, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base
import uuid


def utcnow():
    return datetime.now(timezone.utc)


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    brief_id = Column(String)
    platform = Column(String)  # instagram | twitter | linkedin | tiktok | youtube | facebook
    status = Column(String, default="pending_review")
    # pending_review | approved | rejected | published | scheduled
    selected_variant_id = Column(String)
    scheduled_at = Column(DateTime)
    published_at = Column(DateTime)
    publish_results_json = Column(Text)  # {platform: {post_id, url, status}}
    created_at = Column(DateTime, default=utcnow)

    campaign = relationship("Campaign", back_populates="posts")
    variants = relationship("PostVariant", back_populates="post", cascade="all, delete-orphan")
    publish_jobs = relationship("PublishJob", back_populates="post", cascade="all, delete-orphan")


class PostVariant(Base):
    __tablename__ = "post_variants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id"), nullable=False)
    label = Column(String)  # A or B
    caption = Column(Text)
    platform_captions_json = Column(Text)  # {twitter: "...", instagram: "...", linkedin: "..."}
    media_assets_json = Column(Text)  # [{asset_id, type, file_path, url, generation_prompt}]
    image_generation_prompt = Column(Text)
    refinement_history_json = Column(Text)  # [{user_msg, ai_response, timestamp}]
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    post = relationship("Post", back_populates="variants")


class Trend(Base):
    __tablename__ = "trends"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    brand_id = Column(String, ForeignKey("brands.id"), nullable=False)
    topic = Column(String, nullable=False)
    score = Column(Float, default=0.5)  # 0-1 relevance score
    category = Column(String)  # tech | culture | entertainment | business | lifestyle
    summary = Column(Text)
    source_urls_json = Column(Text)  # JSON array
    hijack_content_idea = Column(Text)  # Gemini-generated idea for how to use this trend
    fetched_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime)

    brand = relationship("Brand", back_populates="trends")


class PublishJob(Base):
    __tablename__ = "publish_jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id"), nullable=False)
    platform = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | published | failed
    scheduled_at = Column(DateTime)
    published_at = Column(DateTime)
    platform_post_id = Column(String)
    platform_url = Column(String)
    error_message = Column(Text)
    created_at = Column(DateTime, default=utcnow)

    post = relationship("Post", back_populates="publish_jobs")
