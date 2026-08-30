"""
Shared SensorReading contract, written by Developer 3's simulator
(POST /sensors/data) and read by Developer 2's prediction pipeline.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SensorReadingBase(BaseModel):
    rainfall: float | None = Field(None, ge=0, description="mm/h")
    soil_moisture: float | None = Field(None, ge=0, le=100, description="Percent.")
    slope_movement: float | None = Field(None, ge=0, description="mm.")


class SensorReadingCreate(SensorReadingBase):
    sensor_id: str = Field(..., examples=["SEN-001"])
    timestamp: datetime | None = Field(
        None, description="Defaults to server time if omitted."
    )


class SensorReadingOut(SensorReadingBase):
    id: int
    sensor_id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
