from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.character import Character
from app.models.condition import Condition

router = APIRouter(prefix="/api/conditions", tags=["conditions"])


# ── Schemas ───────────────────────────────────────────────────────────────────

VALID_SEVERITIES = {"mild", "moderate", "severe"}

class ConditionCreate(BaseModel):
    character_id: int
    name:         str
    severity:     str = "moderate"
    notes:        Optional[str] = None


class ConditionOut(BaseModel):
    id:           int
    character_id: int
    name:         str
    severity:     str
    notes:        Optional[str]
    cleared:      bool
    created_by:   Optional[int]
    cleared_at:   Optional[datetime]
    created_at:   datetime

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def require_gm_or_admin(user: User) -> None:
    if user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="Game Masters only.")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=ConditionOut, status_code=201)
def add_condition(
    body: ConditionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GM/admin adds a condition to a character."""
    require_gm_or_admin(current_user)

    if body.severity not in VALID_SEVERITIES:
        raise HTTPException(status_code=400, detail=f"severity must be one of {VALID_SEVERITIES}")
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Condition name cannot be empty.")

    # Verify character exists
    char = db.query(Character).filter(Character.id == body.character_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    condition = Condition(
        character_id = body.character_id,
        name         = body.name.strip(),
        severity     = body.severity,
        notes        = body.notes,
        created_by   = current_user.id,
    )
    db.add(condition)
    db.commit()
    db.refresh(condition)
    return condition


@router.get("/character/{character_id}", response_model=List[ConditionOut])
def get_conditions(
    character_id: int,
    include_cleared: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return conditions for a character. Players can view their own character's conditions."""
    char = db.query(Character).filter(Character.id == character_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    # Any authenticated user can read conditions (players see others' in session mode)
    # Only block if somehow unauthenticated (handled by Depends)

    query = db.query(Condition).filter(Condition.character_id == character_id)
    if not include_cleared:
        query = query.filter(Condition.cleared == False)
    return query.order_by(Condition.created_at.desc()).all()


@router.delete("/{condition_id}", status_code=204)
def clear_condition(
    condition_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a condition as cleared. GM/admin only."""
    require_gm_or_admin(current_user)

    cond = db.query(Condition).filter(Condition.id == condition_id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condition not found.")

    cond.cleared    = True
    cond.cleared_at = datetime.now(timezone.utc)
    db.commit()


@router.delete("/{condition_id}/hard", status_code=204)
def delete_condition(
    condition_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete a condition. GM/admin only."""
    require_gm_or_admin(current_user)

    cond = db.query(Condition).filter(Condition.id == condition_id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condition not found.")

    db.delete(cond)
    db.commit()
