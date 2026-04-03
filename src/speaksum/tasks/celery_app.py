"""Celery application configuration."""

from celery import Celery

from speaksum.core.config import settings

app = Celery("speaksum")
app.conf.broker_url = settings.REDIS_URL
app.conf.result_backend = settings.REDIS_URL
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
app.autodiscover_tasks(["speaksum.tasks"])
