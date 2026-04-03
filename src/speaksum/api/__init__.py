"""API routers package."""

from speaksum.api.knowledge_graph import router as knowledge_graph_router
from speaksum.api.meetings import router as meetings_router
from speaksum.api.settings import router as settings_router
from speaksum.api.speeches import router as speeches_router
from speaksum.api.upload import router as upload_router

__all__ = [
    "upload_router",
    "meetings_router",
    "speeches_router",
    "knowledge_graph_router",
    "settings_router",
]
