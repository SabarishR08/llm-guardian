"""Application configuration, loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="GUARDIAN_", extra="ignore")

    # App
    app_name: str = "MCP Guardian"
    environment: str = "development"
    debug: bool = True

    # Security
    jwt_secret: str = "change-me-in-production-a-very-long-random-secret-value"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12

    # CORS - the dashboard origin
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Redis (optional - falls back to in-memory ring buffer)
    redis_url: str | None = None
    event_buffer_size: int = 1000

    # Detection engine thresholds (0–100)
    threshold_sanitize: int = 25
    threshold_quarantine: int = 50
    threshold_block: int = 75

    # LLM explanation
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    ollama_url: str | None = None  # e.g. http://localhost:11434
    ollama_model: str = "llama3.1"
    llm_timeout_seconds: float = 6.0

    # Hybrid detection: escalate inconclusive heuristic verdicts to the LLM
    # classifier for a semantic second opinion. Requires groq_api_key.
    llm_detection_enabled: bool = True

    # Traffic simulator (keeps the dashboard alive during demos)
    simulator_enabled: bool = True
    simulator_min_interval_ms: int = 700
    simulator_max_interval_ms: int = 2300


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
