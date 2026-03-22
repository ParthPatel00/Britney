from pipeline.event_bus import EventBus
from schemas.agent import AgentEvent, AgentEventType
from config import get_settings
import logging

settings = get_settings()
logger = logging.getLogger(__name__)


class BaseAgent:
    def __init__(self, bus: EventBus, campaign_id: str):
        self.bus = bus
        self.campaign_id = campaign_id
        self.settings = settings

    async def log(self, message: str, agent_name: str = ""):
        await self.bus.emit(AgentEvent(
            event_type=AgentEventType.AGENT_LOG,
            agent_name=agent_name or self.__class__.__name__.lower().replace("agent", ""),
            campaign_id=self.campaign_id,
            message=message,
        ))

    async def progress(self, pct: int, message: str = "", agent_name: str = ""):
        await self.bus.emit(AgentEvent(
            event_type=AgentEventType.AGENT_PROGRESS,
            agent_name=agent_name or self.__class__.__name__.lower().replace("agent", ""),
            campaign_id=self.campaign_id,
            message=message,
            progress=pct,
        ))
