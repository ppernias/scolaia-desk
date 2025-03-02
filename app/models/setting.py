from sqlalchemy import Boolean, Column, Integer, String, Text
from app.db.base_class import Base

class Setting(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)
    key = Column(String, index=True)
    value = Column(Text)
    is_encrypted = Column(Boolean, default=False)
    
    class Config:
        orm_mode = True
