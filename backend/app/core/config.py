from typing import Annotated, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    api_v1_prefix: str = "/api/v1"
    project_name: str = "Klypup Research API"
    environment: Literal["development", "staging", "production"] = "development"
    secret_key: str = "replace-this-before-production-with-32-plus-characters"
    database_url: str = "postgresql+psycopg://klypup:klypup@localhost:5432/klypup_research"
    frontend_url: str = "http://localhost:3000"
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    cors_origin_regex: str | None = None
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    auto_create_tables: bool = False
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.4-mini"
    twelve_data_api_key: str | None = None
    alpha_vantage_api_key: str | None = None
    sec_user_agent: str | None = None
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_collection: str = "klypup_research_documents"
    upstash_redis_rest_url: str | None = None
    upstash_redis_rest_token: str | None = None
    cache_enabled: bool = True
    market_cache_ttl_seconds: int = 120
    news_cache_ttl_seconds: int = 900
    document_cache_ttl_seconds: int = 3600

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_postgres_driver(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @model_validator(mode="after")
    def add_development_cors_origins(self) -> "Settings":
        origins = [*self.cors_origins, self.frontend_url]
        if self.environment == "development":
            origins.extend(
                [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://0.0.0.0:3000",
                ]
            )
            if self.cors_origin_regex is None:
                self.cors_origin_regex = (
                    r"^http://("
                    r"localhost|127\.0\.0\.1|0\.0\.0\.0|"
                    r"192\.168\.\d{1,3}\.\d{1,3}|"
                    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
                    r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}"
                    r"):3000$"
                )

        self.cors_origins = list(dict.fromkeys(origin.rstrip("/") for origin in origins if origin))
        if self.qdrant_url:
            self.qdrant_url = self.qdrant_url.rstrip("/")
        if self.upstash_redis_rest_url:
            self.upstash_redis_rest_url = self.upstash_redis_rest_url.rstrip("/")
        return self


settings = Settings()
