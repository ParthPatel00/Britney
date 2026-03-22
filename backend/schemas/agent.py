from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
import uuid


class AgentEventType(str, Enum):
    AGENT_START = "agent_start"
    AGENT_LOG = "agent_log"
    AGENT_PROGRESS = "agent_progress"
    AGENT_COMPLETE = "agent_complete"
    AGENT_ERROR = "agent_error"
    HUMAN_REVIEW_REQUIRED = "human_review_required"
    PIPELINE_COMPLETE = "pipeline_complete"
    HEARTBEAT = "heartbeat"


class AgentEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: AgentEventType
    agent_name: str = ""
    campaign_id: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str = ""
    progress: int = 0  # 0-100
    data: dict[str, Any] = Field(default_factory=dict)

    def to_sse(self) -> str:
        return f"data: {self.model_dump_json()}\n\n"
