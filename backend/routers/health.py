from fastapi import APIRouter
from pydantic import BaseModel

from backend.database.connection import check_db_connection

router = APIRouter(tags=["health"])


class HealthOut(BaseModel):
    status: str
    database: str


@router.get(
    "/health",
    response_model=HealthOut,
    summary="Backend health check",
    description="Reports whether the API is up and whether it can reach the database.",
)
def health_check() -> HealthOut:
    db_ok = check_db_connection()
    return HealthOut(status="ok", database="connected" if db_ok else "unavailable")
