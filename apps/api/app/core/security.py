import hashlib
import hmac
import math
import re
import secrets
import threading
import time
import uuid
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import HTTPException, Request, Response, status
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash(secrets.token_urlsafe(48))
settings = get_settings()
ACCESS_COOKIE = "cyberpass_access"
CSRF_COOKIE = "cyberpass_csrf"
ORG_COOKIE = "cyberpass_organization"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    try:
        return password_hash.verify(password, encoded)
    except Exception:
        return False


def create_access_token(user_id: uuid.UUID) -> tuple[str, int]:
    expires = datetime.now(UTC) + timedelta(minutes=settings.access_token_minutes)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": datetime.now(UTC),
        "exp": expires,
        "iss": "cyberpass-api",
        "aud": "cyberpass-web",
        "jti": secrets.token_hex(16),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, settings.access_token_minutes * 60


def decode_access_token(token: str) -> uuid.UUID:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer="cyberpass-api",
            audience="cyberpass-web",
            options={"require": ["sub", "exp", "iat", "type"]},
        )
        if payload.get("type") != "access":
            raise ValueError("invalid token type")
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalide ou expirée",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def create_download_token(evidence_id: uuid.UUID, organization_id: uuid.UUID) -> str:
    expires = datetime.now(UTC) + timedelta(seconds=settings.signed_url_seconds)
    return jwt.encode(
        {
            "sub": str(evidence_id),
            "org": str(organization_id),
            "type": "download",
            "iat": datetime.now(UTC),
            "exp": expires,
            "iss": "cyberpass-api",
            "aud": "cyberpass-download",
            "jti": secrets.token_hex(16),
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_download_token(token: str) -> tuple[uuid.UUID, uuid.UUID]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer="cyberpass-api",
            audience="cyberpass-download",
            options={"require": ["sub", "org", "exp", "type"]},
        )
        if payload.get("type") != "download":
            raise ValueError("invalid token type")
        return uuid.UUID(payload["sub"]), uuid.UUID(payload["org"])
    except (jwt.PyJWTError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=404, detail="Téléchargement indisponible") from exc


def issue_auth_cookies(response: Response, token: str, csrf_token: str) -> None:
    response.set_cookie(
        ACCESS_COOKIE,
        token,
        max_age=settings.access_token_minutes * 60,
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        max_age=settings.access_token_minutes * 60,
        secure=settings.cookie_secure,
        httponly=False,
        samesite="lax",
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")
    response.delete_cookie(ORG_COOKIE, path="/")


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def verify_csrf(request: Request) -> None:
    if request.headers.get("Authorization"):
        return
    if not request.cookies.get(ACCESS_COOKIE):
        return
    cookie_token = request.cookies.get(CSRF_COOKIE, "")
    header_token = request.headers.get("X-CSRF-Token", "")
    if not cookie_token or not hmac.compare_digest(cookie_token, header_token):
        raise HTTPException(status_code=403, detail="Jeton CSRF manquant ou invalide")


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class FixedWindowRateLimiter:
    """Limiteur local; utiliser Redis pour une exécution multi-instance."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - window_seconds:
                hits.popleft()
            if len(hits) >= limit:
                retry_after = max(1, math.ceil(hits[0] + window_seconds - now))
                raise HTTPException(
                    status_code=429,
                    detail="Trop de tentatives, réessayez plus tard",
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)


rate_limiter = FixedWindowRateLimiter()


def client_key(request: Request, scope: str, identity: str = "") -> str:
    address = request.client.host if request.client else "unknown"
    digest = hashlib.sha256(identity.lower().encode("utf-8")).hexdigest()[:16] if identity else ""
    return f"{scope}:{address}:{digest}"


def identity_key(scope: str, identity: str) -> str:
    digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()
    return f"{scope}:{digest}"


def safe_metadata(value: dict[str, Any] | None) -> dict[str, Any]:
    if not value:
        return {}
    blocked_fragments = (
        "token",
        "password",
        "secret",
        "authorization",
        "cookie",
        "objectkey",
        "apikey",
        "signedurl",
        "credential",
        "session",
    )
    return {
        str(key)[:80]: item
        for key, item in value.items()
        if not any(
            fragment in re.sub(r"[^a-z0-9]", "", str(key).casefold())
            for fragment in blocked_fragments
        )
        and isinstance(item, (str, int, float, bool, type(None)))
    }
