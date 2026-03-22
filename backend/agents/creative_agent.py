"""Creative Agent: Generates captions, images (FLUX), and audio (ElevenLabs) per post brief."""
import asyncio
import json
import uuid
import logging
from agents.base import BaseAgent
from services import gemini, replicate_flux
from pipeline.event_bus import EventBus
from database import SessionLocal
from models.content import Post, PostVariant
from models.campaign import StrategyOutput

logger = logging.getLogger(__name__)

PLATFORM_CHAR_LIMITS = {
    "twitter": 280,
    "instagram": 2200,
    "linkedin": 3000,
    "facebook": 63206,
    "tiktok": 2200,
    "youtube": 5000,
}


class CreativeAgent(BaseAgent):
    _semaphore = asyncio.Semaphore(2)  # max 2 concurrent generations

    def __init__(self, bus: EventBus, campaign_id: str):
        super().__init__(bus, campaign_id)

    async def run(self, strategy_output: dict, brand_name: str, brand_dna: dict, campaign_id: str):
        post_briefs = strategy_output.get("post_briefs", [])
        if not post_briefs:
            await self.log("No post briefs found in strategy", "creative")
            return

        total = len(post_briefs)
        await self.log(f"Generating {total} posts...", "creative")

        tasks = [
            self._generate_post(brief, brand_name, brand_dna, i, total)
            for i, brief in enumerate(post_briefs)
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _generate_post(
        self, brief: dict, brand_name: str, brand_dna: dict, index: int, total: int
    ):
        async with self._semaphore:
            platform = brief.get("platform", "instagram")
            brief_id = brief.get("brief_id", str(uuid.uuid4()))

            await self.log(
                f"[{index + 1}/{total}] Generating {platform} post: {brief.get('caption_direction', '')[:60]}...",
                "creative"
            )

            # Step 1: Generate A/B captions
            await self.log(f"[{index + 1}/{total}] Writing caption variants...", "creative")
            captions = await self._generate_captions(brief, brand_name, brand_dna)

            # Step 2: Generate enhanced FLUX prompt
            await self.log(f"[{index + 1}/{total}] Crafting image prompt...", "creative")
            flux_prompt = await self._enhance_image_prompt(brief, brand_name, brand_dna)

            # Step 3: Generate image
            await self.log(f"[{index + 1}/{total}] Generating image with FLUX...", "creative")
            image_path = await replicate_flux.generate_image(
                flux_prompt,
                filename_prefix=f"post_{platform}_{index}"
            )

            # Step 4: Optional voiceover (for video content types)
            audio_path = None
            if brief.get("content_type") == "video" and self.settings.elevenlabs_api_key:
                await self.log(f"[{index + 1}/{total}] Generating voiceover...", "creative")
                from services.elevenlabs_service import generate_voiceover
                # Use variant A caption for voiceover
                voiceover_text = captions[0]["caption"][:500] if captions else ""
                audio_path = await generate_voiceover(voiceover_text)

            # Step 5: Save to DB
            self._save_post(brief_id, platform, captions, image_path, audio_path, flux_prompt)

            pct = int(((index + 1) / total) * 100)
            await self.progress(pct, f"Generated {index + 1}/{total} posts", "creative")

    async def _generate_captions(self, brief: dict, brand_name: str, dna: dict) -> list[dict]:
        platform = brief.get("platform", "instagram")
        char_limit = PLATFORM_CHAR_LIMITS.get(platform, 2200)
        hashtags = " ".join(brief.get("hashtags", []))

        prompt = f"""
Write two distinct caption variants (A and B) for a {platform} post for brand: {brand_name}

DIRECTION: {brief.get('caption_direction', '')}
TONE: {brief.get('tone', 'professional')}
TREND REFERENCE: {brief.get('trend_reference', 'none')}
BRAND VOICE: {dna.get('voice_tone', 'engaging and authentic')}
CHARACTER LIMIT: {char_limit}
HASHTAGS TO INCLUDE: {hashtags}

Requirements:
- Variant A: More direct and punchy
- Variant B: More storytelling and emotional
- Both must fit within {char_limit} characters including hashtags
- Both must have a clear call-to-action
- For Twitter: Keep very concise (< 240 chars before hashtags)

Return JSON:
{{
  "variant_a": {{
    "caption": "full caption text including hashtags",
    "platform_captions": {{
      "twitter": "twitter-optimized version (< 240 chars)",
      "instagram": "instagram version",
      "linkedin": "professional linkedin version",
      "facebook": "facebook version",
      "tiktok": "tiktok caption",
      "youtube": "youtube description"
    }}
  }},
  "variant_b": {{
    "caption": "full caption text including hashtags",
    "platform_captions": {{
      "twitter": "twitter version",
      "instagram": "instagram version",
      "linkedin": "professional linkedin version",
      "facebook": "facebook version",
      "tiktok": "tiktok caption",
      "youtube": "youtube description"
    }}
  }}
}}
"""
        try:
            result = await gemini.generate_json(prompt)
            return [
                {"label": "A", "caption": result["variant_a"]["caption"],
                 "platform_captions": result["variant_a"].get("platform_captions", {})},
                {"label": "B", "caption": result["variant_b"]["caption"],
                 "platform_captions": result["variant_b"].get("platform_captions", {})},
            ]
        except Exception as e:
            logger.error(f"Caption generation failed: {e}")
            return [
                {"label": "A", "caption": f"Discover the power of {brief.get('tone', 'innovation')}. {' '.join(brief.get('hashtags', []))}", "platform_captions": {}},
                {"label": "B", "caption": f"Transform your experience with us. Join the community. {' '.join(brief.get('hashtags', []))}", "platform_captions": {}},
            ]

    async def _enhance_image_prompt(self, brief: dict, brand_name: str, dna: dict) -> str:
        colors = ", ".join(dna.get("colors", ["#7c3aed", "#a855f7", "#ffffff"]))
        prompt = f"""
Create a detailed image generation prompt for FLUX AI for a {brief.get('platform', 'instagram')} post.

VISUAL DIRECTION: {brief.get('visual_direction', '')}
BRAND: {brand_name}
BRAND COLORS: {colors}
VISUAL STYLE: {dna.get('visual_style', 'modern, clean, professional')}
CONTENT TYPE: {brief.get('content_type', 'image')}

Write a single detailed prompt (150-200 words) that:
1. Describes the main subject and composition
2. Specifies lighting (e.g., "soft natural light", "golden hour", "studio lighting")
3. References the brand colors naturally
4. Sets the mood and atmosphere
5. Specifies photography style (product shot, lifestyle, flat lay, etc.)
6. Includes quality modifiers: "high quality, professional photography, 8k, sharp focus"
7. Avoids text, watermarks, or logos in the image

Return ONLY the prompt text, nothing else.
"""
        try:
            enhanced = await gemini.generate(prompt, model=gemini.FLASH)
            return enhanced.strip()
        except Exception:
            return (
                f"{brief.get('visual_direction', 'Professional brand photography')}, "
                f"brand colors {colors}, modern aesthetic, high quality, professional photography, 8k"
            )

    def _save_post(
        self, brief_id: str, platform: str,
        captions: list[dict], image_path: str | None,
        audio_path: str | None, flux_prompt: str
    ):
        db = SessionLocal()
        try:
            post = Post(
                campaign_id=self.campaign_id,
                brief_id=brief_id,
                platform=platform,
                status="pending_review",
            )
            db.add(post)
            db.flush()

            for cap in captions:
                media_assets = []
                if image_path:
                    media_assets.append({
                        "asset_id": str(uuid.uuid4()),
                        "type": "image",
                        "file_path": image_path,
                        "url": f"/api/media/{image_path.split('/')[-1]}",
                        "generation_prompt": flux_prompt,
                    })
                if audio_path:
                    media_assets.append({
                        "asset_id": str(uuid.uuid4()),
                        "type": "audio",
                        "file_path": audio_path,
                        "url": f"/api/media/{audio_path.split('/')[-1]}",
                        "generation_prompt": "",
                    })

                variant = PostVariant(
                    post_id=post.id,
                    label=cap["label"],
                    caption=cap["caption"],
                    platform_captions_json=json.dumps(cap.get("platform_captions", {})),
                    media_assets_json=json.dumps(media_assets),
                    image_generation_prompt=flux_prompt,
                    refinement_history_json=json.dumps([]),
                )
                db.add(variant)

            db.commit()
        except Exception as e:
            logger.error(f"Failed to save post: {e}")
            db.rollback()
        finally:
            db.close()
