"""
SQLAlchemy engine/session setup shared by every model and router.

Everyone (data/ML/IoT modules) imports `Base` from here so there is ONE
metadata registry and ONE source of truth for the schema — see PRD
integration requirement in section 14 of the implementation notes
("Do not create duplicate database models in separate modules").
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.config import get_settings

settings = get_settings()

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    # Needed for SQLite + FastAPI's threaded request handling.
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that yields a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Create all tables from the shared metadata.

    Simple `create_all()` is intentionally used instead of Alembic migrations
    for this 5-day hackathon MVP (see "do not over-engineer" in the project
    instructions). Swap in Alembic later without changing model code.
    """
    # Import models so they register on Base.metadata before create_all().
    from backend.models import (  # noqa: F401
        historical_event,
        location,
        risk_prediction,
        sensor,
        sensor_reading,
        shelter,
    )

    Base.metadata.create_all(bind=engine)


def check_db_connection() -> bool:
    """Used by GET /health to report DB connectivity."""
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return True
    except Exception:
        return False
