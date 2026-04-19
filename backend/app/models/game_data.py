from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.database import Base

# Junction table linking clans to their disciplines (many-to-many)
clan_disciplines = Table(
    "clan_disciplines",
    Base.metadata,
    Column("clan_id", Integer, ForeignKey("clans.id"), primary_key=True),
    Column("discipline_id", Integer, ForeignKey("disciplines.id"), primary_key=True),
)


class Clan(Base):
    __tablename__ = "clans"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)       # flavor text
    bane = Column(Text)              # the clan's curse
    compulsion = Column(Text)        # the clan's compulsion

    disciplines = relationship("Discipline", secondary=clan_disciplines, back_populates="clans")


class Discipline(Base):
    __tablename__ = "disciplines"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)

    powers = relationship("DisciplinePower", back_populates="discipline", order_by="DisciplinePower.level")
    clans = relationship("Clan", secondary=clan_disciplines, back_populates="disciplines")


class DisciplinePower(Base):
    __tablename__ = "discipline_powers"

    id = Column(Integer, primary_key=True)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)
    name = Column(String, nullable=False)
    level = Column(Integer, nullable=False)   # 1–5
    description = Column(Text)               # flavor text
    system_text = Column(Text)               # mechanical rules
    prerequisite = Column(String)            # e.g. "Blood Sorcery 2"

    discipline = relationship("Discipline", back_populates="powers")


class PredatorType(Base):
    __tablename__ = "predator_types"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=True)
    discipline_level = Column(Integer, default=1)
    specialty_skill = Column(String)    # e.g. "Stealth"
    specialty_name = Column(String)     # e.g. "Stalking"
    advantages = Column(Text)           # free advantages gained
    flaws = Column(Text)                # flaws imposed
    humanity_modifier = Column(Integer, default=0)
    choices_json = Column(Text, nullable=True)   # JSON: {"discipline":[...], "specialty":[...]}
    grants_json  = Column(Text, nullable=True)   # JSON: {"merits":[{"name":...,"level":...}], "flaws":[{"name":...}]}

    discipline = relationship("Discipline")


class Merit(Base):
    __tablename__ = "merits"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    cost = Column(Integer, nullable=False)   # dot cost
    category = Column(String)               # physical, social, mental, background
    description = Column(Text)
    system_text = Column(Text)
    prerequisite = Column(String)
    requires_custom_text = Column(Boolean, default=False, server_default='false', nullable=False)
    max_level = Column(Integer, default=1, server_default='1', nullable=False)


class Flaw(Base):
    __tablename__ = "flaws"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    value = Column(Integer, nullable=False)  # points gained
    category = Column(String)
    description = Column(Text)
    system_text = Column(Text)
    requires_custom_text = Column(Boolean, default=False, server_default='false', nullable=False)


class Background(Base):
    __tablename__ = "backgrounds"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    system_text = Column(Text)


class Ritual(Base):
    """Blood Sorcery rituals and Oblivion ceremonies — learned separately from discipline powers."""
    __tablename__ = "rituals"

    id = Column(Integer, primary_key=True)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)
    name = Column(String, nullable=False)
    level = Column(Integer, nullable=False)   # 1–5
    description = Column(Text)
    system_text = Column(Text)

    discipline = relationship("Discipline")
