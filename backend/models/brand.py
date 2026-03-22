from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base
import uuid


def utcnow():
    return datetime.now(timezone.utc)


class Brand(Base):
    __tablename__ = "brands"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text)
    niche = Column(String)
    website_url = Column(String)
    dna_json = Column(Text)  # JSON: {colors, fonts, voice_tone, visual_style, keywords, personality}
    autopilot_json = Column(Text)  # JSON: {enabled, frequency, email, timezone}
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    assets = relationship("BrandAsset", back_populates="brand", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="brand", cascade="all, delete-orphan")
    trends = relationship("Trend", back_populates="brand", cascade="all, delete-orphan")


class BrandAsset(Base):
    __tablename__ = "brand_assets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    brand_id = Column(String, ForeignKey("brands.id"), nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String)  # image | document | video | url
    original_filename = Column(String)
    url = Column(String)  # for URL-type assets
    analysis_json = Column(Text)  # Claude's analysis of this specific asset
    created_at = Column(DateTime, default=utcnow)

    brand = relationship("Brand", back_populates="assets")
