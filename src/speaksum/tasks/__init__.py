"""Celery tasks package."""

from speaksum.tasks.celery_app import app
from speaksum.tasks.celery_tasks import process_content_task

__all__ = ["app", "process_content_task"]
