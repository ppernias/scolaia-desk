from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import base64
import hashlib

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"

# Generate a Fernet key from SECRET_KEY
def get_fernet_key(secret_key: str) -> bytes:
    """Generate a valid Fernet key from any string"""
    # Use SHA-256 to get a consistent hash of the secret key
    hashed = hashlib.sha256(secret_key.encode()).digest()
    # Encode it in base64 to make it URL-safe
    return base64.urlsafe_b64encode(hashed)

# Initialize Fernet with a key derived from SECRET_KEY
fernet = Fernet(get_fernet_key(settings.SECRET_KEY))

def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def encrypt_setting(value: str) -> str:
    """Encrypt a setting value"""
    return fernet.encrypt(value.encode()).decode()

def decrypt_setting(encrypted_value: str) -> str:
    """Decrypt a setting value"""
    try:
        return fernet.decrypt(encrypted_value.encode()).decode()
    except Exception as e:
        raise ValueError("Failed to decrypt setting value") from e
