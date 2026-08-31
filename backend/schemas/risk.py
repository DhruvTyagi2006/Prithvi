from pydantic import BaseModel, Field


class SimulationStartRequest(BaseModel):
    location_id: str


class SimulationStepRequest(BaseModel):
    location_id: str
    rainfall: float = Field(ge=0)
    soil_moisture: float = Field(ge=0, le=100)
    slope_movement: float = Field(ge=0)


class SimulationResponse(BaseModel):
    location_id: str
    rainfall: float
    soil_moisture: float
    slope_movement: float
    flood_probability: float = Field(ge=0, le=1)
    landslide_probability: float = Field(ge=0, le=1)
    overall_risk: str
    lead_time: int | None = Field(default=None, ge=0)
    recommended_action: str