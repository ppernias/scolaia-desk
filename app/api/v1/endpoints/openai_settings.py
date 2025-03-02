from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.core.openai_settings import load_available_models, get_openai_settings

router = APIRouter()

@router.get("/models", response_model=List[dict])
async def get_available_models(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Load available models from OpenAI API. Only for admins.
    """
    models = await load_available_models(db)
    return models

@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get OpenAI assistant settings from the database.
    Only returns non-sensitive settings needed for chat functionality.
    """
    settings = await get_openai_settings(db)
    return {
        "assistant_id": settings.get("assistant_id"),
        "assistant_name": settings.get("assistant_name"),
        "assistant_model": settings.get("assistant_model")
    }
