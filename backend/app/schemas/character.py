from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.models.character import CharacterStatus, Generation
from app.schemas.game_data import ClanOut, PredatorTypeOut, DisciplineOut, DisciplineWithPowersOut, DisciplinePowerOut, MeritOut, FlawOut, BackgroundOut, RitualOut


# ── Wizard step request bodies ──────────────────────────────────────────────

class Step1Data(BaseModel):
    """Step 1 — Core concept"""
    name: str
    concept: str
    ambition: str
    desire: str


class Step2Data(BaseModel):
    """Step 2 — Clan selection"""
    clan_id: int


class AttributeSet(BaseModel):
    """All 9 V5 attributes"""
    # Physical
    Strength: int
    Dexterity: int
    Stamina: int
    # Social
    Charisma: int
    Manipulation: int
    Composure: int
    # Mental
    Intelligence: int
    Wits: int
    Resolve: int


class Step3Data(BaseModel):
    """Step 3 — Attribute distribution. Rule: one at 4, three at 3, four at 2, one at 1."""
    attributes: AttributeSet


class SkillSet(BaseModel):
    """All 27 V5 skills"""
    # Physical
    Athletics: int = 0
    Brawl: int = 0
    Craft: int = 0
    Drive: int = 0
    Firearms: int = 0
    Larceny: int = 0
    Melee: int = 0
    Stealth: int = 0
    Survival: int = 0
    # Social
    Animal_Ken: int = 0
    Etiquette: int = 0
    Insight: int = 0
    Intimidation: int = 0
    Leadership: int = 0
    Performance: int = 0
    Persuasion: int = 0
    Streetwise: int = 0
    Subterfuge: int = 0
    # Mental
    Academics: int = 0
    Awareness: int = 0
    Finance: int = 0
    Investigation: int = 0
    Medicine: int = 0
    Occult: int = 0
    Politics: int = 0
    Science: int = 0
    Technology: int = 0


class SpecialtyEntry(BaseModel):
    skill_name: str
    specialty_name: str


class Step4Data(BaseModel):
    """Step 4 — Skill distribution.
    distribution: 'jack' | 'balanced' | 'specialist'
    specialties: auto-specialties for Academics/Craft/Performance/Science + 1 free extra
    """
    distribution: str   # "jack" | "balanced" | "specialist"
    skills: SkillSet
    specialties: List[SpecialtyEntry] = []


class DisciplineSelection(BaseModel):
    discipline_id: int
    level: int
    power_ids: List[int]  # which powers the player picked at each level


class Step5Data(BaseModel):
    """Step 5 — Discipline selection — 2 clan disciplines, 3 total dots"""
    disciplines: List[DisciplineSelection]
    predator_power_id: Optional[int] = None  # power chosen for the predator type bonus discipline dot


class AdvantageItem(BaseModel):
    id: int          # merit or background ID
    type: str        # "merit" or "background"
    level: int
    notes: Optional[str] = None   # for merits that require specification


class FlawItem(BaseModel):
    id: int
    notes: Optional[str] = None


class Step6Data(BaseModel):
    """Step 6 — Advantages and flaws — 7 points to spend, 2 points of flaws"""
    advantages: List[AdvantageItem]
    flaws: List[FlawItem]


class ConvictionEntry(BaseModel):
    conviction: str
    touchstone: str


class Step7Data(BaseModel):
    """Step 7 — Beliefs — convictions, touchstones, tenets"""
    convictions: List[ConvictionEntry]
    tenets: List[str]


class Step8Data(BaseModel):
    """Step 8 — Humanity confirmation"""
    humanity: int


class Step9Data(BaseModel):
    """Step 9 — Predator Type (optional — some chronicles skip this)"""
    predator_type_id: Optional[int] = None
    # When predator type has choices, player selections are stored here
    chosen_discipline: Optional[str] = None   # e.g. "Oblivion" (overrides default discipline)
    chosen_specialty_skill: Optional[str] = None
    chosen_specialty_name: Optional[str] = None
    chosen_flaw: Optional[str] = None         # e.g. "Shunned" (for types with a flaw choice)


