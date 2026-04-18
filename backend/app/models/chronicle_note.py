from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ChronicleNote(Base):
    __tablename__ = "chronicle_notes"

    id         = Column(Integer, primary_key=True)
    group_id   = Column(Integer, ForeignKey("groups.id",  ondelete="CASCADE"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    note_type  = Column(String, nullable=False)   # "summary" | "personal"
    title      = Column(String, nullable=True)
    content    = Column(Text,   nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    group = relationship("Group")
    user  = relationship("User")
