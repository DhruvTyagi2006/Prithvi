from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.location import Location
from backend.models.risk_prediction import RiskPrediction
from backend.models.sensor_reading import SensorReading
from backend.schemas.risk_prediction import RiskPredictionOut
from backend.services.risk_service import calculate_risk


router = APIRouter(prefix="/risk", tags=["Risk"])


@router.get("/{location_id}", response_model=RiskPredictionOut)
def get_location_risk(
    location_id: str,
    db: Session = Depends(get_db),
):
    location = (
        db.query(Location)
        .filter(Location.id == location_id)
        .first()
    )

    if location is None:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    prediction = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.location_id == location_id)
        .order_by(RiskPrediction.timestamp.desc())
        .first()
    )

    if prediction is not None:
        return prediction

    latest_reading = (
        db.query(SensorReading)
        .join(SensorReading.sensor)
        .filter(SensorReading.sensor.has(location_id=location_id))
        .order_by(SensorReading.timestamp.desc())
        .first()
    )

    if latest_reading is None:
        raise HTTPException(
            status_code=404,
            detail="No risk prediction or sensor data available for this location",
        )

    rainfall = latest_reading.rainfall or 0.0
    soil_moisture = latest_reading.soil_moisture or 0.0
    slope_movement = latest_reading.slope_movement or 0.0

    result = calculate_risk(
        rainfall=rainfall,
        soil_moisture=soil_moisture,
        slope_movement=slope_movement,
    )

    prediction = RiskPrediction(
        location_id=location_id,
        flood_probability=result.flood_probability,
        landslide_probability=result.landslide_probability,
        overall_risk=result.overall_risk.value,
        lead_time=result.lead_time,
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return prediction