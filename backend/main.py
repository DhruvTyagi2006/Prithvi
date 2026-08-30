from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.database.connection import init_db
from backend.routers import health, locations, placeholders, shelters

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Core endpoints owned by this module.
app.include_router(health.router)
app.include_router(locations.router)
app.include_router(shelters.router)

# Contract-only placeholders for Developer 2 (ML) and Developer 3 (IoT/risk/
# alerts) — see routers/placeholders.py for how to replace these.
app.include_router(placeholders.router)
