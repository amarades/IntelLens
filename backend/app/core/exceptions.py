from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.core.logging import logger

class IntelLensException(Exception):
    """Base exception class for all IntelLens application errors."""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

class ConfigurationError(IntelLensException):
    """Raised when environment variables or general application configuration is invalid."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CrawlerError(IntelLensException):
    """Raised when web scraping or link discovery fails critically."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_502_BAD_GATEWAY)

class SearchError(IntelLensException):
    """Raised when search engine (Serper.dev) queries fail."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_502_BAD_GATEWAY)

class AIServiceError(IntelLensException):
    """Raised when OpenRouter API encounters an error or returns invalid results."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_502_BAD_GATEWAY)

class ReportGenerationError(IntelLensException):
    """Raised when generating a PDF report fails."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

async def intellens_exception_handler(request: Request, exc: IntelLensException) -> JSONResponse:
    """
    Standard HTTP JSON response for handled IntelLens exceptions.
    """
    logger.error(
        f"Handled application exception: {exc.message}",
        extra={"status_code": exc.status_code, "path": request.url.path}
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "status": "error"}
    )

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all exception handler to avoid leaking internal error tracks.
    """
    logger.error(
        f"Unhandled system error: {str(exc)}",
        exc_info=True,
        extra={"path": request.url.path}
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred.", "status": "error"}
    )
