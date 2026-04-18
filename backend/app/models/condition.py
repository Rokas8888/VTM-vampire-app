from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Condition(Base):
    __tablename__ = "conditions"

    id           = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    name         = Column(String, nullable=False)           # e.g. "Impaired", "Blinded"
    severity     = Column(String, nullable=False, default="moderate")  # mild / moderate / severe
    notes        = Column(String, nullable=True)
    created_by   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cleared      = Column(Boolean, default=False, nullable=False)
    cleared_at   = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    character  = relationship("Character", back_populates="conditions")
    creator    = relationship("User")
