import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from sqlalchemy import text
from starlette.middleware.base import RequestResponseEndpoint

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.logging import install_access_log_redaction
from app.core.middleware import RequestBodyLimitMiddleware

settings = get_settings()
install_access_log_redaction()
logger = logging.getLogger("cyberpass.api")


class HealthResponse(BaseModel):
    status: str


app = FastAPI(
    title="CyberPass API",
    version="0.1.0",
    description=(
        "API de centralisation de preuves, de questionnaires et de passeports cyber. "
        "CyberPass n'est pas un organisme de certification."
    ),
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
    openapi_url="/openapi.json" if settings.app_env != "production" else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Organization-ID"],
)
app.add_middleware(RequestBodyLimitMiddleware, max_bytes=settings.max_request_body_bytes)


@app.middleware("http")
async def security_headers(request: Request, call_next: RequestResponseEndpoint) -> Response:
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if request.url.path.startswith(settings.api_prefix):
        response.headers.setdefault("Cache-Control", "private, no-store")
        response.headers.setdefault("Pragma", "no-cache")
    if request.url.path.startswith(("/docs", "/redoc")) and settings.app_env != "production":
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self' https://cdn.jsdelivr.net; "
            "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
            "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
            "img-src 'self' data: https://fastapi.tiangolo.com; "
            "frame-ancestors 'none'",
        )
    else:
        response.headers.setdefault(
            "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
        )
    if settings.app_env == "production":
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


@app.exception_handler(Exception)
async def unhandled_exception(_request: Request, exc: Exception) -> JSONResponse:
    error_id = str(uuid.uuid4())
    logger.error("Unhandled server error error_id=%s type=%s", error_id, type(exc).__name__)
    # Le détail technique est volontairement absent de la réponse et n'inclut aucun secret.
    return JSONResponse(
        status_code=500,
        content={"detail": "Une erreur interne est survenue", "errorId": error_id},
    )


@app.get("/health", response_model=HealthResponse, tags=["Système"])
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/ready", response_model=HealthResponse, tags=["Système"])
def readiness() -> HealthResponse:
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return HealthResponse(status="ready")


app.include_router(api_router, prefix=settings.api_prefix)
