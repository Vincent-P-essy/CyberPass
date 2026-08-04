from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    app_name: str = "CyberPass API"
    app_env: Literal["local", "development", "test", "staging", "production"] = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://cyberpass:cyberpass@localhost:5432/cyberpass"
    jwt_secret: str = "development-only-secret-change-before-production"  # noqa: S105
    jwt_algorithm: Literal["HS256"] = "HS256"
    access_token_minutes: int = Field(default=30, ge=5, le=120)
    cookie_secure: bool = False
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"], min_length=1, max_length=20
    )

    storage_backend: Literal["local", "s3"] = "local"
    local_storage_path: Path = Path("./storage")
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1024, le=50 * 1024 * 1024)
    max_request_body_bytes: int = Field(default=11 * 1024 * 1024, ge=2048, le=55 * 1024 * 1024)
    s3_endpoint_url: str | None = None
    s3_public_endpoint_url: str | None = None
    s3_bucket: str = "cyberpass-private"
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "eu-west-3"
    signed_url_seconds: int = Field(default=300, ge=60, le=900)

    openai_api_key: str | None = None
    openai_model: str | None = None
    openai_timeout_seconds: float = Field(default=30.0, ge=5.0, le=120.0)
    openai_max_output_tokens: int = Field(default=1200, ge=256, le=4096)
    auth_rate_limit: int = Field(default=10, ge=1, le=100)
    auth_ip_rate_limit: int = Field(default=60, ge=1, le=1000)
    auth_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    generation_rate_limit: int = Field(default=5, ge=1, le=100)
    generation_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    generation_concurrency_per_tenant: int = Field(default=1, ge=1, le=5)
    public_share_rate_limit: int = Field(default=120, ge=1, le=1000)
    public_share_global_rate_limit: int = Field(default=2000, ge=1, le=20_000)
    public_share_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    upload_rate_limit: int = Field(default=30, ge=1, le=1000)
    download_rate_limit: int = Field(default=120, ge=1, le=2000)
    download_global_rate_limit: int = Field(default=2000, ge=1, le=20_000)
    file_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    tenant_evidence_quota: int = Field(default=5000, ge=1, le=1_000_000)
    tenant_questionnaire_quota: int = Field(default=1000, ge=1, le=100_000)

    @model_validator(mode="after")
    def validate_secure_configuration(self) -> "Settings":
        strong_environment = self.app_env in {"staging", "production"}
        if any(origin == "*" for origin in self.cors_origins):
            raise ValueError("CORS_ORIGINS ne peut pas contenir * avec les cookies activés")
        for origin in self.cors_origins:
            parsed = urlparse(origin)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("Chaque origine CORS doit être une URL HTTP(S) complète")
            if strong_environment and parsed.scheme != "https":
                raise ValueError(
                    "Les origines CORS doivent utiliser HTTPS hors environnement local"
                )
        if strong_environment:
            weak_markers = {"change", "secret", "replace", "development", "password"}
            if (
                len(self.jwt_secret) < 32
                or len(set(self.jwt_secret)) < 12
                or any(marker in self.jwt_secret.casefold() for marker in weak_markers)
            ):
                raise ValueError(
                    "JWT_SECRET doit être aléatoire et contenir au moins 32 caractères"
                )
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE doit être activé hors environnement local")
            if not self.database_url.startswith(("postgresql://", "postgresql+psycopg://")):
                raise ValueError("PostgreSQL est obligatoire en staging et production")
            if self.storage_backend != "s3":
                raise ValueError("Le stockage S3 privé est obligatoire en staging et production")
            if (
                self.s3_public_endpoint_url
                and urlparse(self.s3_public_endpoint_url).scheme != "https"
            ):
                raise ValueError(
                    "S3_PUBLIC_ENDPOINT_URL doit utiliser HTTPS hors environnement local"
                )
        if self.storage_backend == "s3" and not (
            self.s3_access_key and self.s3_secret_key and self.s3_endpoint_url
        ):
            raise ValueError("La configuration S3 est incomplète")
        if self.max_request_body_bytes < self.max_upload_bytes:
            raise ValueError("MAX_REQUEST_BODY_BYTES doit couvrir MAX_UPLOAD_BYTES")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
