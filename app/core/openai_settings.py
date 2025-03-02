"""
OpenAI Settings Management Module

This module handles the configuration and management of OpenAI-related settings in the Scolaia application.
It provides functionality for securely storing and retrieving OpenAI API credentials and configuration,
as well as interfacing with the OpenAI API for model information.

The module implements secure handling of sensitive credentials through encryption and proper
error handling for API interactions.
"""

from typing import List, Optional
from fastapi import HTTPException
import httpx
from app.crud.crud_setting import setting
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decrypt_setting

async def get_openai_settings(db: AsyncSession) -> dict:
    """
    Retrieve and decrypt OpenAI settings from the database.

    This function fetches all OpenAI-related settings from the database and handles
    the decryption of sensitive values like API keys.

    Args:
        db (AsyncSession): Asynchronous database session

    Returns:
        dict: Dictionary containing all OpenAI settings with decrypted values

    Raises:
        HTTPException: If decryption of any encrypted setting fails

    Notes:
        - Settings are stored in the 'OpenAI' category
        - Sensitive values are stored encrypted in the database
        - Decryption is handled automatically for encrypted settings
    """
    settings_list = await setting.get_by_category(db, "OpenAI")
    settings_dict = {}
    for s in settings_list:
        if s.is_encrypted:
            try:
                settings_dict[s.key] = decrypt_setting(s.value)
            except ValueError:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to decrypt setting: {s.key}"
                )
        else:
            settings_dict[s.key] = s.value
    return settings_dict

async def load_available_models(db: AsyncSession) -> List[dict]:
    """
    Fetch available models from the OpenAI API.

    This function makes an authenticated request to the OpenAI API to retrieve
    the list of available models that can be used with the configured API key.

    Args:
        db (AsyncSession): Asynchronous database session for retrieving API credentials

    Returns:
        List[dict]: List of available models with their details

    Raises:
        HTTPException: 
            - 400 if OpenAI API key is not configured
            - Various status codes for API-related errors
            - 500 for unexpected errors during API communication

    Notes:
        - Uses async HTTP client for non-blocking API calls
        - Automatically includes authentication headers
        - Provides detailed error messages from the OpenAI API
    """
    settings = await get_openai_settings(db)
    
    if not settings.get("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=400,
            detail="OpenAI API key not configured in settings"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={
                    "Authorization": f"Bearer {settings['OPENAI_API_KEY']}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code != 200:
                error_detail = response.json().get("error", {}).get("message", "Unknown error")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"OpenAI API error: {error_detail}"
                )
            
            models_data = response.json()
            return [{"id": model["id"], "name": model["id"]} for model in models_data["data"]]
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error connecting to OpenAI API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading OpenAI models: {str(e)}"
        )
