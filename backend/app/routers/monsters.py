from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.monster import Monster
from app.schemas.monster import MonsterCreate, MonsterUpdate, MonsterOut

router = APIRouter(prefix="/api/monsters", tags=["monsters"])


def require_gm(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="Game Masters only.")
    return current_user


def get_group_for_gm(group_id: int, gm: User, db: Session) -> Group:
    group = db.query(Group).filter(Group.id == group_id, Group.gm_id == gm.id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    return group


@router.get("", response_model=list[MonsterOut])
def list_monsters(
    group_id: int,
    gm: User = Depends(require_gm),
    db: Session = Depends(get_db),
):
    """List all monsters for a group."""
    get_group_for_gm(group_id, gm, db)
    return (
        db.query(Monster)
        .filter(Monster.group_id == group_id)
        .order_by(Monster.created_at.asc())
        .all()
    )


@router.post("", response_model=MonsterOut, status_code=201)
def create_monster(
    body: MonsterCreate,
    group_id: int,
    gm: User = Depends(require_gm),
    db: Session = Depends(get_db),
):
    """Create a monster in a group."""
    get_group_for_gm(group_id, gm, db)
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Monster name cannot be empty.")
    monster = Monster(group_id=group_id, **body.model_dump())
    monster.name = monster.name.strip()
    db.add(monster)
    db.commit()
    db.refresh(monster)
    return monster


@router.put("/{monster_id}", response_model=MonsterOut)
def update_monster(
    monster_id: int,
    body: MonsterUpdate,
    gm: User = Depends(require_gm),
    db: Session = Depends(get_db),
):
    """Update a monster."""
    monster = db.query(Monster).filter(Monster.id == monster_id).first()
    if not monster:
        raise HTTPException(status_code=404, detail="Monster not found.")
    # Verify the monster's group belongs to this GM
    get_group_for_gm(monster.group_id, gm, db)

    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "name" and value is not None:
            value = value.strip()
            if not value:
                raise HTTPException(status_code=400, detail="Monster name cannot be empty.")
        setattr(monster, field, value)

    db.commit()
    db.refresh(monster)
    return monster


@router.delete("/{monster_id}", status_code=204)
def delete_monster(
    monster_id: int,
    gm: User = Depends(require_gm),
    db: Session = Depends(get_db),
):
    """Delete a monster."""
    monster = db.query(Monster).filter(Monster.id == monster_id).first()
    if not monster:
        raise HTTPException(status_code=404, detail="Monster not found.")
    get_group_for_gm(monster.group_id, gm, db)
    db.delete(monster)
    db.commit()
