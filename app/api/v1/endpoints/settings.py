from typing import Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, PlainTextResponse

from app.crud.crud_setting import setting
from app.crud import user
from app.api import deps
from app.models.user import User
from app.schemas.setting import Setting, SettingCreate, SettingUpdate
from app.core.security import encrypt_setting, decrypt_setting
from app.core.config import Settings
from app.core.email import send_test_email

router = APIRouter()

@router.get("/", response_model=List[Setting])
async def read_settings(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve settings. Only for superusers.
    """
    settings = await setting.get_multi(db, skip=skip, limit=limit)
    # We don't try to decrypt here, we just return the encrypted values
    return settings

@router.post("/", response_model=Setting)
async def create_setting(
    *,
    db: AsyncSession = Depends(deps.get_db),
    setting_in: SettingCreate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new setting. Only for superusers.
    """
    # Encrypt value if setting is marked as encrypted
    if setting_in.is_encrypted and setting_in.value:
        setting_in.value = encrypt_setting(setting_in.value)
    
    setting_obj = await setting.create(db, obj_in=setting_in)
    return setting_obj

@router.put("/{setting_id}", response_model=Setting)
async def update_setting(
    *,
    db: AsyncSession = Depends(deps.get_db),
    setting_id: int,
    setting_in: SettingUpdate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a setting. Only for superusers.
    """
    setting_obj = await setting.get(db, id=setting_id)
    if not setting_obj:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    # If the setting is encrypted and the value is being updated
    if setting_obj.is_encrypted and setting_in.value is not None:
        try:
            # If the current value is encrypted, we try to decrypt it first
            if setting_obj.value:
                try:
                    decrypt_setting(setting_obj.value)
                except ValueError:
                    # If it can't be decrypted, we assume the current value is not encrypted
                    pass
            # We encrypt the new value
            setting_in.value = encrypt_setting(setting_in.value)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error processing encrypted value: {str(e)}"
            )
    
    setting_obj = await setting.update(db, db_obj=setting_obj, obj_in=setting_in)
    return setting_obj

@router.get("/{setting_id}", response_model=Setting)
async def read_setting(
    *,
    db: AsyncSession = Depends(deps.get_db),
    setting_id: int,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get setting by ID. Only for superusers.
    """
    setting_obj = await setting.get(db, id=setting_id)
    if not setting_obj:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    # If it's an encrypted setting and it has a value, we try to decrypt it
    if setting_obj.is_encrypted and setting_obj.value:
        try:
            # We just check if it can be decrypted
            decrypt_setting(setting_obj.value)
        except ValueError:
            setting_obj.value = "ERROR: Could not decrypt value"
    
    return setting_obj

@router.get("/value/{setting_id}", response_model=str)
async def get_decrypted_value(
    *,
    db: AsyncSession = Depends(deps.get_db),
    setting_id: int,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get the decrypted value of a setting. Only for superusers.
    """
    setting_obj = await setting.get(db, id=setting_id)
    if not setting_obj:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    if not setting_obj.is_encrypted:
        raise HTTPException(status_code=400, detail="Setting is not encrypted")
    
    if not setting_obj.value:
        return ""
    
    try:
        # Return the decrypted value directly as str, without JSON formatting
        return PlainTextResponse(decrypt_setting(setting_obj.value))
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Could not decrypt setting value"
        )

@router.post("/test-email", response_model=dict)
async def test_email_configuration(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Test email configuration by sending a test email.
    """
    try:
        # Get email settings
        settings_list = await setting.get_multi(db)
        email_settings = {}
        
        for s in settings_list:
            if s.key.startswith("SMTP_"):
                if s.is_encrypted:
                    email_settings[s.key] = decrypt_setting(s.value)
                else:
                    email_settings[s.key] = s.value
        
        # Check if we have all required settings
        required_settings = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAILS_FROM_EMAIL"]
        missing_settings = [s for s in required_settings if s not in email_settings or not email_settings[s]]
        
        if missing_settings:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required email settings: {', '.join(missing_settings)}"
            )
        
        # Create settings object
        config = Settings()
        for key, value in email_settings.items():
            setattr(config, key, value)
        
        # Send test email to current user
        await send_test_email(email_to=current_user.email, settings=config)
        
        return {"message": f"Test email sent to {current_user.email}"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send test email: {str(e)}"
        )
