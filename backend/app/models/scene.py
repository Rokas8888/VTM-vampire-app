from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class Scene(Base):
    __tablename__ = "scenes"

    id         = Column(Integer, primary_key=True)
    group_id   = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, unique=True)
    name       = Column(String(100), nullable=False, default="Untitled Scene")
    data       = Column(JSONB, nullable=False, default=list)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
