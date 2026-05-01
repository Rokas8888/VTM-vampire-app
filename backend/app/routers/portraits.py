import os, uuid, shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.character import Character
from app.models.monster import Monster
from app.models.group import Group

router = APIRouter(prefix="/api/portraits", tags=["portraits"])

UPLOAD_DIR   = "/app/uploads/portraits"
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_BYTES    = 5 * 1024 * 1024   # 5 MB

os.makedirs(UPLOAD_DIR, exist_ok=True)


class PortraitOut(BaseModel):
    portrait_url: str


@router.post("/{character_id}", response_model=PortraitOut)
async def upload_portrait(
    character_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a portrait image for a character. Only the character's owner can upload."""
    char = db.query(Character).filter(
        Character.id == character_id,
        Character.user_id == current_user.id,
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Allowed formats: jpg, png, webp, gif.")

    # Read and size-check
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB).")

    # Delete old portrait if present
    if char.portrait_url:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(char.portrait_url))
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save new file with a unique name
    filename = f"{character_id}_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, filename)
    with open(dest, "wb") as f:
        f.write(data)

    char.portrait_url = f"/uploads/portraits/{filename}"
    db.commit()
    return PortraitOut(portrait_url=char.portrait_url)


@router.delete("/{character_id}", status_code=204)
def delete_portrait(
    character_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = db.query(Character).filter(
        Character.id == character_id,
        Character.user_id == current_user.id,
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    if char.portrait_url:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(char.portrait_url))
        if os.path.exists(old_path):
            os.remove(old_path)
        char.portrait_url = None
        db.commit()


# ── Monster portraits (GM/admin only) ────────────────────────────────────────

@router.post("/monster/{monster_id}", response_model=PortraitOut)
async def upload_monster_portrait(
    monster_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a portrait for a monster. GM must own the group the monster belongs to."""
    if current_user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="Only GMs and admins can upload monster portraits.")

    monster = db.query(Monster).filter(Monster.id == monster_id).first()
    if not monster:
        raise HTTPException(status_code=404, detail="Monster not found.")

    if current_user.role == UserRole.gm:
        group = db.query(Group).filter(
            Group.id == monster.group_id,
            Group.gm_id == current_user.id,
        ).first()
        if not group:
            raise HTTPException(status_code=403, detail="Monster is not in one of your groups.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Allowed formats: jpg, png, webp, gif.")

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB).")

    if monster.portrait_url:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(monster.portrait_url))
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"monster_{monster_id}_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, filename)
    with open(dest, "wb") as f:
        f.write(data)

    monster.portrait_url = f"/uploads/portraits/{filename}"
    db.commit()
    return PortraitOut(portrait_url=monster.portrait_url)


@router.delete("/monster/{monster_id}", status_code=204)
def delete_monster_portrait(
    monster_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="Only GMs and admins can delete monster portraits.")

    monster = db.query(Monster).filter(Monster.id == monster_id).first()
    if not monster:
        raise HTTPException(status_code=404, detail="Monster not found.")

    if monster.portrait_url:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(monster.portrait_url))
        if os.path.exists(old_path):
            os.remove(old_path)
        monster.portrait_url = None
        db.commit()
