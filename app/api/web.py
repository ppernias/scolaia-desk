"""
Web routes for the Scolaia application.
These routes handle the web interface and template rendering.
"""

from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.templating import Jinja2Templates
from pathlib import Path

from app.api import deps
from app.models.user import User
from app.core.openai_settings import get_openai_settings
from app.crud.crud_setting import setting as setting_crud

# Initialize templates
templates = Jinja2Templates(directory="templates")

router = APIRouter()

@router.get("/", response_class=HTMLResponse)
async def root(
    request: Request,
    db: AsyncSession = Depends(deps.get_db)
):
    """Render the home page."""
    current_user = await deps.get_current_user_optional(request, db)
    
    # Get registration status
    registration_setting = await setting_crud.get_by_category_and_key(db, category="General", key="registration_open")
    registration_open = registration_setting and registration_setting.value.lower() == "true"
    
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "user": current_user,
            "registration_open": registration_open
        }
    )

@router.get("/chat", response_class=HTMLResponse)
async def chat(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Redirect to the WebSocket chat interface."""
    return RedirectResponse(url="/ws-chat", status_code=303)

@router.get("/stream-chat", response_class=HTMLResponse)
async def stream_chat_page(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Redirect to the WebSocket chat interface."""
    return RedirectResponse(url="/ws-chat", status_code=303)

@router.get("/ws-chat", response_class=HTMLResponse)
async def websocket_chat_page(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Render the WebSocket chat interface."""
    if not current_user.is_approved:
        return RedirectResponse(
            url="/?error=Your+account+is+pending+approval.+Please+wait+for+administrator+approval+to+access+the+chat.",
            status_code=303,
        )
    
    # Check if OpenAI API key is configured
    settings = await get_openai_settings(db)
    if not settings.get("OPENAI_API_KEY"):
        return RedirectResponse(
            url="/?error=Chat+is+not+available.+The+OpenAI+API+key+has+not+been+configured+yet.",
            status_code=303,
        )
    
    # Obtener el nombre del asistente desde la configuración
    assistant_name = settings.get("assistant_name", "PatricIA")
    
    return templates.TemplateResponse("websocket-chat.html", {
        "request": request, 
        "user": current_user,
        "assistant_name": assistant_name
    })

@router.get("/admin", response_class=HTMLResponse)
async def admin_panel(
    request: Request,
    current_user: User = Depends(deps.get_current_active_user)
):
    """Render the admin panel."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this page"
        )
    return templates.TemplateResponse(
        "admin.html",
        {"request": request, "user": current_user}
    )

@router.get("/neomorphic-chat", response_class=HTMLResponse)
async def neomorphic_chat(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Render the neomorphic chat interface."""
    if not current_user.is_approved:
        return RedirectResponse(
            url="/?error=Your+account+is+pending+approval.+Please+wait+for+administrator+approval+to+access+the+chat.",
            status_code=303,
        )
    
    # Check if OpenAI API key is configured
    settings = await get_openai_settings(db)
    if not settings.get("OPENAI_API_KEY"):
        return RedirectResponse(
            url="/?error=Chat+is+not+available.+The+OpenAI+API+key+has+not+been+configured+yet.",
            status_code=303,
        )
    
    # Obtener el nombre del asistente desde la configuración
    assistant_name = settings.get("assistant_name", "PatricIA")
    assistant_id = settings.get("assistant_id", "Unknown")
    
    return templates.TemplateResponse("neomorphic-chat.html", {
        "request": request, 
        "user": current_user,
        "assistant_name": assistant_name,
        "assistant_id": assistant_id
    })

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Render the login page."""
    return templates.TemplateResponse(
        "login.html",
        {"request": request}
    )

@router.get("/register", response_class=HTMLResponse)
async def register_page(
    request: Request,
    db: AsyncSession = Depends(deps.get_db)
):
    """Render the registration page."""
    # Check if registration is open
    registration_setting = await setting_crud.get_by_category_and_key(db, category="General", key="registration_open")
    registration_open = registration_setting and registration_setting.value.lower() == "true"
    
    if not registration_open:
        return RedirectResponse(
            url="/?error=Registration+is+currently+closed.",
            status_code=303
        )
    
    return templates.TemplateResponse(
        "register.html",
        {"request": request}
    )

@router.get("/forgot-password", response_class=HTMLResponse)
async def forgot_password_page(
    request: Request,
    db: AsyncSession = Depends(deps.get_db)
):
    """Render the forgot password page."""
    # Get registration status for the base template
    registration_setting = await setting_crud.get_by_category_and_key(db, category="General", key="registration_open")
    registration_open = registration_setting and registration_setting.value.lower() == "true"
    
    return templates.TemplateResponse(
        "forgot_password.html",
        {
            "request": request,
            "registration_open": registration_open
        }
    )

@router.get("/reset-password", response_class=HTMLResponse)
async def reset_password_page(
    request: Request,
    token: str,
    db: AsyncSession = Depends(deps.get_db)
):
    """Render the reset password page."""
    # Get registration status for the base template
    registration_setting = await setting_crud.get_by_category_and_key(db, category="General", key="registration_open")
    registration_open = registration_setting and registration_setting.value.lower() == "true"
    
    # Validate token (but don't reveal if it's invalid to prevent user enumeration)
    email = deps.security.verify_password_reset_token(token)
    token_valid = email is not None
    
    return templates.TemplateResponse(
        "reset_password.html",
        {
            "request": request,
            "token": token,
            "token_valid": token_valid,
            "registration_open": registration_open
        }
    )
