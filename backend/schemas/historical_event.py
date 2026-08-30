from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class HistoricalEventBase(BaseModel):
    event_type: str = Field(..., examples=["FLOOD", "LANDSLIDE"])
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    date: date
    severity: str = Field(..., examples=["LOW", "MODERATE", "HIGH", "CRITICAL"])


class HistoricalEventCreate(HistoricalEventBase):
    id: str = Field(..., examples=["hist-001"])


class HistoricalEventOut(HistoricalEventBase):
    id: str

    model_config = ConfigDict(from_attributes=True)
