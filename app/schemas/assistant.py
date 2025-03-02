from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Assistant(BaseModel):
    id: str
    name: Optional[str] = None
    model: str
    created_at: int
    order_sent: Optional[str] = None  # Para mostrar la orden enviada a la API
    api_response: Optional[str] = None  # Para mostrar la respuesta de la API

class AssistantList(BaseModel):
    data: List[Assistant]
    has_more: bool

class AssistantCreate(BaseModel):
    yaml_data: Dict[Any, Any]
