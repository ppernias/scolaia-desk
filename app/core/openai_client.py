"""
OpenAI Client Integration Module

This module provides the core functionality for integrating OpenAI's services into the Scolaia application.
It handles the creation and configuration of the AsyncOpenAI client using application settings.
The implementation uses the official OpenAI Python client library with async support for optimal performance.
"""

from openai import AsyncOpenAI
from app.core.openai_settings import get_openai_settings
from sqlalchemy.ext.asyncio import AsyncSession

async def get_openai_client(db: AsyncSession) -> AsyncOpenAI:
    """
    Create and configure an asynchronous OpenAI client instance.

    This function retrieves the OpenAI API key from application settings and initializes
    an async-compatible OpenAI client. It ensures proper configuration for making API
    calls to OpenAI services.

    Args:
        db (AsyncSession): Asynchronous database session for retrieving settings

    Returns:
        AsyncOpenAI: Configured asynchronous OpenAI client instance

    Raises:
        ValueError: If the OpenAI API key is not found in settings

    Notes:
        - Uses async/await for non-blocking operations
        - API key is retrieved from application settings for security
        - Returns a reusable client instance for making OpenAI API calls
    """
    settings = await get_openai_settings(db)
    api_key = settings.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API key not found in settings")
        
    # Crear el cliente OpenAI
    return AsyncOpenAI(api_key=api_key)
