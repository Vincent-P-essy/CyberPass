import uuid
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.security import safe_metadata
from app.models import AuditEvent, User


def add_audit_event(
    db: Session,
    request: Request,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | str | None,
    organization_id: uuid.UUID | None = None,
    user: User | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditEvent:
    event = AuditEvent(
        organization_id=organization_id,
        user_id=user.id if user else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        ip_address=request.client.host[:64] if request.client else None,
        user_agent=request.headers.get("User-Agent", "")[:512] or None,
        event_metadata=safe_metadata(metadata),
    )
    db.add(event)
    return event
