"""
Integration placeholders for endpoints owned by the remaining modules.

The alert endpoints are implemented using services.alert_service.
Other endpoints remain placeholders until their respective modules
are fully integrated.
"""

from fastapi import APIRouter, HTTPException, status

from backend.schemas.predict import PredictionRequest, PredictionResponse
from backend.schemas.sensor import SensorOut
from backend.schemas.sensor_reading import (
    SensorReadingCreate,
    SensorReadingOut,
)

from backend.services.alert_service import (
    get_all_alerts,
    get_alerts_for_location,
)


router = APIRouter(tags=["integration"])


_NOT_IMPLEMENTED = (
    "Not yet implemented — owned by another module."
)


# =====================================================
# PREDICTION
# =====================================================

@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="[Placeholder] Run flood/landslide prediction (Developer 2)",
    description=(
        "Contract only — see PRD sec. 15/21. "
        "Implementation owned by the ML module."
    ),
)
def predict(payload: PredictionRequest):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=_NOT_IMPLEMENTED,
    )


# =====================================================
# SENSORS
# =====================================================




@router.post(
    "/sensors/data",
    response_model=SensorReadingOut,
    summary="[Placeholder] Ingest a sensor reading (Developer 3)",
)
def post_sensor_data(payload: SensorReadingCreate):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=_NOT_IMPLEMENTED,
    )


# =====================================================
# ALERTS
# =====================================================

@router.get(
    "/alerts",
    summary="List current disaster alerts",
    description=(
        "Returns alerts generated from the latest available "
        "environmental and sensor observations."
    ),
)
def list_alerts():
    return get_all_alerts()


@router.get(
    "/alerts/{location_id}",
    summary="Get alerts for a location",
    description=(
        "Returns alerts associated with the specified location."
    ),
)
def get_alerts_for_location_route(location_id: str):
    return get_alerts_for_location(location_id)