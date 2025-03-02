from typing import Optional, Dict, List, Any
from pydantic import BaseModel

class Message(BaseModel):
    content: str
    role: str = "user"

class Thread(BaseModel):
    id: str
    created_at: int
    metadata: Optional[Dict] = None

class Run(BaseModel):
    id: str
    status: str
    thread_id: str
    assistant_id: str

class ChatMessage(BaseModel):
    content: str
    file_id: Optional[str] = None
    thread_id: Optional[str] = None
    assistant_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    model: str
