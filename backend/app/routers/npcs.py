from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.group import Group, GroupMember
from app.models.npc import NPC

router = APIRouter(prefix="/api/npcs", tags=["npcs"])

VALID_STATUSES       = {"Alive", "Dead", "Unknown", "Missing", "Torpor", "Other"}
VALID_RELATIONSHIPS  = {"Ally", "Enemy", "Neutral", "Contact", "Rival", "Thrall", "Sire", "Other"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class NPCCreate(BaseModel):
    group_id: int
    name:     str
    clan:     Optional[str] = None
    status:   Optional[str] = "Unknown"
    relation: Optional[str] = "Neutral"
    notes:    Optional[str] = None

class NPCUpdate(BaseModel):
    name:     Optional[str] = None
    clan:     Optional[str] = None
    status:   Optional[str] = None
    relation: Optional[str] = None
    notes:    Optional[str] = None

class NPCOut(BaseModel):
    id:         int
    group_id:   int
    name:       str
    clan:       Optional[str]
    status:     Optional[str]
    relation:   Optional[str]
    notes:      Optional[str]
    created_by: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

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
    return group

def assert_can_read(group_id: int, user: User, db: Session):
    """Players can read NPCs if they are group members."""
    if user.role in (UserRole.gm, UserRole.admin):
        return
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group.")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/group/{group_id}", response_model=List[NPCOut])
def list_npcs(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assert_can_read(group_id, current_user, db)
    return db.query(NPC).filter(NPC.group_id == group_id).order_by(NPC.name).all()


@router.post("", response_model=NPCOut, status_code=201)
def create_npc(
    body: NPCCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_gm_in_group(body.group_id, current_user, db)
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    npc = NPC(
        group_id=body.group_id,
        name=body.name.strip(),
        clan=body.clan,
        status=body.status,
        relation=body.relation,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(npc)
    db.commit()
    db.refresh(npc)
    return npc


@router.put("/{npc_id}", response_model=NPCOut)
def update_npc(
    npc_id: int,
    body: NPCUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    npc = db.query(NPC).filter(NPC.id == npc_id).first()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found.")
    require_gm_in_group(npc.group_id, current_user, db)

    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty.")
        npc.name = body.name.strip()
    if body.clan         is not None: npc.clan         = body.clan
    if body.status       is not None: npc.status       = body.status
    if body.relation is not None: npc.relation = body.relation
    if body.notes        is not None: npc.notes        = body.notes

    db.commit()
    db.refresh(npc)
    return npc


@router.delete("/{npc_id}", status_code=204)
def delete_npc(
    npc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    npc = db.query(NPC).filter(NPC.id == npc_id).first()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found.")
    require_gm_in_group(npc.group_id, current_user, db)
    db.delete(npc)
    db.commit()
