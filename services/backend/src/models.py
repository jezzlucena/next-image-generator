from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelCaseModel(BaseModel):
    """Model that configures CamelCase alias generation,
    use this as base for other models as needed (e.g. when
    returning a json dict with FastAPI)"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class ChatImage(CamelCaseModel):
    """Represents an image in the chat"""
    caption: str
    base64: Optional[str] = None
    color: str

class ChatbotState(CamelCaseModel):
    """Encapsulates the state of the chatbot,
    for use when recovering the UI"""
    images: List[ChatImage]
    is_locked: bool