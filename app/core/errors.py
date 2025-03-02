from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from loguru import logger

class ScolaiaError(Exception):
    """Base exception class for Scolaia application."""
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary format."""
        return {
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
            }
        }

class AuthenticationError(ScolaiaError):
    """Raised when authentication fails."""
    def __init__(
        self,
        message: str = "Authentication failed",
        error_code: str = "AUTH_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )

class ValidationError(ScolaiaError):
    """Raised when data validation fails."""
    def __init__(
        self,
        message: str = "Validation failed",
        error_code: str = "VALIDATION_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )

class DatabaseError(ScolaiaError):
    """Raised when database operations fail."""
    def __init__(
        self,
        message: str = "Database operation failed",
        error_code: str = "DB_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )

class OpenAIError(ScolaiaError):
    """Raised when OpenAI API operations fail."""
    def __init__(
        self,
        message: str = "OpenAI API operation failed",
        error_code: str = "OPENAI_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details
        )

async def handle_exception(error: Exception) -> Dict[str, Any]:
    """
    Central exception handler that processes all exceptions.
    Logs the error and returns appropriate error response.
    """
    if isinstance(error, ScolaiaError):
        logger.error(
            f"{error.__class__.__name__}: {error.message}",
            error_code=error.error_code,
            details=error.details
        )
        return error.to_dict()
    
    if isinstance(error, HTTPException):
        logger.error(f"HTTPException: {error.detail}")
        return {
            "error": {
                "code": "HTTP_ERROR",
                "message": error.detail,
                "status_code": error.status_code
            }
        }
    
    # Handle unexpected errors
    logger.exception("Unexpected error occurred")
    return {
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR
        }
    }
