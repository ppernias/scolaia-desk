"""
Main API Router Configuration Module

This module configures the main API router for the Scolaia application, organizing all API endpoints
into logical groups with appropriate URL prefixes and tags. The router structure follows RESTful
principles and provides clear separation of concerns.

Available Endpoints:
- /auth: Authentication and authorization endpoints
- /chat: Real-time chat and messaging functionality
- /users: User management and profile operations
- /settings: Application-wide settings management
- /settings/openai: OpenAI integration configuration
- /adl: ADL (Activity of Daily Living) related operations
- /assistants: AI assistant management and interactions

Each router group is tagged appropriately for clear API documentation and organization.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, chat, users, settings, openai_settings, adl, assistants

# Main API router that combines all endpoint groups
api_router = APIRouter()

# Register all endpoint groups with their respective prefixes and tags
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(openai_settings.router, prefix="/settings/openai", tags=["settings"])
api_router.include_router(adl.router, prefix="/adl", tags=["adl"])
api_router.include_router(assistants.router, prefix="/assistants", tags=["assistants"])
