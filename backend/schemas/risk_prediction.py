"""
Shared RiskPrediction contract, written by Developer 2's prediction pipeline
(POST /predict persists a row here) and read by Developer 3's alert logic
and by the frontend's dashboard/location views (GET /risk/{location_id}).
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskPredictionBase(BaseModel):
    flood_probability: float = Field(..., ge=0, le=1)
    landslide_probability: float = Field(..., ge=0, le=1)
    overall_risk: RiskLevel
    lead_time: int | None = Field(None, description="Estimated warning window, in minutes.")


class RiskPredictionCreate(RiskPredictionBase):
    location_id: str = Field(..., examples=["loc-001"])
    timestamp: datetime | None = None


class RiskPredictionOut(RiskPredictionBase):
    id: int
    location_id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
