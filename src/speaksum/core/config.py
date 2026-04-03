"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite+aiosqlite:///./speaksum.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    # DEV ONLY: must override via env var in production
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ENCRYPTION_KEY: str = ""
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # Default LLM API keys (optional, user configs preferred)
    KIMI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    CLAUDE_API_KEY: str | None = None

    # CORS
    CORS_ORIGINS: list[str] = ["*"]


settings = Settings()
