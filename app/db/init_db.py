import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import setting
from app.core.config import settings
from app.schemas.setting import SettingCreate
from app.core.security import encrypt_setting

async def init_db(db: AsyncSession) -> None:
    # Create default settings if they don't exist
    default_settings = [
        # Security settings
        {"category": "Security", "key": "ACCESS_TOKEN_EXPIRE_MINUTES", "value": str(settings.ACCESS_TOKEN_EXPIRE_MINUTES), "is_encrypted": False},
        
        # Email settings
        # General SMTP Configuration
        {"category": "Email Configuration", "key": "smtp_host", "value": settings.SMTP_HOST, "is_encrypted": False},
        {"category": "Email Configuration", "key": "smtp_tls_port", "value": str(settings.SMTP_TLS_PORT), "is_encrypted": False},
        {"category": "Email Configuration", "key": "smtp_ssl_port", "value": str(settings.SMTP_SSL_PORT), "is_encrypted": False},
        {"category": "Email Configuration", "key": "smtp_safe_connection", "value": settings.SMTP_SAFE_CONNECTION, "is_encrypted": False},
        {"category": "Email Configuration", "key": "smtp_auth_required", "value": settings.SMTP_AUTH_REQUIRED, "is_encrypted": False},

        # Authentication Credentials
        {"category": "Email Configuration", "key": "smtp_user", "value": settings.SMTP_USER, "is_encrypted": False},
        {"category": "Email Configuration", "key": "smtp_password", "value": settings.SMTP_PASSWORD, "is_encrypted": True},

        # Sender Configuration
        {"category": "Email Configuration", "key": "smtp_from_email", "value": settings.SMTP_FROM_EMAIL, "is_encrypted": False},
        {"category": "Email Configuration", "key": "smtp_from_name", "value": settings.SMTP_FROM_NAME, "is_encrypted": False},
        {"category": "Email Configuration", "key": "smtp_subject", "value": settings.SMTP_SUBJECT, "is_encrypted": False},
        {"category": "Email Configuration", "key": "smtp_signature", "value": settings.SMTP_SIGNATURE, "is_encrypted": False},

        # Advanced Security Options
        {"category": "Email Configuration", "key": "smtp_tls_required", "value": settings.SMTP_TLS_REQUIRED, "is_encrypted": False},
        {"category": "Email Configuration", "key": "smtp_ssl_required", "value": settings.SMTP_SSL_REQUIRED, "is_encrypted": False},
        
        # General settings
        {"category": "General", "key": "registration_open", "value": str(settings.REGISTRATION_OPEN).lower(), "is_encrypted": False},
        {"category": "General", "key": "welcome_message", "value": settings.WELCOME_MESSAGE, "is_encrypted": False},
        {"category": "General", "key": "owner_name", "value": settings.OWNER_NAME, "is_encrypted": False},
        {"category": "General", "key": "owner_email", "value": settings.OWNER_EMAIL, "is_encrypted": False},
        {"category": "General", "key": "server_host", "value": settings.SERVER_HOST, "is_encrypted": False},
        
        # OpenAI settings
        {"category": "OpenAI", "key": "model", "value": settings.MODEL, "is_encrypted": False},
        {"category": "OpenAI", "key": "temperature", "value": str(settings.TEMPERATURE), "is_encrypted": False},
        {"category": "OpenAI", "key": "max_tokens", "value": str(settings.MAX_TOKENS), "is_encrypted": False},
        {"category": "OpenAI", "key": "max_history_messages", "value": "10", "is_encrypted": False},
        {"category": "OpenAI", "key": "OPENAI_API_KEY", "value": settings.OPENAI_API_KEY, "is_encrypted": True},
    ]

    for setting_data in default_settings:
        existing_setting = await setting.get_by_category_and_key(
            db, category=setting_data["category"], key=setting_data["key"]
        )
        if not existing_setting:
            # Encrypt sensitive values
            if setting_data["is_encrypted"] and setting_data["value"]:
                setting_data["value"] = encrypt_setting(setting_data["value"])
            
            setting_in = SettingCreate(**setting_data)
            await setting.create(db, obj_in=setting_in)

if __name__ == "__main__":
    asyncio.run(init_db())
