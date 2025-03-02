from typing import Any, Dict, Optional, Union, List
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        # Check if this is the first user
        stmt = select(User)
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        # If this is the first user, make them an admin and automatically approve them
        is_first_user = len(users) == 0
        
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            fullname=obj_in.fullname,
            is_admin=is_first_user,  # First user is admin
            is_active=True,
            is_approved=is_first_user,  # First user is automatically approved
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]) -> User:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
            
        return await super().update(db, db_obj=db_obj, obj_in=update_data)

    async def authenticate(self, db: AsyncSession, *, email: str, password: str) -> Optional[User]:
        user = await self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def is_active(self, user: User) -> bool:
        return user.is_active

    async def is_admin(self, user: User) -> bool:
        return user.is_admin

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, search: Optional[str] = None
    ) -> List[User]:
        stmt = select(User)
        
        if search:
            search = f"%{search}%"
            stmt = stmt.where(
                or_(
                    User.fullname.ilike(search),
                    User.email.ilike(search)
                )
            )
        
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    async def update_login(
        self, db: AsyncSession, *, db_obj: User
    ) -> User:
        """Update user's last login timestamp"""
        from datetime import datetime
        db_obj.last_login = datetime.utcnow()
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

user = CRUDUser(User)
