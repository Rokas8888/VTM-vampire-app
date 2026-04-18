from pydantic import BaseModel
from typing import Optional, List


class DisciplinePowerOut(BaseModel):
    id: int
    discipline_id: int
    name: str
    level: int
    description: Optional[str]
    system_text: Optional[str]
    prerequisite: Optional[str]
    class Config:
        from_attributes = True


class DisciplineOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    class Config:
        from_attributes = True


class DisciplineWithPowersOut(DisciplineOut):
    powers: List[DisciplinePowerOut] = []


class ClanOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    bane: Optional[str]
    compulsion: Optional[str]
    disciplines: List[DisciplineOut] = []
    class Config:
        from_attributes = True


class PredatorTypeOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    discipline: Optional[DisciplineOut]
    discipline_level: Optional[int]
    specialty_skill: Optional[str]
    specialty_name: Optional[str]
    advantages: Optional[str]
    flaws: Optional[str]
    humanity_modifier: int
    choices_json: Optional[str] = None
    grants_json: Optional[str] = None
    class Config:
        from_attributes = True


class MeritOut(BaseModel):
    id: int
    name: str
    cost: int
    category: Optional[str]
    description: Optional[str]
    system_text: Optional[str]
    prerequisite: Optional[str]
    requires_custom_text: bool = False
    max_level: int = 1
    class Config:
        from_attributes = True


class FlawOut(BaseModel):
    id: int
    name: str
    value: int
    category: Optional[str]
    description: Optional[str]
    system_text: Optional[str]
    requires_custom_text: bool = False
    class Config:
        from_attributes = True


class BackgroundOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    system_text: Optional[str]
    class Config:
        from_attributes = True
