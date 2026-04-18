from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ResonanceLog(Base):
    __tablename__ = "resonance_log"

    id           = Column(Integer, primary_key=True)
    group_id     = Column(Integer, ForeignKey("groups.id",     ondelete="CASCADE"), nullable=False)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    npc_name     = Column(String, nullable=False)
    resonance    = Column(String, nullable=False)  # Animal/Choleric/Melancholic/Phlegmatic/Sanguine/Empty
    potency      = Column(String, nullable=False)  # Thin/Weak/Normal/Strong/Exceptional
    notes        = Column(Text,   nullable=True)
    created_by   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    group     = relationship("Group")
    character = relationship("Character")
    creator   = relationship("User")
