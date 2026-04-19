from pydantic import BaseModel
from typing import Optional, List


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class AddMemberRequest(BaseModel):
    username: str
    character_id: Optional[int] = None


# ── Character card shown in GM grid ──────────────────────────────────────────
class GMCharacterCard(BaseModel):
    id: int
    name: Optional[str]
    concept: Optional[str]
    clan_name: Optional[str]
    generation: Optional[str]
    blood_potency: int
    humanity: int
    current_hunger: int
    health: int
    health_superficial: int
    health_aggravated: int
    willpower: int
    willpower_superficial: int
    willpower_aggravated: int
    top_skills: List[dict]      # [{"name": str, "value": int}]
    all_skills: List[dict]      # full skill list
    attributes: List[dict]      # [{"name": str, "value": int}]
    disciplines: List[dict] = []  # [{"name": str, "level": int}]
    notes: Optional[str] = None
    retainers: List[dict] = []   # [{id, name, concept, health, health_superficial, health_aggravated, willpower, willpower_superficial, willpower_aggravated}]

    class Config:
        from_attributes = True


# ── Group member with their characters ───────────────────────────────────────
class GroupMemberOut(BaseModel):
    user_id: int
    username: str
    character_id: Optional[int] = None   # pinned character, if set
    characters: List[GMCharacterCard] = []

    class Config:
        from_attributes = True


# ── Full group (returned when opening a group) ────────────────────────────────
class GroupOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    gm_id: int
    members: List[GroupMemberOut] = []

    class Config:
        from_attributes = True


# ── Lightweight group summary (list view) ────────────────────────────────────
class GroupSummaryOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    member_count: int

    class Config:
        from_attributes = True


# ── Player search result (includes completed characters) ─────────────────────
class CharacterSearchSummary(BaseModel):
    id: int
    name: Optional[str]
    clan_name: Optional[str]

    class Config:
        from_attributes = True


class UserSearchResult(BaseModel):
    id: int
    username: str
    characters: List[CharacterSearchSummary] = []

    class Config:
        from_attributes = True
