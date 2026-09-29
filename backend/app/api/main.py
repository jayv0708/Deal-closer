from fastapi import APIRouter
from app.api.routes import auth, projects, properties, documents, crm, analytics, voice, public

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(properties.router, prefix="/properties", tags=["properties"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(crm.router, prefix="/crm", tags=["crm"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(voice.router, prefix="/voice", tags=["voice"])
api_router.include_router(public.router, prefix="/public", tags=["public"])
