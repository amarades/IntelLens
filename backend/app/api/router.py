from fastapi import APIRouter
from app.api.endpoints import research, chat, report

api_router = APIRouter()

# Register sub-routes
api_router.include_router(research.router, tags=["Research"])
api_router.include_router(chat.router, tags=["Chat"])
api_router.include_router(report.router, tags=["Report"])