class Step10Data(BaseModel):
    """Step 10 — Generation and final details"""
    generation: Generation
    biography: Optional[str] = None
    notes: Optional[str] = None
    haven_location: Optional[str] = None
    haven_description: Optional[str] = None


# ── Character edit ───────────────────────────────────────────────────────────

class CharacterUpdateRequest(BaseModel):
    """Fields the player can edit after character creation."""
    name: Optional[str] = None
    concept: Optional[str] = None
    ambition: Optional[str] = None
    desire: Optional[str] = None
    biography: Optional[str] = None
    notes: Optional[str] = None
    haven_location: Optional[str] = None
    haven_description: Optional[str] = None
    clan_id: Optional[int] = None
    predator_type_id: Optional[int] = None
    generation: Optional[str] = None


class GMStatAdjustRequest(BaseModel):
    """GM/admin adjustment of permanent and session character stats."""
    humanity: Optional[int] = None
    humanity_stains: Optional[int] = None
    blood_potency: Optional[int] = None
    health: Optional[int] = None
    willpower: Optional[int] = None
    current_hunger: Optional[int] = None
    health_superficial: Optional[int] = None
    health_aggravated: Optional[int] = None
    willpower_superficial: Optional[int] = None
    willpower_aggravated: Optional[int] = None


class XPGrantRequest(BaseModel):
    """Add experience points to a character (GM award)."""
    amount: int


class SessionUpdateRequest(BaseModel):
    """Save in-session state: damage tracks, hunger, humanity, blood potency."""
    current_hunger:         Optional[int] = None
    health_superficial:     Optional[int] = None
    health_aggravated:      Optional[int] = None
    willpower_superficial:  Optional[int] = None
    willpower_aggravated:   Optional[int] = None
    humanity:               Optional[int] = None
    blood_potency:          Optional[int] = None


class XPSpendRequest(BaseModel):
    """Record that the player spent some of their available XP."""
    amount: int


class ImproveRequest(BaseModel):
    """Spend XP to raise an attribute, skill, discipline, or background."""
    trait_type: str                    # "attribute" | "skill" | "discipline" | "background"
    trait_name: Optional[str] = None   # for attribute / skill
    discipline_id: Optional[int] = None  # for discipline (raise dot)
    power_id: Optional[int] = None       # for discipline_power (learn power)
    background_id: Optional[int] = None  # for background (raise dot)
    free: bool = False                    # skip XP cost (for retainers)


class MeritAddRequest(BaseModel):
    """Add a merit to a character."""
    merit_id: int
    level: int = 1
    notes: Optional[str] = None


class FlawAddRequest(BaseModel):
    """Add a flaw to a character."""
    flaw_id: int
    notes: Optional[str] = None


class BackgroundAddRequest(BaseModel):
    """Add a background to a character."""
    background_id: int
    level: int = 1
    notes: Optional[str] = None


class ConvictionAddRequest(BaseModel):
    """Add a conviction + touchstone to a character."""
    conviction: str
    touchstone: str


class TenetAddRequest(BaseModel):
    """Add a chronicle tenet to a character."""
    tenet: str


class TempDotsRequest(BaseModel):
    """Set the temporary dots state for a character."""
    temp_dots: Optional[Dict[str, Any]] = None




class WeaponIn(BaseModel):
    """Create or update a weapon."""
    name: str
    damage: Optional[str] = None
    range: Optional[str] = None
    clips: Optional[str] = None
    traits: Optional[str] = None
    notes: Optional[str] = None


class PossessionIn(BaseModel):
    """Create or update a possession."""
    name: str
    description: Optional[str] = None


# ── Draft save/load ──────────────────────────────────────────────────────────

class DraftSaveRequest(BaseModel):
    step: int
    data: Dict[str, Any]   # raw step data stored as JSON


class DraftResponse(BaseModel):
    current_step: int
    data: Dict[str, Any]
    class Config:
        from_attributes = True


# ── Character response ───────────────────────────────────────────────────────

class AttributeOut(BaseModel):
    name: str
    value: int
    class Config:
        from_attributes = True


