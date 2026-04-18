from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, RefreshRequest
from app.models.user import User, UserRole, RefreshToken
from app.services.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_access_token,
    get_user_by_username, get_user_by_id,
)
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new account. Role must be 'player' or 'gm' — admins are created via CLI only."""

    # Admins cannot self-register
    if body.role == UserRole.admin:
        raise HTTPException(status_code=400, detail="Cannot register as admin")

    # Check username and email are not already taken
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create the user
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Issue tokens so they're logged in immediately after registering
    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id, db)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Log in with username + password, get back JWT tokens."""
    user = get_user_by_username(body.username, db)

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id, db)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Use a refresh token to get a new access token without logging in again."""
    db_token = db.query(RefreshToken).filter(RefreshToken.token == body.refresh_token).first()

    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Check it hasn't expired
    if db_token.expires_at < datetime.now(timezone.utc):
        db.delete(db_token)
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired, please log in again")

    user = get_user_by_id(db_token.user_id, db)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    # Rotate: delete old refresh token, issue new ones
    db.delete(db_token)
    new_access = create_access_token(user.id, user.role.value)
    new_refresh = create_refresh_token(user.id, db)

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the currently logged-in user's info."""
    return current_user
