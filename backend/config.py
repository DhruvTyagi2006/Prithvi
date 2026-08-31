"""
Centralized configuration, loaded from environment variables.

Do not hardcode credentials here. Copy `.env.example` to `.env` and adjust.
"""
import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Primary target is PostgreSQL (per PRD sec. 9), e.g.:
    #   postgresql+psycopg2://user:password@localhost:5432/prithvi
    # Falls back to a local SQLite file with zero config so any teammate can
    # `uvicorn main:app --reload` immediately without standing up Postgres.
    # Swap in a real DATABASE_URL for Postgres/Supabase/Neon at any time —
    # nothing else in the app needs to change.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./prithvi.db")

    # CORS - the Vite dev server default plus any deployed frontend origin.
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")

    API_TITLE: str = "Prithvi Backend API"
    API_DESCRIPTION: str = (
        "Core API foundation for Prithvi (hyper-local flash flood & landslide "
        "early-warning system). Owns locations, shelters, and the shared "
        "database/schema contracts that the ML (prediction) and IoT/risk/alert "
        "modules build on."
    )
    API_VERSION: str = "0.1.0"


@lru_cache
def get_settings() -> Settings:
    return Settings()
