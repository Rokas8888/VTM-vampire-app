from fastapi import APIRouter, Depends, HTTPException
from app.seed.load_game_data import seed as run_seed
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.group import Group, GroupMember
from app.models.character import Character
from app.models.monster import Monster

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admins only.")
    return current_user


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class StatsOut(BaseModel):
    total_users: int
    players: int
    gms: int
    admins: int
    total_groups: int
    total_characters: int
    total_monsters: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsOut)
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """System-wide counts."""
    return StatsOut(
        total_users=db.query(User).count(),
        players=db.query(User).filter(User.role == UserRole.player).count(),
        gms=db.query(User).filter(User.role == UserRole.gm).count(),
        admins=db.query(User).filter(User.role == UserRole.admin).count(),
        total_groups=db.query(Group).count(),
        total_characters=db.query(Character).count(),
        total_monsters=db.query(Monster).count(),
    )


@router.get("/users", response_model=List[UserOut])
def list_users(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List all users, optionally filtered by username/email search."""
    q = db.query(User)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (User.username.ilike(like)) | (User.email.ilike(like))
        )
    return q.order_by(User.id).all()


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Change a user's role or active status. Admins cannot demote themselves."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot edit your own account here.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Permanently delete a user and all their data."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    db.delete(user)
    db.commit()


@router.post("/seed")
def seed_game_data(force: bool = False, _: User = Depends(require_admin)):
    """Seed game reference data. Pass ?force=true to clear and reseed all game data."""
    try:
        run_seed(force=force)
        return {"message": "Game data seeded." if not force else "Game data reseeded (forced)."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
