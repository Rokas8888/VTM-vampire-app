from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.group import Group, GroupMember
from app.models.character import Character
from app.models.resonance import ResonanceLog

router = APIRouter(prefix="/api/resonance", tags=["resonance"])

RESONANCE_TYPES = {"Animal", "Choleric", "Melancholic", "Phlegmatic", "Sanguine", "Empty"}
POTENCY_LEVELS  = {"Thin", "Weak", "Normal", "Strong", "Exceptional"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class ResonanceCreate(BaseModel):
    group_id:     int
    character_id: int
    npc_name:     str
    resonance:    str
    potency:      str
    notes:        Optional[str] = None

class ResonanceOut(BaseModel):
    id:           int
    group_id:     int
    character_id: int
    character_name: str
    npc_name:     str
    resonance:    str
    potency:      str
    notes:        Optional[str]
    created_at:   datetime

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def require_gm_in_group(group_id: int, user: User, db: Session):
    if user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="Game Masters only.")
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if user.role == UserRole.gm and group.gm_id != user.id:
        raise HTTPException(status_code=403, detail="Not your group.")

def assert_can_read(group_id: int, user: User, db: Session):
    if user.role in (UserRole.gm, UserRole.admin):
        return
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group.")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/group/{group_id}", response_model=List[ResonanceOut])
def list_resonance(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assert_can_read(group_id, current_user, db)
    entries = (
        db.query(ResonanceLog)
        .options(joinedload(ResonanceLog.character))
        .filter(ResonanceLog.group_id == group_id)
        .order_by(ResonanceLog.created_at.desc())
        .all()
    )
    return [
        ResonanceOut(
            id=e.id, group_id=e.group_id, character_id=e.character_id,
            character_name=e.character.name if e.character else "?",
            npc_name=e.npc_name, resonance=e.resonance, potency=e.potency,
            notes=e.notes, created_at=e.created_at,
        )
        for e in entries
    ]


@router.post("", response_model=ResonanceOut, status_code=201)
def log_resonance(
    body: ResonanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_gm_in_group(body.group_id, current_user, db)
    if body.resonance not in RESONANCE_TYPES:
        raise HTTPException(status_code=400, detail=f"resonance must be one of {RESONANCE_TYPES}")
    if body.potency not in POTENCY_LEVELS:
        raise HTTPException(status_code=400, detail=f"potency must be one of {POTENCY_LEVELS}")
    if not body.npc_name.strip():
        raise HTTPException(status_code=400, detail="NPC name cannot be empty.")

    char = db.query(Character).filter(Character.id == body.character_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    entry = ResonanceLog(
        group_id=body.group_id, character_id=body.character_id,
        npc_name=body.npc_name.strip(), resonance=body.resonance,
        potency=body.potency, notes=body.notes, created_by=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return ResonanceOut(
        id=entry.id, group_id=entry.group_id, character_id=entry.character_id,
        character_name=char.name, npc_name=entry.npc_name,
        resonance=entry.resonance, potency=entry.potency,
        notes=entry.notes, created_at=entry.created_at,
    )


@router.delete("/{entry_id}", status_code=204)
def delete_resonance(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(ResonanceLog).filter(ResonanceLog.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found.")
    require_gm_in_group(entry.group_id, current_user, db)
    db.delete(entry)
    db.commit()
