"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from speaksum.api import (
    knowledge_graph_router,
    meetings_router,
    settings_router,
    speeches_router,
    upload_router,
)
from speaksum.core.config import settings
from speaksum.core.database import async_engine
from speaksum.core.exceptions import SpeakSumException
from speaksum.models.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: create tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: dispose engine
    await async_engine.dispose()


app = FastAPI(title="SpeakSum API", version="0.1.0", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SpeakSumException)
async def speaksum_exception_handler(request: object, exc: SpeakSumException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


# Register routers
app.include_router(upload_router)
app.include_router(meetings_router)
app.include_router(speeches_router)
app.include_router(knowledge_graph_router)
app.include_router(settings_router)


@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check endpoint with service status."""
    from datetime import datetime, timezone

    services = {
        "database": "unknown",
        "redis": "unknown",
    }

    # Check database
    try:
        from sqlalchemy import text
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        services["database"] = "connected"
    except Exception:
        services["database"] = "disconnected"

    # Check Redis (Celery broker)
    try:
        from speaksum.tasks.celery_app import app as celery_app
        from redis.asyncio import from_url as redis_from_url

        broker_url = celery_app.conf.broker_url
        if broker_url:
            # Actually ping Redis to verify connectivity
            redis = redis_from_url(broker_url)
            await redis.ping()
            await redis.aclose()
            services["redis"] = "connected"
    except Exception:
        services["redis"] = "disconnected"

    all_healthy = all(s == "connected" or s == "configured" for s in services.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": services,
    }
