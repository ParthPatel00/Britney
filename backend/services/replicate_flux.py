"""FLUX image generation via Replicate."""
import asyncio
import httpx
import uuid
import logging
from pathlib import Path
from config import get_settings
from tenacity import retry, stop_after_attempt, wait_exponential

settings = get_settings()
logger = logging.getLogger(__name__)


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=4, max=15))
async def generate_image(prompt: str, filename_prefix: str = "img") -> str | None:
    """Generate an image with FLUX.1-schnell and save locally. Returns file path."""
    if not settings.replicate_api_token:
        logger.warning("No Replicate token, using placeholder")
        return await _create_placeholder(prompt, filename_prefix)

    try:
        import replicate
        import os
        os.environ["REPLICATE_API_TOKEN"] = settings.replicate_api_token

        loop = asyncio.get_event_loop()

        def _run():
            output = replicate.run(
                "black-forest-labs/flux-schnell",
                input={
                    "prompt": prompt,
                    "num_outputs": 1,
                    "aspect_ratio": "1:1",
                    "output_format": "webp",
                    "output_quality": 90,
                    "go_fast": True,
                },
            )
            return list(output)

        outputs = await loop.run_in_executor(None, _run)
        if not outputs:
            return await _create_placeholder(prompt, filename_prefix)

        # Download image
        image_url = str(outputs[0])
        filename = f"{filename_prefix}_{uuid.uuid4().hex[:8]}.webp"
        save_path = settings.generated_dir / filename

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            save_path.write_bytes(resp.content)

        logger.info(f"Image saved: {save_path}")
        return str(save_path)

    except Exception as e:
        logger.error(f"FLUX generation failed: {e}")
        return await _create_placeholder(prompt, filename_prefix)


async def _create_placeholder(prompt: str, prefix: str) -> str:
    """Create a branded placeholder image using Pillow."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import textwrap

        img = Image.new("RGB", (1080, 1080), color="#0a0a0f")
        draw = ImageDraw.Draw(img)

        # Purple gradient effect (simplified)
        for y in range(1080):
            alpha = y / 1080
            r = int(10 + alpha * 40)
            g = int(10 + alpha * 10)
            b = int(15 + alpha * 60)
            draw.line([(0, y), (1080, y)], fill=(r, g, b))

        # Brand accent circle
        draw.ellipse([340, 340, 740, 740], outline="#7c3aed", width=3)
        draw.ellipse([360, 360, 720, 720], outline="#a855f7", width=1)

        # Text
        try:
            font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
            font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
        except Exception:
            font_large = ImageFont.load_default()
            font_small = font_large

        draw.text((540, 480), "BRITNEY", fill="#a855f7", font=font_large, anchor="mm")
        draw.text((540, 540), "AI Marketing", fill="#ffffff", font=font_small, anchor="mm")

        # Wrap and show prompt snippet
        snippet = textwrap.fill(prompt[:80] + "..." if len(prompt) > 80 else prompt, 40)
        draw.text((540, 650), snippet, fill="#6b7280", font=font_small, anchor="mm", align="center")

        filename = f"{prefix}_{uuid.uuid4().hex[:8]}.png"
        save_path = settings.generated_dir / filename
        img.save(str(save_path))
        return str(save_path)

    except Exception as e:
        logger.error(f"Placeholder creation failed: {e}")
        return ""
