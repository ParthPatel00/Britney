"""Zernio/Late.dev social media publishing API."""
import httpx
import logging
from config import get_settings
from tenacity import retry, stop_after_attempt, wait_exponential

settings = get_settings()
logger = logging.getLogger(__name__)

BASE_URL = "https://api.zernio.com/v1"

PLATFORM_NAMES = {
    "twitter": "twitter",
    "instagram": "instagram",
    "facebook": "facebook",
    "linkedin": "linkedin",
    "tiktok": "tiktok",
    "youtube": "youtube",
    "bluesky": "bluesky",
    "threads": "threads",
    "reddit": "reddit",
    "pinterest": "pinterest",
}


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=10))
async def publish_post(
    caption: str,
    platforms: list[str],
    media_paths: list[str] = None,
    scheduled_at: str = None,
) -> dict:
    """Publish a post to multiple platforms via Zernio."""
    if not settings.zernio_api_key:
        logger.warning("No Zernio API key configured")
        return {"success": False, "error": "No Zernio API key", "results": {}}

    mapped_platforms = [PLATFORM_NAMES.get(p, p) for p in platforms if p in PLATFORM_NAMES]
    if not mapped_platforms:
        return {"success": False, "error": "No valid platforms", "results": {}}

    headers = {
        "Authorization": f"Bearer {settings.zernio_api_key}",
        "Content-Type": "application/json",
    }

    # Add Twitter OAuth if needed
    if "twitter" in mapped_platforms and settings.twitter_api_key:
        headers["X-Twitter-Api-Key"] = settings.twitter_api_key
        headers["X-Twitter-Api-Secret"] = settings.twitter_api_secret
        headers["X-Twitter-Access-Token"] = settings.twitter_access_token
        headers["X-Twitter-Access-Secret"] = settings.twitter_access_secret

    payload: dict = {
        "content": caption,
        "platforms": mapped_platforms,
    }

    if scheduled_at:
        payload["scheduleDate"] = scheduled_at

    # Upload media if provided
    media_ids = []
    if media_paths:
        for path in media_paths[:4]:  # max 4 media per post
            media_id = await _upload_media(path)
            if media_id:
                media_ids.append(media_id)

    if media_ids:
        payload["mediaIds"] = media_ids

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{BASE_URL}/posts", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return {"success": True, "results": data, "error": None}
        except httpx.HTTPStatusError as e:
            logger.error(f"Zernio publish failed: {e.response.status_code} {e.response.text}")
            return {"success": False, "error": str(e), "results": {}}
        except Exception as e:
            logger.error(f"Zernio publish error: {e}")
            return {"success": False, "error": str(e), "results": {}}


async def _upload_media(file_path: str) -> str | None:
    """Upload media to Zernio and return media ID."""
    if not settings.zernio_api_key:
        return None
    try:
        from pathlib import Path
        p = Path(file_path)
        if not p.exists():
            return None

        mime = "image/webp" if p.suffix == ".webp" else "image/jpeg" if p.suffix in (".jpg", ".jpeg") else "image/png"

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{BASE_URL}/media",
                headers={"Authorization": f"Bearer {settings.zernio_api_key}"},
                files={"file": (p.name, p.read_bytes(), mime)},
            )
            resp.raise_for_status()
            return resp.json().get("id")
    except Exception as e:
        logger.warning(f"Media upload failed: {e}")
        return None
