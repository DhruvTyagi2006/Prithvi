"""
Location = static/reference data for a village/ward (PRD sec. 22).

Deliberately holds ONLY static identity/geography fields. Environmental and
risk fields (rainfall, soil moisture, flood/landslide probability, etc.) from
the frontend's mockData.js are NOT stored here — those belong to
SensorReading and RiskPrediction, which reference a location by FK. See
implementation notes section 7 for the rationale.
"""
from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.connection import Base


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    district: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    population: Mapped[int] = mapped_column(Integer, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Terrain fields used as ML feature inputs (PRD sec. 10.3 / 11). Static
    # per location, unlike rainfall/soil moisture which change over time, so
    # they live here rather than on SensorReading.
    elevation: Mapped[float | None] = mapped_column(Float, nullable=True)
    slope: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_type: Mapped[str | None] = mapped_column(String, nullable=True)

    # FK is nullable: a location may not have an assigned shelter yet, and
    # shelter assignment for /shelters/nearest is computed dynamically anyway
    # (this just captures the frontend's mock "designated" shelter concept).
    nearest_shelter_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("shelters.id"), nullable=True
    )

    sensors = relationship(
        "Sensor", back_populates="location", cascade="all, delete-orphan"
    )
    risk_predictions = relationship(
        "RiskPrediction", back_populates="location", cascade="all, delete-orphan"
    )
