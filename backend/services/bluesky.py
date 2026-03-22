"""Direct Bluesky AT Protocol publishing - guaranteed free fallback."""
import logging
from config import get_settings
from tenacity import retry, stop_after_attempt, wait_exponential

settings = get_settings()
logger = logging.getLogger(__name__)


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
async def publish_post(caption: str, image_path: str = None) -> dict:
    """Publish to Bluesky. Returns {success, url, post_id}."""
    if not settings.bluesky_handle or not settings.bluesky_app_password:
        logger.warning("Bluesky credentials not configured")
        return {"success": False, "error": "No Bluesky credentials", "url": None}

    try:
        import asyncio
        from atproto import Client

        loop = asyncio.get_event_loop()

        def _publish():
            client = Client()
            client.login(settings.bluesky_handle, settings.bluesky_app_password)

            # Truncate to 300 chars for Bluesky limit
            text = caption[:300] if len(caption) > 300 else caption

            if image_path:
                try:
                    from pathlib import Path
                    p = Path(image_path)
                    if p.exists():
                        img_data = p.read_bytes()
                        # Detect mime type
                        suffix = p.suffix.lower()
                        mime = (
                            "image/webp" if suffix == ".webp"
                            else "image/jpeg" if suffix in (".jpg", ".jpeg")
                            else "image/png"
                        )
                        upload = client.upload_blob(img_data, mime_type=mime)
                        post = client.send_image(text=text, image=upload.blob, image_alt=text[:100])
                        return post
                except Exception as e:
                    logger.warning(f"Image upload failed, posting text only: {e}")

            post = client.send_post(text=text)
            return post

        post_data = await loop.run_in_executor(None, _publish)
        uri = getattr(post_data, "uri", "")
        # Convert AT URI to web URL
        if uri and "at://" in uri:
            parts = uri.replace("at://", "").split("/")
            if len(parts) >= 3:
                handle = settings.bluesky_handle.replace(".bsky.social", "")
                post_id = parts[-1]
                url = f"https://bsky.app/profile/{settings.bluesky_handle}/post/{post_id}"
            else:
                url = "https://bsky.app"
        else:
            url = "https://bsky.app"

        return {"success": True, "url": url, "post_id": uri, "error": None}

    except Exception as e:
        logger.error(f"Bluesky publish failed: {e}")
        return {"success": False, "error": str(e), "url": None}
