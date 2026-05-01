from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id           = Column(Integer, primary_key=True)
    sender_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    body         = Column(Text, nullable=False)
    is_read      = Column(Boolean, default=False, nullable=False)
    expires_at   = Column(DateTime(timezone=True), nullable=True)  # null = permanent
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    sender    = relationship("User", foreign_keys=[sender_id])
    character = relationship("Character", foreign_keys=[character_id])
