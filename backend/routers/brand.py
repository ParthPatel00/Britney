"""Brand routes: setup, DNA extraction, autopilot config."""
import json
import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
from models.brand import Brand, BrandAsset
from schemas.brand import BrandResponse, BrandDNA, AutoPilotConfig
from services import gemini
from storage.file_manager import (
    save_upload, read_image_as_base64, extract_text_from_pdf,
    extract_text_from_docx, scrape_url,
)
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/brand", tags=["brand"])


@router.post("")
async def setup_brand(
    name: str = Form(""),
    description: str = Form(""),
    niche: str = Form(""),
    text_context: str = Form(""),
    website_url: str = Form(""),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    """Create a brand and extract Brand DNA from all provided context."""
    context_parts = []
    image_base64s = []

    # Text context
    if text_context.strip():
        context_parts.append(f"BRAND DESCRIPTION:\n{text_context}")

    # Website URL scraping
    if website_url.strip():
        scraped = await scrape_url(website_url)
        if scraped.get("text"):
            context_parts.append(
                f"WEBSITE CONTENT ({scraped.get('title', website_url)}):\n"
                f"{scraped['text'][:3000]}"
            )

    # If name/description/niche are empty, extract from context using Gemini
    if not name.strip() or not description.strip() or not niche.strip():
        context_text = "\n\n".join(context_parts) if context_parts else text_context
        if context_text.strip():
            extract_prompt = f"""
Analyze the following brand context and extract key brand information.

Context:
{context_text[:4000]}

Return JSON with exactly these fields:
{{
  "name": "Brand name (infer from context or use a generic name if unclear)",
  "description": "1-2 sentence brand description",
  "niche": "Industry or niche (e.g. 'SaaS', 'Fashion', 'Food & Beverage')"
}}

Only return valid JSON, nothing else.
"""
            try:
                extracted = await gemini.generate_json(extract_prompt)
                if not name.strip():
                    name = extracted.get("name", "My Brand")
                if not description.strip():
                    description = extracted.get("description", "")
                if not niche.strip():
                    niche = extracted.get("niche", "General")
            except Exception as e:
                logger.error(f"Brand info extraction failed: {e}")
                if not name.strip():
                    name = "My Brand"
                if not niche.strip():
                    niche = "General"
        else:
            if not name.strip():
                name = "My Brand"
            if not niche.strip():
                niche = "General"

    temp_id = str(uuid.uuid4())
    brand = Brand(
        id=temp_id,
        name=name,
        description=description,
        niche=niche,
        website_url=website_url,
    )
    db.add(brand)
    db.flush()

    # Uploaded files
    for f in files:
        if not f.filename:
            continue
        file_path, file_type = await save_upload(f, prefix=f"brand_{brand.id}")
        asset = BrandAsset(
            brand_id=brand.id,
            file_path=file_path,
            file_type=file_type,
            original_filename=f.filename,
        )

        if file_type == "image":
            b64 = read_image_as_base64(file_path)
            if b64:
                image_base64s.append(b64)
            asset.analysis_json = json.dumps({"type": "image", "processed": True})
        elif file_type == "document":
            if f.filename.endswith(".pdf"):
                text = extract_text_from_pdf(file_path)
            else:
                text = extract_text_from_docx(file_path)
            if text:
                context_parts.append(f"DOCUMENT ({f.filename}):\n{text[:3000]}")
            asset.analysis_json = json.dumps({"type": "document", "text_extracted": True})

        db.add(asset)

    # Extract Brand DNA with Gemini
    dna = await _extract_brand_dna(name, description, niche, context_parts, image_base64s)
    brand.dna_json = json.dumps(dna.model_dump())
    brand.autopilot_json = json.dumps(AutoPilotConfig().model_dump())

    db.commit()
    db.refresh(brand)

    return {
        "id": brand.id,
        "name": brand.name,
        "description": brand.description,
        "niche": brand.niche,
        "website_url": brand.website_url,
        "brand_dna": dna.model_dump(),
        "created_at": brand.created_at.isoformat(),
        "updated_at": brand.created_at.isoformat(),
    }


@router.get("/{brand_id}")
async def get_brand(brand_id: str, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    dna = json.loads(brand.dna_json) if brand.dna_json else {}
    autopilot = json.loads(brand.autopilot_json) if brand.autopilot_json else {}
    return {
        "id": brand.id,
        "name": brand.name,
        "description": brand.description,
        "niche": brand.niche,
        "website_url": brand.website_url,
        "brand_dna": dna,
        "autopilot": autopilot,
        "created_at": brand.created_at.isoformat(),
        "updated_at": brand.created_at.isoformat(),
    }


@router.get("")
async def list_brands(db: Session = Depends(get_db)):
    brands = db.query(Brand).order_by(Brand.created_at.desc()).all()
    result = []
    for brand in brands:
        dna = json.loads(brand.dna_json) if brand.dna_json else {}
        result.append({
            "id": brand.id,
            "name": brand.name,
            "description": brand.description,
            "niche": brand.niche,
            "website_url": brand.website_url,
            "brand_dna": dna,
            "created_at": brand.created_at.isoformat(),
            "updated_at": brand.created_at.isoformat(),
        })
    return result


@router.put("/{brand_id}/autopilot")
async def update_autopilot(brand_id: str, config: AutoPilotConfig, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    brand.autopilot_json = json.dumps(config.model_dump())
    db.commit()

    # Update scheduler
    from services.scheduler import update_brand_schedule
    update_brand_schedule(brand_id, config)

    return {"ok": True, "config": config.model_dump()}


@router.get("/{brand_id}/autopilot")
async def get_autopilot(brand_id: str, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    config = json.loads(brand.autopilot_json) if brand.autopilot_json else {}
    return config


async def _extract_brand_dna(
    name: str, description: str, niche: str,
    context_parts: list[str], image_base64s: list[str]
) -> BrandDNA:
    """Use Gemini to extract structured Brand DNA from all context."""
    context_text = "\n\n".join(context_parts) if context_parts else "No additional context provided."

    prompt = f"""
Analyze this brand and extract its DNA for social media marketing.

Brand Name: {name}
Description: {description}
Industry/Niche: {niche}

Additional Context:
{context_text[:4000]}

Extract the brand DNA and return JSON:
{{
  "colors": ["#hex1", "#hex2", "#hex3"],
  "fonts": ["Font Name 1", "Font Name 2"],
  "voice_tone": "Description of brand voice (e.g., 'friendly, approachable, educational')",
  "visual_style": "Description of visual style (e.g., 'clean, minimalist, nature-inspired')",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "personality": "Brand personality in 1-2 sentences",
  "target_audience": "Primary target audience description",
  "unique_value_prop": "What makes this brand unique"
}}

If colors aren't specified, infer appropriate ones from the industry and brand personality.
Make all fields specific and actionable for content creators.
"""
    try:
        result = await gemini.generate_json(prompt)
        return BrandDNA(**result)
    except Exception as e:
        logger.error(f"Brand DNA extraction failed: {e}")
        # Smart defaults based on niche
        return BrandDNA(
            colors=["#7c3aed", "#a855f7", "#10b981", "#ffffff"],
            fonts=["Plus Jakarta Sans", "Inter"],
            voice_tone="friendly, authentic, and informative",
            visual_style="clean, modern, and approachable",
            keywords=[niche, "innovation", "community", "quality", "trust"],
            personality=f"{name} is a forward-thinking {niche} brand that values authenticity.",
            target_audience="Young professionals and enthusiasts aged 25-40",
            unique_value_prop=f"Making {niche} accessible and enjoyable for everyone.",
        )
