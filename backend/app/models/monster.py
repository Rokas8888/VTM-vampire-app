from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class MonsterType(str, enum.Enum):
    vampire  = "vampire"
    ghoul    = "ghoul"
    mortal   = "mortal"
    beast    = "beast"
    spirit   = "spirit"
    other    = "other"


class DamageType(str, enum.Enum):
    superficial = "superficial"
    aggravated  = "aggravated"


class Monster(Base):
    __tablename__ = "monsters"

    id          = Column(Integer, primary_key=True)
    group_id    = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String, nullable=False)
    type        = Column(Enum(MonsterType), default=MonsterType.other, nullable=False)

    # Health track
    health              = Column(Integer, default=4, nullable=False)
    health_superficial  = Column(Integer, default=0, nullable=False)
    health_aggravated   = Column(Integer, default=0, nullable=False)

    # Simplified physical/social/mental attributes (1–5)
    strength    = Column(Integer, default=1)
    dexterity   = Column(Integer, default=1)
    stamina     = Column(Integer, default=1)
    charisma    = Column(Integer, default=1)
    manipulation = Column(Integer, default=1)
    composure   = Column(Integer, default=1)
    intelligence = Column(Integer, default=1)
    wits        = Column(Integer, default=1)
    resolve     = Column(Integer, default=1)

    # Willpower track
    willpower             = Column(Integer, default=3, nullable=False)
    willpower_superficial = Column(Integer, default=0, nullable=False)
    willpower_aggravated  = Column(Integer, default=0, nullable=False)

    # Hunger (relevant for vampire / ghoul)
    current_hunger = Column(Integer, default=0, nullable=False)

    # Attack
    attack_pool        = Column(Integer, default=0)
    attack_damage_type = Column(Enum(DamageType), default=DamageType.superficial)

    # JSON lists — weapons, custom skills, disciplines
    weapons       = Column(JSON, default=list, nullable=False)
    custom_skills = Column(JSON, default=list, nullable=False)
    disciplines   = Column(JSON, default=list, nullable=False)

    # Portrait
    portrait_url = Column(String, nullable=True)

    # Free-text fields
    special_abilities = Column(Text, default="")
    notes             = Column(Text, default="")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group")
