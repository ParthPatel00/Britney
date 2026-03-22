from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BrandDNA(BaseModel):
    colors: list[str] = []
    fonts: list[str] = []
    voice_tone: str = ""
    visual_style: str = ""
    keywords: list[str] = []
    personality: str = ""
    target_audience: str = ""
    unique_value_prop: str = ""


class BrandSetupRequest(BaseModel):
    name: str
    description: str
    niche: str
    text_context: Optional[str] = None
    website_url: Optional[str] = None


class AutoPilotConfig(BaseModel):
    enabled: bool = False
    frequency: str = "2x_day"  # 1x_day | 2x_day | 3x_day
    email: str = ""
    timezone: str = "America/Los_Angeles"


class BrandResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    niche: Optional[str]
    website_url: Optional[str]
    dna: Optional[BrandDNA]
    autopilot: Optional[AutoPilotConfig]
    created_at: datetime

    model_config = {"from_attributes": True}
