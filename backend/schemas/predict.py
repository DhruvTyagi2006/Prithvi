"""
Shared contract for POST /predict, matching the PRD's example request/
response exactly (PRD sec. 15 / 21). Developer 2 owns the implementation;
this schema exists so all three developers agree on the shape up front and
so the placeholder route in routers/placeholders.py documents it correctly
in Swagger.
"""
from pydantic import BaseModel, Field

from backend.schemas.risk_prediction import RiskLevel


class PredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, examples=[30.12])
    longitude: float = Field(..., ge=-180, le=180, examples=[78.32])
    rainfall_1h: float = Field(..., ge=0, examples=[42])
    rainfall_6h: float = Field(..., ge=0, examples=[116])
    rainfall_24h: float = Field(..., ge=0, examples=[210])
    soil_moisture: float = Field(..., ge=0, le=100, examples=[83])
    slope: float = Field(..., ge=0, examples=[34])
    elevation: float = Field(..., examples=[1450])


class PredictionResponse(BaseModel):
    location: str = Field(..., examples=["Village A"])
    flood_probability: float = Field(..., ge=0, le=1, examples=[0.82])
    landslide_probability: float = Field(..., ge=0, le=1, examples=[0.76])
    overall_risk: RiskLevel
    estimated_lead_time_minutes: int = Field(..., examples=[90])
    recommended_action: str = Field(
        ..., examples=["Evacuate vulnerable areas and move toward the nearest designated shelter."]
    )
