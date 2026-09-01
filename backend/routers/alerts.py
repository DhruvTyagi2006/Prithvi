from fastapi import APIRouter

from backend.schemas.alert import AlertListResponse
from backend.services.alert_service import (
    get_all_alerts,
    get_alerts_for_location,
)


router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
)


@router.get(
    "",
    response_model=AlertListResponse,
    summary="List current environmental alerts",
)
def list_alerts():
    alerts = get_all_alerts()

    return AlertListResponse(
        alerts=alerts,
        total=len(alerts),
    )


@router.get(
    "/{location_id}",
    response_model=AlertListResponse,
    summary="Get alerts for a location",
)
def get_location_alerts(location_id: str):
    alerts = get_alerts_for_location(location_id)

    return AlertListResponse(
        alerts=alerts,
        total=len(alerts),
    )