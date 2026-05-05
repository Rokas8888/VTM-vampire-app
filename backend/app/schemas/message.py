from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    character_id: int
    subject: Optional[str] = None
    body: str
    ephemeral: bool = False


class MessageOut(BaseModel):
    id: int
    sender_id: int
    sender_username: str
    subject: Optional[str]
    body: str
    is_read: bool
    ephemeral: bool
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
