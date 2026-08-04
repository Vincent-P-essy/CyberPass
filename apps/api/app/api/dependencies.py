import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ACCESS_COOKIE, ORG_COOKIE, decode_access_token, verify_csrf
from app.models import Membership, Organization, Role, User

Db = Annotated[Session, Depends(get_db)]


def get_current_user(request: Request, db: Db) -> User:
    authorization = request.headers.get("Authorization", "")
    token: str | None = None
    if authorization:
        scheme, _, credential = authorization.partition(" ")
        if scheme.lower() != "bearer" or not credential:
            raise HTTPException(status_code=401, detail="Authentification invalide")
        token = credential
    else:
        token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = decode_access_token(token)
    user = db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if user is None:
        raise HTTPException(status_code=401, detail="Session invalide ou expirée")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@dataclass(frozen=True)
class TenantContext:
    organization: Organization
    membership: Membership

    @property
    def organization_id(self) -> uuid.UUID:
        return self.organization.id

    @property
    def role(self) -> Role:
        return self.membership.role


def get_tenant_context(
    request: Request,
    db: Db,
    user: CurrentUser,
    x_organization_id: Annotated[uuid.UUID | None, Header()] = None,
) -> TenantContext:
    requested_id = x_organization_id
    if requested_id is None:
        raw_cookie = request.cookies.get(ORG_COOKIE)
        if raw_cookie:
            try:
                requested_id = uuid.UUID(raw_cookie)
            except ValueError:
                requested_id = None

    query = (
        select(Membership, Organization)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(
            Membership.user_id == user.id,
            Membership.is_active.is_(True),
            Organization.deleted_at.is_(None),
        )
    )
    if requested_id is not None:
        query = query.where(Membership.organization_id == requested_id)
    rows = db.execute(query).all()
    if not rows:
        raise HTTPException(status_code=404, detail="Organisation introuvable")
    if requested_id is None and len(rows) != 1:
        raise HTTPException(status_code=400, detail="Sélectionnez une organisation active")
    membership, organization = rows[0]
    return TenantContext(organization=organization, membership=membership)


Tenant = Annotated[TenantContext, Depends(get_tenant_context)]


ROLE_LEVEL = {Role.VIEWER: 0, Role.ANALYST: 1, Role.ADMIN: 2, Role.OWNER: 3}


def require_min_role(minimum: Role) -> Callable[[TenantContext], TenantContext]:
    def dependency(tenant: Tenant) -> TenantContext:
        if ROLE_LEVEL[tenant.role] < ROLE_LEVEL[minimum]:
            raise HTTPException(status_code=403, detail="Autorisation insuffisante")
        return tenant

    return dependency


def require_csrf(request: Request) -> None:
    verify_csrf(request)


Csrf = Annotated[None, Depends(require_csrf)]
