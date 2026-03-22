"""Publishing Agent: Posts approved content via Zernio + Bluesky fallback."""
import json
import logging
from agents.base import BaseAgent
from services import zernio, bluesky
from pipeline.event_bus import EventBus
from database import SessionLocal
from models.content import Post, PostVariant, PublishJob
import uuid

logger = logging.getLogger(__name__)

DEMO_LOGS = [
    "Preparing approved posts for publishing...",
    "Uploading media assets...",
    "Connecting to social media platforms...",
    "Sending to Zernio publishing network...",
    "Verifying publish confirmations...",
]


class PublishingAgent(BaseAgent):
    def __init__(self, bus: EventBus, campaign_id: str):
        super().__init__(bus, campaign_id)

    async def run(self, campaign_id: str):
        import asyncio
        db = SessionLocal()
        try:
            posts = db.query(Post).filter(
                Post.campaign_id == campaign_id,
                Post.status == "approved",
            ).all()

            if not posts:
                await self.log("No approved posts to publish", "publishing")
                return

            await self.log(f"Publishing {len(posts)} approved posts...", "publishing")

            if self.settings.demo_mode:
                for log in DEMO_LOGS[:2]:
                    await self.log(log, "publishing")
                    await asyncio.sleep(0.5)

            for i, post in enumerate(posts):
                await self._publish_post(post)
                pct = int(((i + 1) / len(posts)) * 100)
                await self.progress(pct, f"Published {i + 1}/{len(posts)}", "publishing")

            if self.settings.demo_mode:
                for log in DEMO_LOGS[2:]:
                    await self.log(log, "publishing")
                    await asyncio.sleep(0.4)

            await self.log("All posts published successfully!", "publishing")

        finally:
            db.close()

    async def _publish_post(self, post: Post):
        db = SessionLocal()
        try:
            # Get selected variant (or first A variant)
            variant_id = post.selected_variant_id
            if variant_id:
                variant = db.query(PostVariant).filter(PostVariant.id == variant_id).first()
            else:
                variant = db.query(PostVariant).filter(
                    PostVariant.post_id == post.id,
                    PostVariant.label == "A",
                ).first()

            if not variant:
                logger.error(f"No variant found for post {post.id}")
                return

            # Get platform-specific caption
            platform_captions = json.loads(variant.platform_captions_json or "{}")
            caption = platform_captions.get(post.platform, variant.caption)

            # Get media paths
            media_assets = json.loads(variant.media_assets_json or "[]")
            image_paths = [
                a["file_path"] for a in media_assets
                if a.get("type") == "image" and a.get("file_path")
            ]

            platforms = [post.platform]
            results = {}

            # Try Zernio first
            await self.log(f"Publishing to {post.platform} via Zernio...", "publishing")
            zernio_result = await zernio.publish_post(
                caption=caption,
                platforms=platforms,
                media_paths=image_paths[:1],
            )

            if zernio_result["success"]:
                results[post.platform] = {
                    "status": "published",
                    "url": zernio_result["results"].get("postUrl", ""),
                    "post_id": zernio_result["results"].get("id", ""),
                }
                await self.log(f"Published to {post.platform}!", "publishing")
            else:
                # Fallback to Bluesky
                await self.log(f"Zernio failed, trying Bluesky fallback...", "publishing")
                bsky_result = await bluesky.publish_post(
                    caption=caption[:300],
                    image_path=image_paths[0] if image_paths else None,
                )
                if bsky_result["success"]:
                    results["bluesky"] = {
                        "status": "published",
                        "url": bsky_result["url"],
                        "post_id": bsky_result.get("post_id", ""),
                    }
                    await self.log(f"Published to Bluesky (fallback): {bsky_result['url']}", "publishing")
                else:
                    results[post.platform] = {"status": "failed", "error": zernio_result.get("error")}
                    await self.log(f"Publishing failed for {post.platform}", "publishing")

            # Update DB
            post.status = "published"
            post.publish_results_json = json.dumps(results)

            # Create publish jobs
            for platform, result in results.items():
                job = PublishJob(
                    post_id=post.id,
                    platform=platform,
                    status="published" if result.get("status") == "published" else "failed",
                    platform_post_id=result.get("post_id"),
                    platform_url=result.get("url"),
                    error_message=result.get("error"),
                )
                db.add(job)

            db.commit()

        except Exception as e:
            logger.error(f"Publishing failed for post {post.id}: {e}")
            db.rollback()
        finally:
            db.close()
