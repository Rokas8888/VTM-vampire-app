from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id          = Column(Integer, primary_key=True)
    name        = Column(String, nullable=False)
    description = Column(Text)
    gm_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    gm      = relationship("User", foreign_keys=[gm_id])
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id"),)

    id           = Column(Integer, primary_key=True)
    group_id     = Column(Integer, ForeignKey("groups.id"), nullable=False)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=True)
    joined_at    = Column(DateTime(timezone=True), server_default=func.now())

    group     = relationship("Group", back_populates="members")
    user      = relationship("User")
    character = relationship("Character", foreign_keys=[character_id])
