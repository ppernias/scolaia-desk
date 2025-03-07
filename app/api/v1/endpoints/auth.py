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
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user
from app.core import security
from app.core.config import settings
from app.crud.crud_user import user
from app.crud.crud_setting import setting as setting_crud
from app.schemas.token import Token
from app.schemas.user import User, UserCreate
from app.db.session import get_db
from app.models.user import User as UserModel
from app.core.email import send_email

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
        - Sends notification emails to both the user and administrators
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
    
    # Create the user
    user_obj = await user.create(db, obj_in=user_in)
    
    # Get email settings
    email_settings = await setting_crud.get_by_category(db, "Email Configuration")
    settings_dict = {s.key: s.value for s in email_settings}
    
    # Get general settings
    general_settings = await setting_crud.get_by_category(db, "General")
    settings_dict.update({s.key: s.value for s in general_settings})
    
    # Get base URL from settings
    base_url = settings_dict.get("server_host", settings_dict.get("SERVER_HOST", "http://localhost:8000"))
    
    # Only send notification emails if the user is not automatically approved (not the first user)
    if not user_obj.is_approved:
        try:
            # Send email to the user informing them that their account is pending approval
            user_email_content = f"""
            Dear {user_obj.fullname},
            
            Thank you for registering with ScolaIA. Your account has been created successfully, but it is pending approval by an administrator.
            
            Once your account is approved, you will receive another email notification and will be able to log in to the system.
            
            Your email: {user_obj.email}
            
            Best regards,
            ScolaIA Team
            """
            
            await send_email(
                email_to=user_obj.email,
                subject="ScolaIA - Account Registration Pending Approval",
                content=user_email_content,
                settings_dict=settings_dict
            )
            
            # Find admin users to notify
            stmt = select(UserModel).where(UserModel.is_admin == True)
            result = await db.execute(stmt)
            admin_users = result.scalars().all()
            
            # Send email to all administrators
            for admin in admin_users:
                # Asegurarse de que la URL esté correctamente formada
                admin_url = base_url
                if not admin_url.startswith('http'):
                    admin_url = f"http://{admin_url}"
                
                # Eliminar barras diagonales finales si existen
                admin_url = admin_url.rstrip('/')
                
                admin_email_content = f"""
                Dear Administrator,
                
                A new user has registered with ScolaIA and is pending approval:
                
                Name: {user_obj.fullname}
                Email: {user_obj.email}
                Registration time: {user_obj.creation_date}
                
                Please review the users table in the admin panel to approve or reject this registration:
                {admin_url}
                
                Best regards,
                ScolaIA System
                """
                
                await send_email(
                    email_to=admin.email,
                    subject="ScolaIA - New User Registration Pending Approval",
                    content=admin_email_content,
                    settings_dict=settings_dict
                )
        except Exception as e:
            # Log the error but don't fail the registration process
            print(f"Error sending notification emails: {str(e)}")
    
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
