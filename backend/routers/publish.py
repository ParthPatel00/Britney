"""Publish routes: publish now, schedule, status."""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.content import Post, PostVariant, PublishJob
from schemas.content import PublishRequest
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/publish", tags=["publish"])


@router.post("/now")
async def publish_now(req: PublishRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Immediately publish selected posts."""
    job_ids = []
    for post_id in req.post_ids:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            continue
        post.status = "approved"
        for platform in req.platforms:
            job = PublishJob(
                id=str(uuid.uuid4()),
                post_id=post_id,
                platform=platform,
                status="pending",
            )
            db.add(job)
            job_ids.append(job.id)
    db.commit()

    background_tasks.add_task(_publish_posts, req.post_ids, req.platforms)
    return {"job_ids": job_ids, "status": "publishing"}


@router.post("/schedule")
async def schedule_post(req: PublishRequest, db: Session = Depends(get_db)):
    """Schedule posts for future publishing."""
    if not req.scheduled_at:
        raise HTTPException(400, "scheduled_at is required")

    job_ids = []
    for post_id in req.post_ids:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            continue
        post.status = "scheduled"
        post.scheduled_at = req.scheduled_at
        for platform in req.platforms:
            job = PublishJob(
                id=str(uuid.uuid4()),
                post_id=post_id,
                platform=platform,
                status="pending",
                scheduled_at=req.scheduled_at,
            )
            db.add(job)
            job_ids.append(job.id)
    db.commit()
    return {"job_ids": job_ids, "scheduled_at": req.scheduled_at.isoformat()}


@router.get("/{job_id}/status")
async def get_publish_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(PublishJob).filter(PublishJob.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "id": job.id,
        "platform": job.platform,
        "status": job.status,
        "platform_url": job.platform_url,
        "error_message": job.error_message,
    }


async def _publish_posts(post_ids: list[str], platforms: list[str]):
    """Background task to publish posts."""
    from database import SessionLocal
    from models.content import Post, PostVariant, PublishJob
    from services import zernio, bluesky
    import json

    db = SessionLocal()
    try:
        for post_id in post_ids:
            post = db.query(Post).filter(Post.id == post_id).first()
            if not post:
                continue

            variant_id = post.selected_variant_id
            if variant_id:
                variant = db.query(PostVariant).filter(PostVariant.id == variant_id).first()
            else:
                variant = db.query(PostVariant).filter(
                    PostVariant.post_id == post.id,
                    PostVariant.label == "A",
                ).first()

            if not variant:
                continue

            platform_captions = json.loads(variant.platform_captions_json or "{}")
            media_assets = json.loads(variant.media_assets_json or "[]")
            image_paths = [a["file_path"] for a in media_assets if a.get("type") == "image"]

            for platform in platforms:
                caption = platform_captions.get(platform, variant.caption)

                # Try Zernio
                result = await zernio.publish_post(
                    caption=caption,
                    platforms=[platform],
                    media_paths=image_paths[:1],
                )

                if not result["success"] and platform == "bluesky":
                    result = await bluesky.publish_post(
                        caption=caption[:300],
                        image_path=image_paths[0] if image_paths else None,
                    )

                # Update job
                jobs = db.query(PublishJob).filter(
                    PublishJob.post_id == post_id,
                    PublishJob.platform == platform,
                    PublishJob.status == "pending",
                ).all()

                for job in jobs:
                    job.status = "published" if result.get("success") else "failed"
                    job.platform_url = (
                        result.get("results", {}).get("postUrl")
                        or result.get("url")
                    )
                    job.error_message = result.get("error")

            post.status = "published"
            db.commit()
    except Exception as e:
        logger.error(f"Publish background task failed: {e}")
        db.rollback()
    finally:
        db.close()
