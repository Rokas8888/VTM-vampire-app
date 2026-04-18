import os

# Database connection URL — comes from environment variable set in docker-compose.yml
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://vtm:vtmpassword@localhost:5432/vtmdb")

# JWT settings — used to sign and verify login tokens
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey_change_in_production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))
