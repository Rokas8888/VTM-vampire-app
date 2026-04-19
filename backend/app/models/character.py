from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class CharacterStatus(str, enum.Enum):
    draft = "draft"
    complete = "complete"


class Generation(str, enum.Enum):
    childer = "childer"    # 13th gen, Blood Potency 0
    neonate = "neonate"    # 12th gen, Blood Potency 1
    ancillae = "ancillae"  # 11th gen, Blood Potency 2


class Character(Base):
    __tablename__ = "characters"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # no unique — players can have multiple characters
    status = Column(Enum(CharacterStatus), default=CharacterStatus.draft)

    # Step 1 - Core Concept
    name = Column(String)
    concept = Column(String)
    ambition = Column(String)
    desire = Column(String)

    # Step 2 - Clan
    clan_id = Column(Integer, ForeignKey("clans.id"), nullable=True)

    # Step 3 - Predator Type
    predator_type_id = Column(Integer, ForeignKey("predator_types.id"), nullable=True)

    # Step 9 - Humanity
    humanity = Column(Integer, default=7)

    # Step 10 - Generation
    generation = Column(Enum(Generation), nullable=True)
    blood_potency = Column(Integer, default=0)

    # Derived stats (calculated on completion)
    health = Column(Integer, default=0)
    willpower = Column(Integer, default=0)

    # Experience
    total_xp = Column(Integer, default=0)
    spent_xp = Column(Integer, default=0)

    # Session tracking — updated during play
    current_hunger        = Column(Integer, default=0, nullable=False, server_default="0")
    health_superficial    = Column(Integer, default=0, nullable=False, server_default="0")
    health_aggravated     = Column(Integer, default=0, nullable=False, server_default="0")
    willpower_superficial = Column(Integer, default=0, nullable=False, server_default="0")
    willpower_aggravated  = Column(Integer, default=0, nullable=False, server_default="0")

    # Extra info
    biography = Column(Text)
    notes = Column(Text)
    haven_location = Column(String)
    haven_description = Column(Text)
    portrait_url = Column(String, nullable=True)

    # Retainer support
    is_retainer = Column(Boolean, default=False, nullable=False, server_default="false")
    parent_character_id = Column(Integer, ForeignKey("characters.id"), nullable=True)
    retainer_level = Column(Integer, nullable=True)  # which Retainer merit dot level this retainer represents

    # Temporary dots — blue overlay dots added during play (not permanent, not XP-spent)
    # Format: {"attributes": {"Strength": 1}, "skills": {"Brawl": 2}, "disciplines": {"5": {"dots": 1, "power_id": null}}}
    temp_dots = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    retainers = relationship("Character", foreign_keys="Character.parent_character_id", back_populates="parent_character")
    parent_character = relationship("Character", foreign_keys="[Character.parent_character_id]", back_populates="retainers", remote_side="Character.id")
    clan = relationship("Clan")
    predator_type = relationship("PredatorType")
    attributes = relationship("CharacterAttribute", back_populates="character", cascade="all, delete-orphan")
    skills = relationship("CharacterSkill", back_populates="character", cascade="all, delete-orphan")
    specialties = relationship("CharacterSpecialty", back_populates="character", cascade="all, delete-orphan")
    disciplines = relationship("CharacterDiscipline", back_populates="character", cascade="all, delete-orphan")
    powers = relationship("CharacterPower", back_populates="character", cascade="all, delete-orphan")
    merits = relationship("CharacterMerit", back_populates="character", cascade="all, delete-orphan")
    backgrounds = relationship("CharacterBackground", back_populates="character", cascade="all, delete-orphan")
    flaws = relationship("CharacterFlaw", back_populates="character", cascade="all, delete-orphan")
    convictions = relationship("CharacterConviction", back_populates="character", cascade="all, delete-orphan")
    tenets = relationship("CharacterTenet", back_populates="character", cascade="all, delete-orphan")
    weapons = relationship("CharacterWeapon", back_populates="character", cascade="all, delete-orphan")
    possessions  = relationship("CharacterPossession", back_populates="character", cascade="all, delete-orphan")
    conditions   = relationship("Condition", back_populates="character", cascade="all, delete-orphan")
    rituals      = relationship("CharacterRitual", back_populates="character", cascade="all, delete-orphan")


