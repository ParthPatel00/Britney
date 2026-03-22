"""SSE stream routes for live pipeline events."""
import json
import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pipeline.event_bus import EventBus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stream", tags=["stream"])


@router.get("/campaign/{campaign_id}")
async def stream_campaign(campaign_id: str):
    """Stream pipeline events for a campaign. Replays past events first."""

    async def event_generator():
        async for event in EventBus.subscribe(campaign_id):
            yield event.to_sse()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )
