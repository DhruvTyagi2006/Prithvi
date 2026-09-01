from pydantic import BaseModel, ConfigDict, Field


class LocationBase(BaseModel):
    name: str = Field(..., examples=["Kaudiyala"])
    district: str = Field(..., examples=["Tehri Garhwal"])
    state: str = Field(..., examples=["Uttarakhand"])
    population: int = Field(..., ge=0, examples=[1420])
    latitude: float = Field(..., ge=-90, le=90, examples=[30.221])
    longitude: float = Field(..., ge=-180, le=180, examples=[78.478])
    elevation: float | None = Field(None, description="Meters above sea level.")
    slope: float | None = Field(None, description="Degrees.")
    soil_type: str | None = Field(None, examples=["Sandy loam"])


class LocationCreate(LocationBase):
    id: str = Field(..., examples=["loc-001"])
    nearest_shelter_id: str | None = None


class LocationOut(LocationBase):
    id: str
    nearest_shelter_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LocationDetailOut(LocationOut):
    """
    Response for GET /locations/{location_id}.

    Deliberately does NOT embed current risk/sensor/shelter data inline —
    the frontend fetches those from their own endpoints (/shelters/nearest,
    the ML module's /risk/{id}, the IoT module's /sensors) as noted in
    implementation section 10. This keeps the location layer free of ML
    logic while still telling the frontend where to look next.
    """

    related_endpoints: dict[str, str] = Field(
        default_factory=dict,
        description="Pointers to where the frontend can fetch current "
        "risk/sensor/shelter data for this location.",
        examples=[
            {
                "shelters_nearest": "/shelters/nearest?latitude=30.221&longitude=78.478",
                "risk": "/risk/loc-001",
                "sensors": "/sensors?location_id=loc-001",
            }
        ],
    )
