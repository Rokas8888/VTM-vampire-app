from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class NPC(Base):
    __tablename__ = "npcs"

    id           = Column(Integer, primary_key=True)
    group_id     = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    name         = Column(String, nullable=False)
    clan         = Column(String, nullable=True)
    status       = Column(String, nullable=True)       # Alive, Dead, Unknown, Missing…
    relation     = Column("relationship", String, nullable=True)   # Ally, Enemy, Neutral, Contact…
    notes        = Column(Text,   nullable=True)
    created_by   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    group   = relationship("Group")
    creator = relationship("User")
