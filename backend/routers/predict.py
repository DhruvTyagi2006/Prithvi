from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.location import Location
from backend.schemas.predict import PredictionRequest, PredictionResponse
from backend.services.prediction_service import predict_risk


router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post("", response_model=PredictionResponse)
def predict(
    payload: PredictionRequest,
    db: Session = Depends(get_db),
):
    location = (
        db.query(Location)
        .filter(
            Location.latitude.between(
                payload.latitude - 0.001,
                payload.latitude + 0.001,
            ),
            Location.longitude.between(
                payload.longitude - 0.001,
                payload.longitude + 0.001,
            ),
        )
        .first()
    )

    result = predict_risk(
        rainfall_1h=payload.rainfall_1h,
        rainfall_6h=payload.rainfall_6h,
        rainfall_24h=payload.rainfall_24h,
        soil_moisture=payload.soil_moisture,
        slope=payload.slope,
        elevation=payload.elevation,
        aspect=0.0,
    )

    return PredictionResponse(
        location=location.name if location else "Unknown location",
        flood_probability=result.flood_probability,
        landslide_probability=result.landslide_probability,
        overall_risk=result.overall_risk,
        estimated_lead_time_minutes=result.lead_time,
        recommended_action=result.recommended_action,
    )