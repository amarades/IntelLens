from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import IntelLensException, intellens_exception_handler, global_exception_handler
from app.core.logging import logger

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    app.add_exception_handler(IntelLensException, intellens_exception_handler) # type: ignore
    app.add_exception_handler(Exception, global_exception_handler)

    # API routes registration
    from app.api.router import api_router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    @app.get("/health", tags=["Health"])
    def health_check():
        return {
            "status": "healthy",
            "project": settings.PROJECT_NAME,
            "version": "1.0.0"
        }

    logger.info("Application setup complete. Ready to serve requests.")
    return app

app = create_app()
