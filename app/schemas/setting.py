from typing import Optional
from pydantic import BaseModel

class SettingBase(BaseModel):
    category: str
    key: str
    value: str
    is_encrypted: bool = False

class SettingCreate(SettingBase):
    pass

class SettingUpdate(SettingBase):
    category: Optional[str] = None
    key: Optional[str] = None
    value: Optional[str] = None
    is_encrypted: Optional[bool] = None

class SettingInDBBase(SettingBase):
    id: int

    class Config:
        from_attributes = True

class Setting(SettingInDBBase):
    pass
