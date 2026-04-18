from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


# What the client sends when registering
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.player  # defaults to player, but gm is also selectable


# What the client sends when logging in
class LoginRequest(BaseModel):
    username: str
    password: str


# What we send back after a successful login or token refresh
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# What we send back when asked about the current user
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True  # allows creating this from a SQLAlchemy model


# What the client sends to get a new access token
class RefreshRequest(BaseModel):
    refresh_token: str
