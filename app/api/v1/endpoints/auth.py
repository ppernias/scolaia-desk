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

from datetime import timedelta, datetime
import re
from typing import Any, List, Dict
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
from app.schemas.user import User, UserCreate, PasswordResetRequest, PasswordReset, PasswordResetResponse
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


@router.post("/password-reset-request", response_model=PasswordResetResponse)
async def request_password_reset(
    *,
    db: AsyncSession = Depends(get_db),
    request_data: PasswordResetRequest,
) -> Any:
    """
    Request a password reset for a user account.

    Args:
        db: Database session dependency
        request_data: Contains the email address for the account to reset

    Returns:
        PasswordResetResponse: A message indicating the result of the operation

    Notes:
        - Always returns a success message even if the email doesn't exist for security reasons
        - Sends an email with a password reset link if the account exists
        - The reset link contains a secure token that expires after 24 hours
    """
    # Find the user by email
    user_obj = await user.get_by_email(db, email=request_data.email)
    
    # If user exists and is active, send reset email
    if user_obj and user_obj.is_active:
        # Generate a password reset token
        token = security.generate_password_reset_token(request_data.email)
        
        # Get email settings
        email_settings = await setting_crud.get_by_category(db, "Email Configuration")
        settings_dict = {s.key: s.value for s in email_settings}
        
        # Get general settings
        general_settings = await setting_crud.get_by_category(db, "General")
        settings_dict.update({s.key: s.value for s in general_settings})
        
        # Get base URL from settings
        base_url = settings_dict.get("server_host", settings_dict.get("SERVER_HOST", "http://localhost:8000"))
        
        # Ensure URL is properly formatted
        if not base_url.startswith('http'):
            # Use the same protocol as the request
            # Default to HTTP if we can't determine
            base_url = f"http://{base_url}"
        
        # Remove trailing slashes
        base_url = base_url.rstrip('/')
        
        # For local development, ensure we're using HTTP to avoid SSL errors
        if 'localhost' in base_url or '127.0.0.1' in base_url or '0.0.0.0' in base_url:
            base_url = base_url.replace('https://', 'http://')
        
        # For IP addresses, also use HTTP to avoid SSL errors
        if re.match(r'https?://\d+\.\d+\.\d+\.\d+', base_url):
            base_url = base_url.replace('https://', 'http://')
        
        # Create reset link
        reset_link = f"{base_url}/reset-password?token={token}"
        
        # Create email content
        email_content = f"""
        Dear {user_obj.fullname},
        
        We received a request to reset your password for your ScolaIA account.
        
        To reset your password, please click on the following link or copy and paste it into your browser:
        {reset_link}
        
        This link will expire in 24 hours.
        
        If you did not request a password reset, please ignore this email or contact support if you have concerns.
        
        Best regards,
        ScolaIA Team
        """
        
        try:
            # Send the email
            await send_email(
                email_to=user_obj.email,
                subject="ScolaIA - Password Reset Request",
                content=email_content,
                settings_dict=settings_dict
            )
        except Exception as e:
            # Log the error but don't expose it to the user
            print(f"Error sending password reset email: {str(e)}")
    
    # Send notification to all administrators
    try:
        # Find admin users to notify
        stmt = select(UserModel).where(UserModel.is_admin == True)
        result = await db.execute(stmt)
        admin_users = result.scalars().all()
        
        if user_obj and user_obj.is_active and admin_users:
            # Send email to all administrators
            for admin in admin_users:
                # Create admin notification content
                admin_notification = f"""
                Dear Administrator,
                
                A password reset has been requested for the following account:
                
                Name: {user_obj.fullname}
                Email: {request_data.email}
                Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                
                This is an automated security notification.
                No action is required from you, but you may want to verify this activity
                if it appears suspicious.
                
                Best regards,
                ScolaIA System
                """
                
                # Send notification to admin
                await send_email(
                    email_to=admin.email,
                    subject="ScolaIA - Password Reset Request Alert",
                    content=admin_notification,
                    settings_dict=settings_dict
                )
    except Exception as e:
        # Log the error but don't expose it to the user
        print(f"Error sending admin notification: {str(e)}")
    
    # Always return a success message for security reasons
    # This prevents user enumeration attacks
    return {"message": "If the email exists in our system, a password reset link has been sent."}


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(
    *,
    db: AsyncSession = Depends(get_db),
    reset_data: PasswordReset,
) -> Any:
    """
    Reset a user's password using a valid reset token.

    Args:
        db: Database session dependency
        reset_data: Contains the reset token and new password

    Returns:
        PasswordResetResponse: A message indicating the result of the operation

    Raises:
        HTTPException: 
            - 400 if the token is invalid or expired
            - 404 if the user associated with the token doesn't exist

    Notes:
        - Verifies the token is valid and not expired
        - Updates the user's password with a new hash
        - Invalidates the token after successful use
    """
    # Verify the token and get the email
    email = security.verify_password_reset_token(reset_data.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )
    
    # Find the user by email
    user_obj = await user.get_by_email(db, email=email)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Update the user's password
    user_update = {"password": reset_data.password}
    await user.update(db, db_obj=user_obj, obj_in=user_update)
    
    # Get email settings for confirmation email
    email_settings = await setting_crud.get_by_category(db, "Email Configuration")
    settings_dict = {s.key: s.value for s in email_settings}
    
    # Get general settings
    general_settings = await setting_crud.get_by_category(db, "General")
    settings_dict.update({s.key: s.value for s in general_settings})
    
    # Create confirmation email content
    email_content = f"""
    Dear {user_obj.fullname},
    
    Your password for ScolaIA has been successfully reset.
    
    If you did not make this change, please contact support immediately.
    
    Best regards,
    ScolaIA Team
    """
    
    try:
        # Send confirmation email
        await send_email(
            email_to=user_obj.email,
            subject="ScolaIA - Password Reset Successful",
            content=email_content,
            settings_dict=settings_dict
        )
    except Exception as e:
        # Log the error but continue with the response
        print(f"Error sending password reset confirmation email: {str(e)}")
    
    # Send notification to all administrators about successful password reset
    try:
        # Find admin users to notify
        stmt = select(UserModel).where(UserModel.is_admin == True)
        result = await db.execute(stmt)
        admin_users = result.scalars().all()
        
        if user_obj and admin_users:
            # Send email to all administrators
            for admin in admin_users:
                # Create admin notification content
                admin_notification = f"""
                Dear Administrator,
                
                A password has been successfully reset for the following account:
                
                Name: {user_obj.fullname}
                Email: {user_obj.email}
                Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                
                This is an automated security notification.
                No action is required from you, but you may want to verify this activity
                if it appears suspicious.
                
                Best regards,
                ScolaIA System
                """
                
                # Send notification to admin
                await send_email(
                    email_to=admin.email,
                    subject="ScolaIA - Password Reset Completed Alert",
                    content=admin_notification,
                    settings_dict=settings_dict
                )
    except Exception as e:
        # Log the error but continue with the response
        print(f"Error sending admin notification for password reset completion: {str(e)}")
    
    return {"message": "Password has been reset successfully."}
