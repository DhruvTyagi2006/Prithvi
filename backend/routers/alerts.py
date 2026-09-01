from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.schemas.alert import AlertListResponse
from backend.services.alert_service import (
    get_all_alerts,
    get_alerts_for_location,
)
from backend.database.connection import get_db


router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
)


@router.get(
    "",
    response_model=AlertListResponse,
    summary="List current environmental alerts",
)
def list_alerts(
    db: Session = Depends(get_db),
):
    alerts = get_all_alerts(db)

    return AlertListResponse(
        alerts=alerts,
        total=len(alerts),
    )


@router.get(
    "/{location_id}",
    response_model=AlertListResponse,
    summary="Get alerts for a location",
)
def get_location_alerts(
    location_id: str,
    db: Session = Depends(get_db),
):
    alerts = get_alerts_for_location(
        location_id,
        db,
    )

    return AlertListResponse(
        alerts=alerts,
        total=len(alerts),
    )