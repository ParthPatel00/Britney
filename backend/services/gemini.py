"""Gemini API wrapper using the new google-genai SDK."""
import json
import asyncio
from google import genai
from google.genai import types
from config import get_settings
from tenacity import retry, stop_after_attempt, wait_exponential
import logging
import re

settings = get_settings()
logger = logging.getLogger(__name__)

FLASH = "gemini-2.0-flash"
PRO = "gemini-1.5-pro"

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None and settings.gemini_api_key:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def generate(prompt: str, model: str = FLASH, system: str = "") -> str:
    """Generate text from Gemini. Returns raw string."""
    client = _get_client()
    if not client:
        logger.warning("No Gemini API key configured")
        return ""

    loop = asyncio.get_event_loop()

    def _call():
        config = types.GenerateContentConfig(
            system_instruction=system if system else None,
            temperature=0.7,
        )
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return response.text

    return await loop.run_in_executor(None, _call)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def generate_json(prompt: str, model: str = FLASH, system: str = "") -> dict:
    """Generate and parse JSON from Gemini."""
    client = _get_client()
    if not client:
        return {}

    loop = asyncio.get_event_loop()

    def _call():
        config = types.GenerateContentConfig(
            system_instruction=system if system else None,
            temperature=0.7,
            response_mime_type="application/json",
        )
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return response.text

    raw = await loop.run_in_executor(None, _call)

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning(f"Gemini returned invalid JSON: {raw[:200]}")
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise


async def analyze_image_base64(base64_data: str, prompt: str) -> str:
    """Analyze an image using Gemini vision."""
    client = _get_client()
    if not client:
        return ""

    loop = asyncio.get_event_loop()

    def _call():
        response = client.models.generate_content(
            model=FLASH,
            contents=[
                types.Part.from_bytes(
                    data=__import__("base64").b64decode(base64_data),
                    mime_type="image/jpeg",
                ),
                prompt,
            ],
        )
        return response.text

    return await loop.run_in_executor(None, _call)
