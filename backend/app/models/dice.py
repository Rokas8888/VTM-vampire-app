from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DiceRoll(Base):
    __tablename__ = "dice_rolls"

    id              = Column(Integer, primary_key=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    character_id    = Column(Integer, ForeignKey("characters.id", ondelete="SET NULL"), nullable=True)
    pool_size       = Column(Integer, nullable=False)
    hunger_dice     = Column(Integer, default=0, nullable=False)
    total_successes = Column(Integer, nullable=False)
    crit_pairs      = Column(Integer, default=0, nullable=False)
    messy_critical  = Column(Boolean, default=False, nullable=False)
    bestial_failure = Column(Boolean, default=False, nullable=False)
    outcome         = Column(String, nullable=False)
    label           = Column(String, nullable=True)   # optional "Stealth roll" etc.
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    user      = relationship("User")
    character = relationship("Character")
