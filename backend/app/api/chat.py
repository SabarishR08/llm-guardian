"""Chat turn endpoint - streams a real agent turn as Server-Sent Events."""

from __future__ import annotations

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services import chat_llm
from app.services.chat_orchestrator import run_turn

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatAttachment(BaseModel):
    name: str
    content: str = ""


class ChatTurnRequest(BaseModel):
    message: str = Field(min_length=0, max_length=8000)
    history: list[ChatMessage] = []
    attachment: ChatAttachment | None = None


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.post("/turn")
async def chat_turn(body: ChatTurnRequest) -> StreamingResponse:
    history = [h.model_dump() for h in body.history]
    attachment = body.attachment.model_dump() if body.attachment else None

    async def generate():
        try:
            async for event in run_turn(history, body.message, attachment):
                yield _sse(event)
        except Exception as exc:  # noqa: BLE001 - never let a stream die silently
            yield _sse({"type": "error", "message": str(exc)})
            yield _sse({"type": "done"})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/capabilities")
async def capabilities() -> dict[str, object]:
    return {
        "llm": "groq" if chat_llm.is_llm_available() else "deterministic",
        "tools": [
            {"name": "read_document", "live": True},
            {"name": "list_documents", "live": True},
            {"name": "web_search", "live": False},
            {"name": "send_notification", "live": False},
        ],
    }
