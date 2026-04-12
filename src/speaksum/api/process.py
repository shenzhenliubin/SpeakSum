"""Process streaming API."""

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials

from speaksum.api.upload import _build_processing_status
from speaksum.core.security import security_scheme, verify_token

router = APIRouter(prefix="/api/v1/process", tags=["Process"])


def _get_stream_user(
    token: str | None,
    credentials: HTTPAuthorizationCredentials | None,
) -> dict[str, Any]:
    if token:
        return verify_token(token)
    if credentials:
        return verify_token(credentials.credentials)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


@router.get("/{task_id}/stream")
async def stream_task_status(
    task_id: str,
    token: str | None = Query(default=None),
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> StreamingResponse:
    _get_stream_user(token, credentials)

    async def event_generator():
        last_payload = ""
        while True:
            snapshot = _build_processing_status(task_id)
            payload = snapshot.model_dump_json()
            if payload != last_payload:
                yield f"data: {payload}\n\n"
                last_payload = payload

            if snapshot.status in {"SUCCESS", "FAILED", "completed", "ignored", "failed"}:
                break

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
