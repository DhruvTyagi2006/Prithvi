from pydantic import BaseModel, ConfigDict, Field


class ShelterBase(BaseModel):
    name: str = Field(
        ...,
        examples=["Kaudiyala Community Hall"],
    )

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
        examples=[30.226],
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
        examples=[78.481],
    )

    # 0 means the source did not provide a known capacity.
    # We allow 0 because the shelter database contains
    # legitimate facilities with unknown capacity.
    capacity: int = Field(
        ...,
        ge=0,
        examples=[300],
    )


class ShelterCreate(ShelterBase):
    id: str = Field(
        ...,
        examples=["shelter-001"],
    )


class ShelterOut(ShelterBase):
    id: str

    model_config = ConfigDict(
        from_attributes=True,
    )


class ShelterNearestOut(ShelterOut):
    """Response for GET /shelters/nearest — adds the dynamically computed distance."""

    distance_km: float = Field(
        ...,
        description="Great-circle distance from the queried point.",
        examples=[0.6],
    )