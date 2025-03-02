import secrets
from pathlib import Path
from typing import Optional, List
from pydantic import EmailStr
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "ScolaIA"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Base URL
    # SERVER_HOST: str = "http://localhost:8000"  # Default for development
    SERVER_HOST: str = "https://localhost:8000"  # Use HTTPS for production

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{Path(__file__).parent.parent.parent}/scolaia.db"
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = ["*"]  # Default to allow all origins for development
    
    # Email Configuration
    # General SMTP Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_TLS_PORT: int = 587
    SMTP_SSL_PORT: int = 465
    SMTP_SAFE_CONNECTION: str = "yes"
    SMTP_AUTH_REQUIRED: str = "yes"

    # Authentication Credentials
    SMTP_USER: str = "your-email@gmail.com"
    SMTP_PASSWORD: str = "your-app-specific-password"

    # Sender Configuration
    SMTP_FROM_EMAIL: EmailStr = "your-email@gmail.com"
    SMTP_FROM_NAME: str = "ScolaIA Admin"
    SMTP_SUBJECT: str = "no-reply. Automatic email sent by ScolaIA"
    SMTP_SIGNATURE: str = "By ScolaIA team. if you have received this mail by mistake, please contact to admin@scolaia.net\nScolaIA Team"

    # Advanced Security Options
    SMTP_TLS_REQUIRED: str = "no"
    SMTP_SSL_REQUIRED: str = "no"
    
    # OpenAI
    OPENAI_API_KEY: str = "your-openai-api-key"
    MODEL: str = "gpt-4-turbo-preview"
    TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 2000
    MAX_HISTORY_MESSAGES: int = 10
    
    # General
    REGISTRATION_OPEN: bool = True
    WELCOME_MESSAGE: str = "Welcome to Scolaia"
    OWNER_NAME: str = "Owner Name"
    OWNER_EMAIL: str = "owner@yourmail.com"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

# Create settings instance
settings = Settings()

async def get_setting_from_db(db, category: str, key: str) -> Optional[str]:
    """Get a setting value from the database"""
    from app import crud  # Import here to avoid circular imports
    
    setting = await crud.setting.get_by_category_and_key(db, category=category, key=key)
    if setting and setting.value:
        if setting.is_encrypted:
            from app.core.security import decrypt_setting
            try:
                return decrypt_setting(setting.value)
            except ValueError:
                return None
        return setting.value
    return None

@lru_cache()
def get_settings() -> Settings:
    """
    Get settings from environment variables or .env file
    This is used before the database is initialized
    """
    return settings
