from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import verify_password
from app.crud.crud_user import user
from app.models.user import User

async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    user_obj = await user.get_by_email(db, email=email)
    if not user_obj:
        return None
    if not verify_password(password, user_obj.hashed_password):
        return None
    return user_obj
