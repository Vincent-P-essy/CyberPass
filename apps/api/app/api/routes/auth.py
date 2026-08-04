from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import func, select

from app.api.dependencies import CurrentUser, Db
from app.core.config import get_settings
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    clear_auth_cookies,
    client_key,
    create_access_token,
    hash_password,
    identity_key,
    issue_auth_cookies,
    new_csrf_token,
    rate_limiter,
    verify_csrf,
    verify_password,
)
from app.models import Membership, Organization, User
from app.schemas import (
    AuthResponse,
    LoginRequest,
    MembershipSummary,
    MeResponse,
    Message,
    RegisterRequest,
    UserSummary,
)
from app.services.audit import add_audit_event

router = APIRouter(prefix="/auth", tags=["Authentification"])
settings = get_settings()


def _auth_response(user: User, response: Response) -> AuthResponse:
    token, expires_in = create_access_token(user.id)
    csrf_token = new_csrf_token()
    issue_auth_cookies(response, token, csrf_token)
    return AuthResponse(
        access_token=token,
        expires_in=expires_in,
        csrf_token=csrf_token,
        user=UserSummary.model_validate(user),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest, request: Request, response: Response, db: Db
) -> AuthResponse:
    email = payload.email.lower().strip()
    rate_limiter.check(
        client_key(request, "auth-ip"),
        settings.auth_ip_rate_limit,
        settings.auth_rate_window_seconds,
    )
    rate_limiter.check(
        identity_key("register-identity", email),
        settings.auth_rate_limit,
        settings.auth_rate_window_seconds,
    )
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=409, detail="Un compte utilise déjà cette adresse")
    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    add_audit_event(db, request, "auth.register", "user", user.id, user=user)
    db.commit()
    return _auth_response(user, response)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Db) -> AuthResponse:
    email = payload.email.lower().strip()
    rate_limiter.check(
        client_key(request, "auth-ip"),
        settings.auth_ip_rate_limit,
        settings.auth_rate_window_seconds,
    )
    rate_limiter.check(
        identity_key("login-identity", email),
        settings.auth_rate_limit,
        settings.auth_rate_window_seconds,
    )
    user = db.scalar(select(User).where(func.lower(User.email) == email, User.is_active.is_(True)))
    if user is None or not verify_password(payload.password, user.password_hash):
        # Une durée minimale réduit les différences triviales entre les deux cas d'échec.
        if user is None:
            verify_password(payload.password, DUMMY_PASSWORD_HASH)
        raise HTTPException(status_code=401, detail="Adresse ou mot de passe incorrect")
    user.last_login_at = datetime.now(UTC)
    add_audit_event(db, request, "auth.login", "user", user.id, user=user)
    db.commit()
    return _auth_response(user, response)


@router.post("/logout", response_model=Message)
def logout(request: Request, response: Response) -> Message:
    verify_csrf(request)
    clear_auth_cookies(response)
    return Message(message="Session fermée")


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser, db: Db) -> MeResponse:
    rows = db.execute(
        select(Membership, Organization)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(
            Membership.user_id == user.id,
            Membership.is_active.is_(True),
            Organization.deleted_at.is_(None),
        )
        .order_by(Organization.name)
    ).all()
    return MeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        memberships=[
            MembershipSummary(
                organization_id=organization.id,
                organization_name=organization.name,
                role=membership.role,
            )
            for membership, organization in rows
        ],
    )
