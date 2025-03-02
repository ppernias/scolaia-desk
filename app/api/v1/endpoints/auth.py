"""
Authentication Endpoints Module

This module handles all authentication-related operations including user login, registration,
and registration status checks. It implements secure authentication using OAuth2 with JWT tokens
and provides proper error handling for various authentication scenarios.

Endpoints:
- POST /login: Authenticate users and issue JWT tokens
- POST /register: Create new user accounts when registration is open
- GET /registration-status: Check if new user registration is currently allowed

The module implements security best practices including:
- Secure password handling
- JWT token-based authentication
- Rate limiting (via middleware)
- Account status verification
"""

from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.core import security
from app.core.config import settings
from app.crud.crud_user import user
from app.crud.crud_setting import setting as setting_crud
from app.schemas.token import Token
from app.schemas.user import User, UserCreate
from app.db.session import get_db
from app.models.user import User as UserModel

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    Authenticate user and generate JWT token.

    Args:
        db: Database session dependency
        form_data: OAuth2 compatible form containing username (email) and password

    Returns:
        Token: JWT access token with bearer type and approval status

    Raises:
        HTTPException: 
            - 401 if credentials are invalid
            - 401 if account is inactive
    
    Notes:
        - Username field is used for email address
        - Tokens are generated with configurable expiration time
        - Last login timestamp is updated on successful authentication
    """
    user_obj = await user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user_obj.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive",
        )
        
    # Generate token even if not approved, but include approval status
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user_obj.id, expires_delta=access_token_expires
    )
    
    # Update last login
    await user.update_login(db, db_obj=user_obj)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_approved": user_obj.is_approved
    }

@router.post("/register", response_model=User)
async def register(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    """
    Register a new user account.

    Args:
        db: Database session dependency
        user_in: User creation data including email and password

    Returns:
        User: Created user object

    Raises:
        HTTPException:
            - 403 if registration is currently closed
            - 400 if email already exists

    Notes:
        - Registration availability is controlled by system settings
        - Passwords are automatically hashed before storage
        - New accounts may require admin approval based on system configuration
    """
    # Check if registration is open
    registration_setting = await setting_crud.get_by_category_and_key(db, category="General", key="registration_open")
    if not registration_setting or registration_setting.value.lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently closed.",
        )

    user_obj = await user.get_by_email(db, email=user_in.email)
    if user_obj:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user_obj = await user.create(db, obj_in=user_in)
    return user_obj

@router.get("/registration-status")
async def get_registration_status(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Check if new user registration is currently allowed.

    Args:
        db: Database session dependency

    Returns:
        dict: Contains boolean 'is_open' indicating if registration is allowed

    Notes:
        - Status is controlled by the 'registration_open' setting in General category
        - Returns False if setting is missing or set to any value other than 'true'
    """
    registration_setting = await setting_crud.get_by_category_and_key(db, category="General", key="registration_open")
    is_open = registration_setting and registration_setting.value.lower() == "true"
    return {"is_open": is_open}
