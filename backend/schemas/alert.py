from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AlertOut(BaseModel):
    id: str
    location_id: str
    sensor_id: str
    state: str | None = None
    district: str | None = None
    alert_type: str
    risk_level: str
    probability: float
    message: str
    recommended_action: str
    timestamp: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class AlertListResponse(BaseModel):
    alerts: list[AlertOut]
    total: int