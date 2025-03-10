from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_admin: Optional[bool] = False
    is_approved: Optional[bool] = False
    fullname: Optional[str] = None

class UserCreate(UserBase):
    email: EmailStr
    password: str
    fullname: str  # Make fullname required for registration

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: Optional[int] = None
    creation_date: Optional[datetime] = None
    last_login: Optional[datetime] = None
    token_count: Optional[int] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    password: str = Field(..., min_length=8, description="New password must be at least 8 characters long")


class PasswordResetResponse(BaseModel):
    message: str
