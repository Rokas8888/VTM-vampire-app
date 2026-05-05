from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.character import Character
from app.models.message import Message
from app.schemas.message import MessageCreate, MessageOut

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _active_filter():
    """Exclude messages whose ephemeral timer has expired."""
    now = _now()
    return or_(Message.expires_at == None, Message.expires_at > now)  # noqa: E711


def _to_out(msg: Message) -> MessageOut:
    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_username=msg.sender.username,
        subject=msg.subject,
        body=msg.body,
        is_read=msg.is_read,
        ephemeral=msg.is_ephemeral,
        expires_at=msg.expires_at,
        created_at=msg.created_at,
    )


@router.post("", response_model=MessageOut, status_code=201)
def send_message(
    body: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GM/admin sends a secret message to a character."""
    if current_user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="Only GMs and admins can send messages.")
    if not body.body.strip():
        raise HTTPException(status_code=400, detail="Message body cannot be empty.")

    char = db.query(Character).filter(Character.id == body.character_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    msg = Message(
        sender_id=current_user.id,
        character_id=body.character_id,
        subject=body.subject.strip() if body.subject and body.subject.strip() else None,
        body=body.body.strip(),
        is_ephemeral=body.ephemeral,
        # expires_at intentionally not set here — timer starts on first open
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _to_out(msg)


@router.put("/{message_id}/open", response_model=MessageOut)
def open_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Player opens a message — marks read and starts ephemeral timer on first open."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    char = db.query(Character).filter(
        Character.id == msg.character_id,
        Character.user_id == current_user.id,
    ).first()
    if not char:
        raise HTTPException(status_code=403, detail="Not your message.")

    msg.is_read = True
    if msg.is_ephemeral and msg.expires_at is None:
        msg.expires_at = _now() + timedelta(minutes=15)
    db.commit()
    db.refresh(msg)
    return _to_out(msg)


@router.get("/character/{character_id}", response_model=List[MessageOut])
def get_character_messages(
    character_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all non-expired messages for a character. Only the character's owner can read."""
    char = db.query(Character).filter(
        Character.id == character_id,
        Character.user_id == current_user.id,
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    msgs = (
        db.query(Message)
        .filter(Message.character_id == character_id, _active_filter())
        .order_by(Message.created_at.desc())
        .all()
    )
    return [_to_out(m) for m in msgs]


@router.get("/character/{character_id}/unread-count")
def get_unread_count(
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

    count = db.query(Message).filter(
        Message.character_id == character_id,
        Message.is_read == False,  # noqa: E712
        _active_filter(),
    ).count()
    return {"count": count}


@router.put("/character/{character_id}/read-all", status_code=204)
def mark_all_read(
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

    db.query(Message).filter(
        Message.character_id == character_id,
        Message.is_read == False,  # noqa: E712
        _active_filter(),
    ).update({"is_read": True})
    db.commit()
