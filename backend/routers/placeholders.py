"""
Integration placeholders for endpoints owned by the remaining modules.

These routes exist so the agreed API contracts remain visible in Swagger
until the corresponding modules are implemented.
"""

from fastapi import APIRouter, HTTPException, status

from backend.schemas.predict import PredictionRequest, PredictionResponse
from backend.schemas.sensor import SensorOut
from backend.schemas.sensor_reading import SensorReadingCreate, SensorReadingOut


router = APIRouter(tags=["not-yet-implemented"])

_NOT_IMPLEMENTED = (
    "Not yet implemented — owned by another module. "
    "See routers/placeholders.py."
)


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
        status.HTTP_501_NOT_IMPLEMENTED,
        detail=_NOT_IMPLEMENTED,
    )


@router.get(
    "/sensors",
    response_model=list[SensorOut],
    summary="[Placeholder] List sensors (Developer 3)",
)
def list_sensors():
    raise HTTPException(
        status.HTTP_501_NOT_IMPLEMENTED,
        detail=_NOT_IMPLEMENTED,
    )


@router.get(
    "/sensors/{sensor_id}",
    response_model=SensorOut,
    summary="[Placeholder] Get a single sensor (Developer 3)",
)
def get_sensor(sensor_id: str):
    raise HTTPException(
        status.HTTP_501_NOT_IMPLEMENTED,
        detail=_NOT_IMPLEMENTED,
    )


@router.post(
    "/sensors/data",
    response_model=SensorReadingOut,
    summary="[Placeholder] Ingest a sensor reading (Developer 3)",
)
def post_sensor_data(payload: SensorReadingCreate):
    raise HTTPException(
        status.HTTP_501_NOT_IMPLEMENTED,
        detail=_NOT_IMPLEMENTED,
    )


@router.get(
    "/alerts",
    summary="[Placeholder] List alerts (Developer 3)",
)
def list_alerts():
    raise HTTPException(
        status.HTTP_501_NOT_IMPLEMENTED,
        detail=_NOT_IMPLEMENTED,
    )


@router.get(
    "/alerts/{location_id}",
    summary="[Placeholder] Get alerts for a location (Developer 3)",
)
def get_alerts_for_location(location_id: str):
    raise HTTPException(
        status.HTTP_501_NOT_IMPLEMENTED,
        detail=_NOT_IMPLEMENTED,
    )