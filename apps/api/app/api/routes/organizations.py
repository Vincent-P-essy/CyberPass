import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select

from app.api.dependencies import Csrf, CurrentUser, Db, Tenant, TenantContext, require_min_role
from app.core.config import get_settings
from app.core.security import ORG_COOKIE, hash_token
from app.models import Invitation, Membership, Organization, Role, User
from app.schemas import (
    InvitationCreate,
    InvitationOut,
    MembershipRoleUpdate,
    Message,
    OrganizationCreate,
    OrganizationOut,
    OrganizationUpdate,
)
from app.services.audit import add_audit_event
from app.services.catalog import attach_framework_to_organization

router = APIRouter(prefix="/organizations", tags=["Organisations"])
settings = get_settings()


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.casefold()).strip("-")[:150]
    return slug or "organisation"


def _organization_out(organization: Organization, membership: Membership) -> OrganizationOut:
    return OrganizationOut(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        description=organization.description,
        role=membership.role,
        created_at=organization.created_at,
    )


@router.get("", response_model=list[OrganizationOut])
def list_organizations(user: CurrentUser, db: Db) -> list[OrganizationOut]:
    rows = db.execute(
        select(Organization, Membership)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(
            Membership.user_id == user.id,
            Membership.is_active.is_(True),
            Organization.deleted_at.is_(None),
        )
        .order_by(Organization.name)
    ).all()
    return [_organization_out(organization, membership) for organization, membership in rows]


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    request: Request,
    response: Response,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
) -> OrganizationOut:
    base_slug = _slugify(payload.name)
    slug = base_slug
    while db.scalar(select(Organization.id).where(Organization.slug == slug)):
        slug = f"{base_slug[:141]}-{secrets.token_hex(4)}"
    organization = Organization(
        name=payload.name.strip(),
        slug=slug,
        description=payload.description.strip() if payload.description else None,
    )
    db.add(organization)
    db.flush()
    membership = Membership(organization_id=organization.id, user_id=user.id, role=Role.OWNER)
    db.add(membership)
    attach_framework_to_organization(db, organization.id)
    add_audit_event(
        db,
        request,
        "organization.created",
        "organization",
        organization.id,
        organization_id=organization.id,
        user=user,
    )
    db.commit()
    response.set_cookie(
        ORG_COOKIE,
        str(organization.id),
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return _organization_out(organization, membership)


@router.post("/{organization_id}/select", response_model=OrganizationOut)
def select_organization(
    organization_id: uuid.UUID,
    response: Response,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
) -> OrganizationOut:
    row = db.execute(
        select(Organization, Membership)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(
            Organization.id == organization_id,
            Membership.user_id == user.id,
            Membership.is_active.is_(True),
            Organization.deleted_at.is_(None),
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Organisation introuvable")
    organization, membership = row
    response.set_cookie(
        ORG_COOKIE,
        str(organization.id),
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return _organization_out(organization, membership)


@router.get("/current", response_model=OrganizationOut)
def current_organization(tenant: Tenant) -> OrganizationOut:
    return _organization_out(tenant.organization, tenant.membership)


@router.patch("/current", response_model=OrganizationOut)
def update_organization(
    payload: OrganizationUpdate,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: TenantContext = Depends(require_min_role(Role.ADMIN)),
) -> OrganizationOut:
    values = payload.model_dump(exclude_unset=True)
    if "name" in values and values["name"] is not None:
        tenant.organization.name = values["name"].strip()
    if "description" in values:
        description = values["description"]
        tenant.organization.description = description.strip() if description else None
    add_audit_event(
        db,
        request,
        "organization.updated",
        "organization",
        tenant.organization_id,
        tenant.organization_id,
        user,
    )
    db.commit()
    return _organization_out(tenant.organization, tenant.membership)


@router.post(
    "/current/invitations", response_model=InvitationOut, status_code=status.HTTP_201_CREATED
)
def create_invitation(
    payload: InvitationCreate,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: TenantContext = Depends(require_min_role(Role.ADMIN)),
) -> InvitationOut:
    email = payload.email.lower().strip()
    if payload.role == Role.OWNER and tenant.role != Role.OWNER:
        raise HTTPException(
            status_code=403, detail="Seul un propriétaire peut inviter un propriétaire"
        )
    existing_user = db.scalar(select(User.id).where(func.lower(User.email) == email))
    if existing_user and db.scalar(
        select(Membership.id).where(
            Membership.organization_id == tenant.organization_id,
            Membership.user_id == existing_user,
        )
    ):
        raise HTTPException(status_code=409, detail="Cette personne est déjà membre")
    invitation = db.scalar(
        select(Invitation).where(
            Invitation.organization_id == tenant.organization_id,
            func.lower(Invitation.email) == email,
        )
    )
    if invitation is None:
        invitation = Invitation(
            organization_id=tenant.organization_id,
            email=email,
            role=payload.role,
            token_hash=hash_token(secrets.token_urlsafe(48)),
            expires_at=datetime.now(UTC) + timedelta(days=7),
            invited_by_id=user.id,
        )
        db.add(invitation)
    else:
        invitation.role = payload.role
        invitation.expires_at = datetime.now(UTC) + timedelta(days=7)
        invitation.token_hash = hash_token(secrets.token_urlsafe(48))
    add_audit_event(
        db,
        request,
        "membership.invited",
        "invitation",
        invitation.id,
        tenant.organization_id,
        user,
        {"role": payload.role.value},
    )
    db.commit()
    return InvitationOut.model_validate(invitation)


@router.patch("/current/members/{member_user_id}/role", response_model=Message)
def update_member_role(
    member_user_id: uuid.UUID,
    payload: MembershipRoleUpdate,
    request: Request,
    _csrf: Csrf,
    user: CurrentUser,
    db: Db,
    tenant: TenantContext = Depends(require_min_role(Role.OWNER)),
) -> Message:
    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == tenant.organization_id,
            Membership.user_id == member_user_id,
            Membership.is_active.is_(True),
        )
    )
    if membership is None:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    if membership.role == Role.OWNER and payload.role != Role.OWNER:
        owners = db.scalar(
            select(func.count())
            .select_from(Membership)
            .where(
                Membership.organization_id == tenant.organization_id,
                Membership.role == Role.OWNER,
                Membership.is_active.is_(True),
            )
        )
        if owners == 1:
            raise HTTPException(
                status_code=409, detail="L'organisation doit conserver un propriétaire"
            )
    old_role = membership.role
    membership.role = payload.role
    add_audit_event(
        db,
        request,
        "membership.role_changed",
        "membership",
        membership.id,
        tenant.organization_id,
        user,
        {"oldRole": old_role.value, "newRole": payload.role.value},
    )
    db.commit()
    return Message(message="Rôle mis à jour")
