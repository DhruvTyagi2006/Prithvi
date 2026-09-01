from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.schemas.sensor import (
    SensorListResponse,
    SensorOut,
)
from backend.schemas.sensor_reading import (
    SensorReadingCreate,
    SensorReadingOut,
)
from backend.services.sensor_data_service import (
    create_sensor_reading,
    get_all_sensors,
    get_sensor,
    get_sensor_readings,
)


router = APIRouter(
    prefix="/sensors",
    tags=["Sensors"],
)


@router.get(
    "",
    response_model=SensorListResponse,
    summary="List all sensors",
)
def list_sensors(
    location_id: str | None = Query(
        default=None,
        description="Filter sensors by location ID.",
    ),
    db: Session = Depends(get_db),
):
    sensors = get_all_sensors(db)

    if location_id is not None:
        sensors = [
            sensor
            for sensor in sensors
            if sensor["location_id"] == location_id
        ]

    return SensorListResponse(
        sensors=sensors,
        total=len(sensors),
    )


@router.get(
    "/{sensor_id}",
    response_model=SensorOut,
    summary="Get a single sensor",
)
def get_single_sensor(
    sensor_id: str,
    db: Session = Depends(get_db),
):
    sensor = get_sensor(
        sensor_id,
        db,
    )

    if sensor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sensor '{sensor_id}' not found.",
        )

    return sensor


@router.get(
    "/{sensor_id}/readings",
    summary="Get sensor readings",
)
def get_readings(
    sensor_id: str,
    limit: int = Query(
        default=100,
        ge=1,
        le=1000,
        description="Maximum number of readings to return.",
    ),
    db: Session = Depends(get_db),
):
    sensor = get_sensor(
        sensor_id,
        db,
    )

    if sensor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sensor '{sensor_id}' not found.",
        )

    readings = get_sensor_readings(
        sensor_id=sensor_id,
        limit=limit,
        db=db,
    )

    return {
        "sensor_id": sensor_id,
        "count": len(readings),
        "readings": readings,
    }


@router.post(
    "/data",
    response_model=SensorReadingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a sensor reading",
)
def post_sensor_data(
    payload: SensorReadingCreate,
    db: Session = Depends(get_db),
):
    timestamp = (
        payload.timestamp
        or datetime.now(timezone.utc)
    )

    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(
            tzinfo=timezone.utc
        )

    reading = create_sensor_reading(
        db=db,
        sensor_id=payload.sensor_id,
        timestamp=timestamp,
        rainfall=payload.rainfall,
        soil_moisture=payload.soil_moisture,
        slope_movement=payload.slope_movement,
    )

    if reading is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Sensor '{payload.sensor_id}' "
                "not found."
            ),
        )

    return reading