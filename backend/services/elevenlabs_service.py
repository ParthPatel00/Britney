"""ElevenLabs TTS for voiceovers."""
import uuid
import logging
from config import get_settings
from tenacity import retry, stop_after_attempt, wait_exponential

settings = get_settings()
logger = logging.getLogger(__name__)

# Default voice: Rachel (warm, professional)
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
async def generate_voiceover(text: str, voice_id: str = DEFAULT_VOICE_ID) -> str | None:
    """Generate TTS audio and save as MP3. Returns file path."""
    if not settings.elevenlabs_api_key:
        logger.warning("No ElevenLabs API key, skipping voiceover")
        return None

    try:
        import asyncio
        from elevenlabs.client import ElevenLabs

        client = ElevenLabs(api_key=settings.elevenlabs_api_key)
        loop = asyncio.get_event_loop()

        def _generate():
            audio = client.text_to_speech.convert(
                voice_id=voice_id,
                text=text[:2500],  # limit for credits
                model_id="eleven_turbo_v2_5",
                output_format="mp3_44100_128",
            )
            return b"".join(audio)

        audio_bytes = await loop.run_in_executor(None, _generate)

        filename = f"audio_{uuid.uuid4().hex[:8]}.mp3"
        save_path = settings.generated_dir / filename
        save_path.write_bytes(audio_bytes)
        logger.info(f"Voiceover saved: {save_path}")
        return str(save_path)

    except Exception as e:
        logger.error(f"ElevenLabs TTS failed: {e}")
        return None
