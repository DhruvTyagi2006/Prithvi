"""
Shared Sensor contract. GET/POST /sensors* endpoints are owned by Developer 3
(IoT/risk/alerts) — these schemas exist so the request/response shape is
agreed on up front and the router can be plugged in without redesigning the
data layer.
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class SensorStatus(str, Enum):
    ONLINE = "ONLINE"
    WARNING = "WARNING"
    OFFLINE = "OFFLINE"


class SensorBase(BaseModel):
    location_id: str = Field(..., examples=["loc-001"])
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    sensor_type: str = Field(..., examples=["rain-gauge", "soil-probe", "slope-extensometer"])
    status: SensorStatus = SensorStatus.ONLINE


class SensorCreate(SensorBase):
    id: str = Field(..., examples=["SEN-001"])


class SensorOut(SensorBase):
    id: str
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)
class SensorListResponse(BaseModel):
    sensors: list[SensorOut]
    total: int