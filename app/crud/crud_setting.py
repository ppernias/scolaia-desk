from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.crud.base import CRUDBase
from app.models.setting import Setting
from app.schemas.setting import SettingCreate, SettingUpdate

class CRUDSetting(CRUDBase[Setting, SettingCreate, SettingUpdate]):
    async def get_by_category_and_key(
        self, db: AsyncSession, *, category: str, key: str
    ) -> Optional[Setting]:
        result = await db.execute(
            select(Setting).filter(
                Setting.category == category,
                Setting.key == key
            )
        )
        return result.scalar_one_or_none()

    async def get_by_category(
        self, db: AsyncSession, category: str
    ) -> list[Setting]:
        """Get all settings for a specific category."""
        result = await db.execute(
            select(Setting).filter(Setting.category == category)
        )
        return result.scalars().all()

setting = CRUDSetting(Setting)
