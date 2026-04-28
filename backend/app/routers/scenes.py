from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import List, Any
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.scene import Scene

router = APIRouter(prefix="/api/scenes", tags=["scenes"])


class SceneSave(BaseModel):
    name: str
    data: List[Any]


class SceneOut(BaseModel):
    id:         int
    group_id:   int
    name:       str
    data:       List[Any]
    updated_at: datetime

    class Config:
        from_attributes = True


def assert_gm_owns_group(group_id: int, user: User, db: Session) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="GM or admin access required.")
    return group


@router.get("/{group_id}", response_model=SceneOut)
def get_scene(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assert_gm_owns_group(group_id, current_user, db)
    scene = db.query(Scene).filter(Scene.group_id == group_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="No saved scene for this group.")
    return scene


@router.put("/{group_id}", response_model=SceneOut)
def save_scene(
    group_id: int,
    body: SceneSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assert_gm_owns_group(group_id, current_user, db)
    scene = db.query(Scene).filter(Scene.group_id == group_id).first()
    if scene:
        scene.name = body.name
        scene.data = body.data
    else:
        scene = Scene(group_id=group_id, name=body.name, data=body.data)
        db.add(scene)
    db.commit()
    db.refresh(scene)
    return scene
