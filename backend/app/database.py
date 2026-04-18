from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import DATABASE_URL

# Create the database engine (the connection to PostgreSQL)
engine = create_engine(DATABASE_URL)

# SessionLocal is a factory — call it to get a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class that all our database models will inherit from
class Base(DeclarativeBase):
    pass

# Dependency — used in route handlers to get a DB session, then close it when done
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
