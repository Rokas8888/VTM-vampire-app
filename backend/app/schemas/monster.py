from pydantic import BaseModel
from typing import Optional, List
from app.models.monster import MonsterType, DamageType


class MonsterCreate(BaseModel):
    name: str
    type: MonsterType = MonsterType.other
    health: int = 4
    health_superficial: int = 0
    health_aggravated: int = 0
    willpower: int = 3
    willpower_superficial: int = 0
    willpower_aggravated: int = 0
    current_hunger: int = 0
    strength: int = 1
    dexterity: int = 1
    stamina: int = 1
    charisma: int = 1
    manipulation: int = 1
    composure: int = 1
    intelligence: int = 1
    wits: int = 1
    resolve: int = 1
    attack_pool: int = 0
    attack_damage_type: DamageType = DamageType.superficial
    weapons: List[dict] = []
    custom_skills: List[dict] = []
    disciplines: List[dict] = []
    special_abilities: str = ""
    notes: str = ""


class MonsterUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[MonsterType] = None
    health: Optional[int] = None
    health_superficial: Optional[int] = None
    health_aggravated: Optional[int] = None
    willpower: Optional[int] = None
    willpower_superficial: Optional[int] = None
    willpower_aggravated: Optional[int] = None
    current_hunger: Optional[int] = None
    strength: Optional[int] = None
    dexterity: Optional[int] = None
    stamina: Optional[int] = None
    charisma: Optional[int] = None
    manipulation: Optional[int] = None
    composure: Optional[int] = None
    intelligence: Optional[int] = None
    wits: Optional[int] = None
    resolve: Optional[int] = None
    attack_pool: Optional[int] = None
    attack_damage_type: Optional[DamageType] = None
    weapons: Optional[List[dict]] = None
    custom_skills: Optional[List[dict]] = None
    disciplines: Optional[List[dict]] = None
    special_abilities: Optional[str] = None
    notes: Optional[str] = None


class MonsterOut(BaseModel):
    id: int
    group_id: int
    name: str
    type: MonsterType
    health: int
    health_superficial: int
    health_aggravated: int
    willpower: int
    willpower_superficial: int
    willpower_aggravated: int
    current_hunger: int
    strength: int
    dexterity: int
    stamina: int
    charisma: int
    manipulation: int
    composure: int
    intelligence: int
    wits: int
    resolve: int
    attack_pool: int
    attack_damage_type: DamageType
    weapons: List[dict]
    custom_skills: List[dict]
    disciplines: List[dict]
    special_abilities: str
    notes: str
    portrait_url: Optional[str] = None

    class Config:
        from_attributes = True
