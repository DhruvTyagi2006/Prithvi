from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.database.connection import init_db
from backend.routers import (
    health,
    locations,
    predict,
    sensors,
    shelters,
    risk,
    simulation,
    alerts,
)


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


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# ROUTERS
# =====================================================

app.include_router(health.router)
app.include_router(locations.router)
app.include_router(shelters.router)
app.include_router(risk.router)
app.include_router(simulation.router)
app.include_router(predict.router)
app.include_router(sensors.router)
app.include_router(alerts.router)