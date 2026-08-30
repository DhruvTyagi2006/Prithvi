"""
Integration placeholders for the endpoints owned by Developer 2 (ML/
prediction) and Developer 3 (IoT/risk/alerts/simulation) — see
implementation notes sec. 4 and 22.

These are intentionally NOT implemented here. They exist only so:
  1. The agreed request/response contracts (schemas/*.py) are visible in
     Swagger for the whole team to review.
  2. `main.py` has a single place mounting every route in the PRD's API
     surface (sec. 20), so nobody has to restructure the app when the real
     routers land.

Replace each stub below with a real router in routers/predict.py,
routers/sensors.py, routers/risk.py, routers/alerts.py, and
routers/simulation.py as those modules are implemented, then remove the
matching stub here and its `include_router` call in main.py.
"""
from fastapi import APIRouter, HTTPException, status

from backend.schemas.predict import PredictionRequest, PredictionResponse
from backend.schemas.sensor import SensorOut
from backend.schemas.sensor_reading import SensorReadingCreate, SensorReadingOut

router = APIRouter(tags=["not-yet-implemented"])

_NOT_IMPLEMENTED = "Not yet implemented — owned by another module. See routers/placeholders.py."


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="[Placeholder] Run flood/landslide prediction (Developer 2)",
    description="Contract only — see PRD sec. 15/21. Implementation owned by the ML module.",
)
def predict(payload: PredictionRequest):
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get(
    "/risk/{location_id}",
    summary="[Placeholder] Get current risk for a location (Developer 2)",
)
def get_risk(location_id: str):
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get(
    "/sensors",
    response_model=list[SensorOut],
    summary="[Placeholder] List sensors (Developer 3)",
)
def list_sensors():
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get(
    "/sensors/{sensor_id}",
    response_model=SensorOut,
    summary="[Placeholder] Get a single sensor (Developer 3)",
)
def get_sensor(sensor_id: str):
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.post(
    "/sensors/data",
    response_model=SensorReadingOut,
    summary="[Placeholder] Ingest a sensor reading (Developer 3)",
)
def post_sensor_data(payload: SensorReadingCreate):
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get(
    "/alerts",
    summary="[Placeholder] List alerts (Developer 3)",
)
def list_alerts():
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get(
    "/alerts/{location_id}",
    summary="[Placeholder] Get alerts for a location (Developer 3)",
)
def get_alerts_for_location(location_id: str):
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.post(
    "/simulation/start",
    summary="[Placeholder] Start a simulation run (Developer 3)",
)
def start_simulation():
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.post(
    "/simulation/step",
    summary="[Placeholder] Advance a simulation run (Developer 3)",
)
def step_simulation():
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)