class SkillOut(BaseModel):
    name: str
    value: int
    class Config:
        from_attributes = True


class SpecialtyOut(BaseModel):
    skill_name: str
    specialty_name: str
    class Config:
        from_attributes = True


class CharacterDisciplineOut(BaseModel):
    discipline: DisciplineWithPowersOut   # includes all powers for this discipline
    level: int
    class Config:
        from_attributes = True


class CharacterPowerOut(BaseModel):
    power: DisciplinePowerOut
    class Config:
        from_attributes = True


class CharacterMeritOut(BaseModel):
    merit: MeritOut
    level: int
    notes: Optional[str]
    class Config:
        from_attributes = True


class CharacterBackgroundOut(BaseModel):
    background: BackgroundOut
    level: int
    notes: Optional[str]
    class Config:
        from_attributes = True


class CharacterFlawOut(BaseModel):
    flaw: FlawOut
    notes: Optional[str]
    class Config:
        from_attributes = True


class ConvictionOut(BaseModel):
    id: int
    conviction: str
    touchstone: str
    class Config:
        from_attributes = True


class TenetOut(BaseModel):
    id: int
    tenet: str
    class Config:
        from_attributes = True


class WeaponOut(BaseModel):
    id: int
    name: str
    damage: Optional[str]
    range: Optional[str]
    clips: Optional[str]
    traits: Optional[str]
    notes: Optional[str]
    class Config:
        from_attributes = True


class PossessionOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    class Config:
        from_attributes = True


class CharacterRitualOut(BaseModel):
    id: int
    ritual: RitualOut
    class Config:
        from_attributes = True


class CharacterSummaryOut(BaseModel):
    """Lightweight character info for the dashboard grid."""
    id: int
    name: Optional[str]
    concept: Optional[str]
    clan: Optional[ClanOut]
    generation: Optional[Generation]
    blood_potency: int
    humanity: int
    total_xp: int
    spent_xp: int
    is_retainer: bool = False
    parent_character_id: Optional[int] = None
    retainer_level: Optional[int] = None
    class Config:
        from_attributes = True


class DirectoryCharOut(BaseModel):
    """Public-facing character info for the player directory."""
    id: int
    name: Optional[str]
    clan: Optional[ClanOut]
    generation: Optional[Generation]
    humanity: int
    blood_potency: int
    is_retainer: bool = False
    parent_character_name: Optional[str] = None
    class Config:
        from_attributes = True


class CharacterOut(BaseModel):
    id: int
    status: CharacterStatus
    name: Optional[str]
    concept: Optional[str]
    ambition: Optional[str]
    desire: Optional[str]
    clan: Optional[ClanOut]
    predator_type: Optional[PredatorTypeOut]
    humanity: int
    humanity_stains: int = 0
    generation: Optional[Generation]
    blood_potency: int
    health: int
    willpower: int
    total_xp: int
    spent_xp: int
    current_hunger: int = 0
    health_superficial: int = 0
    health_aggravated: int = 0
    willpower_superficial: int = 0
    willpower_aggravated: int = 0
    biography: Optional[str]
    notes: Optional[str]
    haven_location: Optional[str]
    haven_description: Optional[str]
    portrait_url: Optional[str] = None
    attributes: List[AttributeOut] = []
    skills: List[SkillOut] = []
    specialties: List[SpecialtyOut] = []
    disciplines: List[CharacterDisciplineOut] = []
    powers: List[CharacterPowerOut] = []
    merits: List[CharacterMeritOut] = []
    backgrounds: List[CharacterBackgroundOut] = []
    flaws: List[CharacterFlawOut] = []
    convictions: List[ConvictionOut] = []
    tenets: List[TenetOut] = []
    weapons: List[WeaponOut] = []
    possessions: List[PossessionOut] = []
    rituals: List[CharacterRitualOut] = []
    temp_dots: Optional[Dict[str, Any]] = None
    is_retainer: bool = False
    parent_character_id: Optional[int] = None
    retainer_level: Optional[int] = None
    retainers: List["CharacterOut"] = []
    class Config:
        from_attributes = True
