from fastapi import APIRouter

from app.api.routes import (
    auth,
    controls,
    evidences,
    operations,
    organizations,
    questionnaires,
    shares,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(controls.router)
api_router.include_router(evidences.router)
api_router.include_router(questionnaires.router)
api_router.include_router(shares.router)
api_router.include_router(operations.router)
