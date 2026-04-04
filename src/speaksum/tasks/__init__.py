"""Celery tasks package."""

from speaksum.tasks.celery_app import app
from speaksum.tasks.celery_tasks import process_meeting_task

__all__ = ["app", "process_meeting_task"]
