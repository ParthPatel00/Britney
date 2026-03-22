"""Content routes: get posts, refine with AI, select variants."""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.content import Post, PostVariant
from schemas.content import RefineRequest, SelectVariantRequest
from services import gemini, replicate_flux
from config import get_settings
from pathlib import Path
import uuid

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/api/content", tags=["content"])


@router.get("/campaign/{campaign_id}")
async def get_campaign_posts(campaign_id: str, db: Session = Depends(get_db)):
    posts = db.query(Post).filter(Post.campaign_id == campaign_id).all()
    return [_serialize_post(post, db) for post in posts]


@router.get("/{post_id}")
async def get_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    return _serialize_post(post, db)


@router.post("/{post_id}/select-variant")
async def select_variant(post_id: str, req: SelectVariantRequest, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    variant = db.query(PostVariant).filter(PostVariant.id == req.variant_id, PostVariant.post_id == post_id).first()
    if not variant:
        raise HTTPException(404, "Variant not found")
    post.selected_variant_id = req.variant_id
    db.commit()
    db.refresh(post)
    return _serialize_post(post, db)


@router.post("/{post_id}/approve")
async def approve_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    post.status = "approved"
    db.commit()
    db.refresh(post)
    return _serialize_post(post, db)


@router.post("/{post_id}/reject")
async def reject_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    post.status = "rejected"
    db.commit()
    db.refresh(post)
    return _serialize_post(post, db)


@router.post("/{post_id}/refine")
async def refine_post(post_id: str, req: RefineRequest, db: Session = Depends(get_db)):
    """Stream AI refinement of a post variant."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")

    variant = db.query(PostVariant).filter(
        PostVariant.id == req.variant_id,
        PostVariant.post_id == post_id,
    ).first()
    if not variant:
        raise HTTPException(404, "Variant not found")

    # Get brand DNA
    from models.campaign import Campaign
    from models.brand import Brand
    campaign = db.query(Campaign).filter(Campaign.id == post.campaign_id).first()
    brand = db.query(Brand).filter(Brand.id == campaign.brand_id).first() if campaign else None
    dna = json.loads(brand.dna_json or "{}") if brand else {}

    async def generate():
        yield _sse("analyzing", "state")

        # Ask Gemini what needs changing
        plan_prompt = f"""
A user wants to refine this social media post.

Current caption: {variant.caption[:500]}
Current image prompt: {(variant.image_generation_prompt or 'Not available')[:300]}
User request: {req.message}
Brand DNA: {json.dumps(dna)[:500]}
Platform: {post.platform}

Determine what changes are needed and return JSON:
{{
  "needs_new_image": true/false,
  "needs_new_caption": true/false,
  "new_caption": "revised caption text",
  "new_image_prompt": "new detailed image generation prompt for FLUX",
  "explanation": "brief explanation of changes"
}}

Be specific. If user says 'make it bolder', needs_new_image=true and needs_new_caption=true.
If user says 'fix typo', only needs_new_caption=true.
"""
        try:
            plan = await gemini.generate_json(plan_prompt)
        except Exception:
            plan = {"needs_new_image": False, "needs_new_caption": True, "new_caption": variant.caption}

        new_image_path = None
        new_caption = variant.caption

        if plan.get("needs_new_caption") and plan.get("new_caption"):
            new_caption = plan["new_caption"]
            yield _sse("caption", "state")

        if plan.get("needs_new_image") and plan.get("new_image_prompt"):
            yield _sse("image", "state")
            new_image_path = await replicate_flux.generate_image(
                plan["new_image_prompt"],
                filename_prefix=f"refined_{post.platform}"
            )

        # Save changes
        history = json.loads(variant.refinement_history_json or "[]")
        history.append({
            "user_message": req.message,
            "ai_response": plan.get("explanation", ""),
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        })

        from database import SessionLocal
        db2 = SessionLocal()
        try:
            v = db2.query(PostVariant).filter(PostVariant.id == variant.id).first()
            p = db2.query(Post).filter(Post.id == post_id).first()
            if v and p:
                v.caption = new_caption
                v.refinement_history_json = json.dumps(history)

                if new_image_path:
                    assets = json.loads(v.media_assets_json or "[]")
                    for asset in assets:
                        if asset.get("type") == "image":
                            asset["file_path"] = new_image_path
                            asset["url"] = f"/api/media/{new_image_path.split('/')[-1]}"
                            asset["generation_prompt"] = plan.get("new_image_prompt", "")
                    v.media_assets_json = json.dumps(assets)
                    v.image_generation_prompt = plan.get("new_image_prompt", v.image_generation_prompt)

                db2.commit()
                db2.refresh(p)

                # Send explanation as text, then updated post
                explanation = plan.get("explanation", "Post updated successfully!")
                yield _sse(explanation, "text")
                updated_post = _serialize_post(p, db2)
                yield _sse(json.dumps({"post": updated_post}), "post_update")
        finally:
            db2.close()

    return StreamingResponse(generate(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })


@router.get("/media/{filename}")
async def serve_media(filename: str):
    """Serve generated media files."""
    # Check both generated and uploads dirs
    for directory in [settings.generated_dir, settings.uploads_dir]:
        path = directory / filename
        if path.exists():
            suffix = path.suffix.lower()
            media_type = (
                "image/webp" if suffix == ".webp"
                else "image/jpeg" if suffix in (".jpg", ".jpeg")
                else "image/png" if suffix == ".png"
                else "audio/mpeg" if suffix == ".mp3"
                else "video/mp4" if suffix == ".mp4"
                else "application/octet-stream"
            )
            return FileResponse(str(path), media_type=media_type)
    raise HTTPException(404, "Media not found")


def _sse(content: str, event_type: str = "text") -> bytes:
    return f"data: {json.dumps({'type': event_type, 'content': content})}\n\n".encode()


def _serialize_post(post: Post, db: Session) -> dict:
    variants = db.query(PostVariant).filter(PostVariant.post_id == post.id).all()
    selected_id = post.selected_variant_id or (variants[0].id if variants else None)
    return {
        "id": post.id,
        "campaign_id": post.campaign_id,
        "platform": post.platform,
        "status": post.status,
        "selected_variant_id": selected_id,
        "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
        "published_url": None,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.created_at.isoformat(),
        "variants": [_serialize_variant(v, v.id == selected_id) for v in variants],
    }


def _serialize_variant(v: PostVariant, selected: bool = False) -> dict:
    assets = json.loads(v.media_assets_json or "[]")
    # Find first image asset and map to MediaAsset shape
    media = None
    for asset in assets:
        if asset.get("type") in ("image", "video"):
            filename = asset.get("file_path", "").split("/")[-1]
            media = {
                "id": v.id,
                "filename": filename,
                "url": asset.get("url", f"/api/media/{filename}"),
                "type": asset.get("type", "image"),
            }
            break
    return {
        "id": v.id,
        "label": v.label,
        "caption": v.caption,
        "media": media,
        "selected": selected,
    }
