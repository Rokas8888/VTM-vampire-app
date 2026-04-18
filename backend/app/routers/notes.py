from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.group import Group, GroupMember
from app.models.chronicle_note import ChronicleNote

router = APIRouter(prefix="/api/notes", tags=["notes"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    group_id:  int
    note_type: str          # "summary" | "personal"
    title:     Optional[str] = None
    content:   str

class NoteUpdate(BaseModel):
    title:   Optional[str] = None
    content: Optional[str] = None

class NoteOut(BaseModel):
    id:        int
    group_id:  int
    user_id:   int
    username:  str
    note_type: str
    title:     Optional[str]
    content:   str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def assert_member_or_gm(group_id: int, user: User, db: Session):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if user.role in (UserRole.gm, UserRole.admin):
        return group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    return group


def note_out(note: ChronicleNote) -> NoteOut:
    return NoteOut(
        id=note.id,
        group_id=note.group_id,
        user_id=note.user_id,
        username=note.user.username,
        note_type=note.note_type,
        title=note.title,
        content=note.content,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/group/{group_id}", response_model=List[NoteOut])
def list_notes(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notes for a group. GM/admin sees all; players see summaries + their own personal notes."""
    assert_member_or_gm(group_id, current_user, db)

    query = db.query(ChronicleNote).filter(ChronicleNote.group_id == group_id)
    if current_user.role == UserRole.player:
        # Players see session summaries (all) + their own personal notes
        from sqlalchemy import or_
        query = query.filter(
            or_(
                ChronicleNote.note_type == "summary",
                ChronicleNote.user_id == current_user.id,
            )
        )
    notes = query.order_by(ChronicleNote.created_at.desc()).all()
    for n in notes:
        _ = n.user  # eager load
    return [note_out(n) for n in notes]


@router.post("", response_model=NoteOut, status_code=201)
def create_note(
    body: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a note. Players can only create personal notes; GMs can create summaries."""
    assert_member_or_gm(body.group_id, current_user, db)

    if body.note_type not in ("summary", "personal"):
        raise HTTPException(status_code=400, detail="note_type must be 'summary' or 'personal'.")
    if body.note_type == "summary" and current_user.role == UserRole.player:
        raise HTTPException(status_code=403, detail="Only GMs can write session summaries.")
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty.")

    note = ChronicleNote(
        group_id=body.group_id,
        user_id=current_user.id,
        note_type=body.note_type,
        title=body.title,
        content=body.content.strip(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    _ = note.user
    return note_out(note)


@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: int,
    body: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a note. Only the author (or admin) can edit."""
    note = db.query(ChronicleNote).filter(ChronicleNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    if note.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your note.")

    if body.title is not None:
        note.title = body.title
    if body.content is not None:
        if not body.content.strip():
            raise HTTPException(status_code=400, detail="Content cannot be empty.")
        note.content = body.content.strip()

    db.commit()
    db.refresh(note)
    _ = note.user
    return note_out(note)


@router.delete("/{note_id}", status_code=204)
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a note. Author or admin only."""
    note = db.query(ChronicleNote).filter(ChronicleNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    if note.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your note.")
    db.delete(note)
    db.commit()
