from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.dice import DiceRoll
from app.models.group import Group, GroupMember

router = APIRouter(prefix="/api/dice", tags=["dice"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RollSaveRequest(BaseModel):
    pool_size:       int
    hunger_dice:     int = 0
    total_successes: int
    crit_pairs:      int = 0
    messy_critical:  bool = False
    bestial_failure: bool = False
    outcome:         str
    character_id:    Optional[int] = None
    label:           Optional[str] = None


class RollOut(BaseModel):
    id:              int
    username:        str
    pool_size:       int
    hunger_dice:     int
    total_successes: int
    crit_pairs:      int
    messy_critical:  bool
    bestial_failure: bool
    outcome:         str
    label:           Optional[str]
    created_at:      datetime

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/save", response_model=RollOut)
def save_roll(
    body: RollSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist a dice roll result."""
    roll = DiceRoll(
        user_id         = current_user.id,
        character_id    = body.character_id,
        pool_size       = body.pool_size,
        hunger_dice     = body.hunger_dice,
        total_successes = body.total_successes,
        crit_pairs      = body.crit_pairs,
        messy_critical  = body.messy_critical,
        bestial_failure = body.bestial_failure,
        outcome         = body.outcome,
        label           = body.label,
    )
    db.add(roll)
    db.commit()
    db.refresh(roll)
    # Attach username for the response
    roll.username = current_user.username
    return roll


@router.get("/history", response_model=List[RollOut])
def my_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's recent rolls."""
    rolls = (
        db.query(DiceRoll)
        .options(joinedload(DiceRoll.user))
        .filter(DiceRoll.user_id == current_user.id)
        .order_by(DiceRoll.created_at.desc())
        .limit(limit)
        .all()
    )
    for r in rolls:
        r.username = r.user.username
    return rolls


@router.get("/history/group/{group_id}", response_model=List[RollOut])
def group_history(
    group_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return recent rolls for all members of a group. GM or admin only."""
    if current_user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="GMs only.")

    # Verify this GM owns the group
    group = db.query(Group).filter(Group.id == group_id, Group.gm_id == current_user.id).first()
    if not group and current_user.role != UserRole.admin:
        raise HTTPException(status_code=404, detail="Group not found.")

    # Get all member user IDs
    member_ids = [m.user_id for m in db.query(GroupMember).filter(GroupMember.group_id == group_id).all()]
    if not member_ids:
        return []

    rolls = (
        db.query(DiceRoll)
        .options(joinedload(DiceRoll.user))
        .filter(DiceRoll.user_id.in_(member_ids))
        .order_by(DiceRoll.created_at.desc())
        .limit(limit)
        .all()
    )
    for r in rolls:
        r.username = r.user.username
    return rolls
