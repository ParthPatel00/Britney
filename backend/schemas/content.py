from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MediaAsset(BaseModel):
    asset_id: str
    type: str  # image | video | audio
    file_path: str
    url: str = ""
    generation_prompt: str = ""


class PostVariantSchema(BaseModel):
    id: str
    label: str
    caption: str
    platform_captions: dict = {}
    media_assets: list[MediaAsset] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class PostResponse(BaseModel):
    id: str
    campaign_id: str
    platform: str
    status: str
    selected_variant_id: Optional[str]
    variants: list[PostVariantSchema] = []
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    publish_results: dict = {}
    created_at: datetime

    model_config = {"from_attributes": True}


class RefineRequest(BaseModel):
    message: str
    variant_id: str


class SelectVariantRequest(BaseModel):
    variant_id: str


class PublishRequest(BaseModel):
    post_ids: list[str]
    platforms: list[str]
    scheduled_at: Optional[datetime] = None


class PublishJobResponse(BaseModel):
    id: str
    post_id: str
    platform: str
    status: str
    platform_url: Optional[str]
    error_message: Optional[str]

    model_config = {"from_attributes": True}
