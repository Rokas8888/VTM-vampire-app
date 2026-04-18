from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from app.models.user import User, RefreshToken
import secrets

# bcrypt is used to hash passwords — never store plain text passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Turn a plain text password into a secure hash."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if a plain text password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int, role: str) -> str:
    """Create a short-lived JWT access token (30 minutes by default)."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token. Raises JWTError if invalid."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def create_refresh_token(user_id: int, db: Session) -> str:
    """Create a long-lived refresh token and save it to the database."""
    token_str = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    db_token = RefreshToken(token=token_str, user_id=user_id, expires_at=expires_at)
    db.add(db_token)
    db.commit()

    return token_str


def get_user_by_username(username: str, db: Session) -> User | None:
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(user_id: int, db: Session) -> User | None:
    return db.query(User).filter(User.id == user_id).first()