class CharacterAttribute(Base):
    __tablename__ = "character_attributes"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    name = Column(String, nullable=False)   # e.g. "Strength"
    value = Column(Integer, default=1)
    character = relationship("Character", back_populates="attributes")


class CharacterSkill(Base):
    __tablename__ = "character_skills"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    name = Column(String, nullable=False)   # e.g. "Athletics"
    value = Column(Integer, default=0)
    character = relationship("Character", back_populates="skills")


class CharacterSpecialty(Base):
    __tablename__ = "character_specialties"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    skill_name = Column(String, nullable=False)
    specialty_name = Column(String, nullable=False)
    character = relationship("Character", back_populates="specialties")


class CharacterDiscipline(Base):
    __tablename__ = "character_disciplines"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)
    level = Column(Integer, default=1)
    character = relationship("Character", back_populates="disciplines")
    discipline = relationship("Discipline")


class CharacterPower(Base):
    __tablename__ = "character_powers"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    power_id = Column(Integer, ForeignKey("discipline_powers.id"), nullable=False)
    character = relationship("Character", back_populates="powers")
    power = relationship("DisciplinePower")


class CharacterMerit(Base):
    __tablename__ = "character_merits"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    merit_id = Column(Integer, ForeignKey("merits.id"), nullable=False)
    level = Column(Integer, default=1)
    notes = Column(String)
    character = relationship("Character", back_populates="merits")
    merit = relationship("Merit")


class CharacterBackground(Base):
    __tablename__ = "character_backgrounds"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    background_id = Column(Integer, ForeignKey("backgrounds.id"), nullable=False)
    level = Column(Integer, default=1)
    notes = Column(String)
    character = relationship("Character", back_populates="backgrounds")
    background = relationship("Background")


class CharacterFlaw(Base):
    __tablename__ = "character_flaws"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    flaw_id = Column(Integer, ForeignKey("flaws.id"), nullable=False)
    notes = Column(String)
    character = relationship("Character", back_populates="flaws")
    flaw = relationship("Flaw")


class CharacterConviction(Base):
    __tablename__ = "character_convictions"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    conviction = Column(String, nullable=False)
    touchstone = Column(String, nullable=False)
    character = relationship("Character", back_populates="convictions")


class CharacterTenet(Base):
    __tablename__ = "character_tenets"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    tenet = Column(String, nullable=False)
    character = relationship("Character", back_populates="tenets")


class CharacterWeapon(Base):
    """A weapon or piece of combat gear owned by the character."""
    __tablename__ = "character_weapons"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    name = Column(String, nullable=False)
    damage = Column(String)   # e.g. "Strength+1 Aggravated"
    range = Column(String)    # e.g. "Close" or "Ranged 20m"
    clips = Column(String)    # ammo/charges for ranged weapons
    traits = Column(String)   # e.g. "Concealable, Two-handed"
    notes = Column(Text)
    character = relationship("Character", back_populates="weapons")


class CharacterPossession(Base):
    """An item, vehicle, haven feature, or other possession."""
    __tablename__ = "character_possessions"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    character = relationship("Character", back_populates="possessions")


class CharacterRitual(Base):
    """A ritual (Blood Sorcery) or ceremony (Oblivion) learned by a character."""
    __tablename__ = "character_rituals"
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    ritual_id = Column(Integer, ForeignKey("rituals.id"), nullable=False)
    character = relationship("Character", back_populates="rituals")
    ritual = relationship("Ritual")


class WizardDraft(Base):
    """Stores in-progress character creation data step by step."""
    __tablename__ = "wizard_drafts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    current_step = Column(Integer, default=1)
    data = Column(JSON, default=dict)   # stores all step data as JSON
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
