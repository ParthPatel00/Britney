import asyncio
import json
from collections import defaultdict
from typing import AsyncIterator
from schemas.agent import AgentEvent, AgentEventType
from datetime import datetime, timezone


class EventBus:
    """In-process pub/sub for SSE events. Thread-safe asyncio queue per campaign."""

    _queues: dict[str, list[asyncio.Queue]] = defaultdict(list)

    def __init__(self, campaign_id: str):
        self.campaign_id = campaign_id

    async def emit(self, event: AgentEvent) -> None:
        """Emit to all live subscribers + persist to DB."""
        from database import SessionLocal
        from models.campaign import PipelineEvent

        # Persist for reconnect replay
        db = SessionLocal()
        try:
            db_event = PipelineEvent(
                campaign_id=self.campaign_id,
                event_type=event.event_type.value,
                agent_name=event.agent_name,
                message=event.message,
                data_json=json.dumps(event.data),
            )
            db.add(db_event)
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

        # Push to all live SSE subscribers
        for queue in list(EventBus._queues[self.campaign_id]):
            try:
                await queue.put(event)
            except Exception:
                pass

    @classmethod
    async def subscribe(cls, campaign_id: str) -> AsyncIterator[AgentEvent]:
        """Yield events for a campaign. Replays past events first, then live."""
        # Replay past events from DB
        from database import SessionLocal
        from models.campaign import PipelineEvent

        db = SessionLocal()
        try:
            past = db.query(PipelineEvent).filter(
                PipelineEvent.campaign_id == campaign_id
            ).order_by(PipelineEvent.created_at).all()

            for e in past:
                yield AgentEvent(
                    event_type=AgentEventType(e.event_type),
                    agent_name=e.agent_name or "",
                    campaign_id=campaign_id,
                    timestamp=e.created_at.replace(tzinfo=timezone.utc) if e.created_at.tzinfo is None else e.created_at,
                    message=e.message or "",
                    data=json.loads(e.data_json) if e.data_json else {},
                )
        finally:
            db.close()

        # Subscribe to live events
        queue: asyncio.Queue = asyncio.Queue()
        cls._queues[campaign_id].append(queue)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    if event is None:
                        break
                    yield event
                    if event.event_type in (
                        AgentEventType.PIPELINE_COMPLETE,
                        AgentEventType.AGENT_ERROR,
                    ):
                        break
                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield AgentEvent(
                        event_type=AgentEventType.HEARTBEAT,
                        campaign_id=campaign_id,
                        message="ping",
                    )
        finally:
            if queue in cls._queues[campaign_id]:
                cls._queues[campaign_id].remove(queue)

    @classmethod
    async def close(cls, campaign_id: str) -> None:
        """Signal all subscribers to close."""
        for queue in list(cls._queues[campaign_id]):
            await queue.put(None)
