from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, asc, cast, DateTime, case, and_
from app.api.deps import get_current_active_superuser, get_current_active_user
from app.crud.crud_user import user
from app.db.session import get_db
from app.schemas.user import User, UserUpdate
from app.models.user import User as UserModel
from app.crud import user, setting
from app.core.email import send_email
from app.core.config import settings

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    sort_by: str = Query("id", description="Field to sort by"),
    sort_order: str = Query("asc", description="Sort order (asc or desc)"),
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Retrieve users with pagination, sorting and total count. Only for superusers.
    Supports pagination, sorting and search by name or email.
    """
    # Validate sort parameters
    valid_sort_fields = {
        "id": UserModel.id,
        "fullname": func.lower(UserModel.fullname),
        "email": func.lower(UserModel.email),
        "status": case(
            (and_(UserModel.is_active.is_(True), UserModel.is_approved.is_(True)), '1_Active'),
            (and_(UserModel.is_active.is_(False), UserModel.is_approved.is_(True)), '2_Inactive'),
            else_='3_Pending Approval'
        ),
        "is_admin": UserModel.is_admin,
        "creation_date": cast(UserModel.creation_date, DateTime),
        "last_login": cast(UserModel.last_login, DateTime),
        "token_count": UserModel.token_count
    }

    if sort_by not in valid_sort_fields:
        sort_by = "id"
    
    sort_field = valid_sort_fields[sort_by]
    sort_func = desc if sort_order.lower() == "desc" else asc

    # Base query
    query = select(UserModel)
    count_query = select(func.count(UserModel.id))

    # Apply search filter if provided
    if search:
        search_filter = or_(
            UserModel.email.ilike(f"%{search}%"),
            UserModel.fullname.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Get total count
    result = await db.execute(count_query)
    total = result.scalar()

    # Apply sorting and pagination
    # Add secondary sort by ID to ensure consistent ordering
    query = query.order_by(sort_func(sort_field), UserModel.id)
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Convert SQLAlchemy models to Pydantic models
    user_list = [
        User(
            id=u.id,
            email=u.email,
            fullname=u.fullname,
            is_active=u.is_active,
            is_admin=u.is_admin,
            is_approved=u.is_approved,
            creation_date=u.creation_date,
            last_login=u.last_login,
            token_count=u.token_count
        ) for u in users
    ]
    
    return {
        "users": user_list,
        "total": total
    }

@router.get("/me", response_model=User)
async def read_user_me(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.put("/me", response_model=User)
async def update_user_me(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update own user profile.
    
    Allows users to update their own profile information including password.
    Password is automatically hashed before storage.
    """
    user_obj = await user.get(db, id=current_user.id)
    if not user_obj:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )
    
    # Update the user
    user_obj = await user.update(db, db_obj=user_obj, obj_in=user_in)
    
    return User(
        id=user_obj.id,
        email=user_obj.email,
        fullname=user_obj.fullname,
        is_active=user_obj.is_active,
        is_admin=user_obj.is_admin,
        is_approved=user_obj.is_approved,
        creation_date=user_obj.creation_date,
        last_login=user_obj.last_login,
        token_count=user_obj.token_count
    )

@router.put("/{user_id}", response_model=User)
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Update a user. Only for superusers.
    """
    user_obj = await user.get(db, id=user_id)
    if not user_obj:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )
    
    # Guardar el estado de aprobación antes de la actualización
    was_approved_before = user_obj.is_approved
    
    # Actualizar el usuario
    user_obj = await user.update(db, db_obj=user_obj, obj_in=user_in)
    
    # Comprobar si el usuario ha sido aprobado en esta actualización
    if not was_approved_before and user_obj.is_approved:
        # El usuario ha sido aprobado, enviar correo de confirmación al administrador
        try:
            # Obtener configuración de correo electrónico
            email_settings = await setting.get_by_category(db, "Email Configuration")
            settings_dict = {s.key: s.value for s in email_settings}
            
            # Obtener configuración general
            general_settings = await setting.get_by_category(db, "General")
            settings_dict.update({s.key: s.value for s in general_settings})
            
            # Obtener la URL base de la configuración
            base_url = settings_dict.get("server_host", settings_dict.get("SERVER_HOST", "http://localhost:8000"))
            
            # Asegurarse de que la URL esté correctamente formada
            admin_url = base_url
            if not admin_url.startswith('http'):
                admin_url = f"http://{admin_url}"
            
            # Eliminar barras diagonales finales si existen
            admin_url = admin_url.rstrip('/')
            
            # Contenido del correo electrónico
            admin_email_content = f"""
            Dear Administrator,
            
            This is a confirmation that the user account for {user_obj.fullname} ({user_obj.email}) has been successfully activated.
            
            The account was activated by: {current_user.fullname} ({current_user.email})
            Activation time: {user_obj.creation_date}
            
            The user has been notified and can now access the system.
            
            You can access the system at: {admin_url}
            
            Best regards,
            ScolaIA System
            """
            
            # Enviar correo electrónico al administrador actual
            await send_email(
                email_to=current_user.email,
                subject="ScolaIA - User Activation Confirmation",
                content=admin_email_content,
                settings_dict=settings_dict
            )
        except Exception as e:
            # Log the error but don't fail the update process
            print(f"Error sending confirmation email to admin: {str(e)}")
    
    return User(
        id=user_obj.id,
        email=user_obj.email,
        fullname=user_obj.fullname,
        is_active=user_obj.is_active,
        is_admin=user_obj.is_admin,
        is_approved=user_obj.is_approved,
        creation_date=user_obj.creation_date,
        last_login=user_obj.last_login,
        token_count=user_obj.token_count
    )

@router.delete("/{user_id}", response_model=User)
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Delete a user. Only for superusers.
    """
    user_obj = await user.get(db, id=user_id)
    if not user_obj:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )
    user_obj = await user.remove(db, id=user_id)
    return User(
        id=user_obj.id,
        email=user_obj.email,
        fullname=user_obj.fullname,
        is_active=user_obj.is_active,
        is_admin=user_obj.is_admin,
        is_approved=user_obj.is_approved,
        creation_date=user_obj.creation_date,
        last_login=user_obj.last_login,
        token_count=user_obj.token_count
    )

@router.post("/{user_id}/send-approval-email", response_model=dict)
async def send_approval_email(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Send approval email to user.
    """
    # Obtener el usuario directamente de la base de datos para tener el estado más reciente
    stmt = select(UserModel).where(UserModel.id == user_id)
    result = await db.execute(stmt)
    user_obj = result.scalar_one_or_none()

    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user_obj.is_approved:
        raise HTTPException(status_code=400, detail="User is not approved")
    
    # Get email settings
    email_settings = await setting.get_by_category(db, "Email Configuration")
    settings_dict = {s.key: s.value for s in email_settings}
    
    # Get base URL from general settings
    general_settings = await setting.get_by_category(db, "General")
    base_url = next((s.value for s in general_settings if s.key.lower() == "server_host"), "http://localhost:8000")
    
    # Compose email content
    content = f"""
    Dear {user_obj.fullname},
    
    Your request to access ScolaIA has been approved. You can now log in with your credentials. (email & password)
    your email: {user_obj.email}
    
    Click here to access ScolaIA: {base_url}
    
    Best regards,
    ScolaIA Team
    """
    
    try:
        await send_email(
            email_to=user_obj.email,
            subject="ScolaIA Access Approved",
            content=content,
            settings_dict=settings_dict
        )
        return {"status": "success", "message": "Approval email sent successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send approval email: {str(e)}"
        )
