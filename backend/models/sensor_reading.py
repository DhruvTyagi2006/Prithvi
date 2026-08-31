"""
SensorReading = one time-stamped observation from a Sensor (PRD sec. 22).

This is where the frontend's per-location environmental fields
(rainfall, soilMoisture, slope movement) actually live in the data model —
not on Location. Developer 3's simulator writes rows here; Developer 2's
prediction pipeline reads the latest rows as ML feature inputs.
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.connection import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sensor_id: Mapped[str] = mapped_column(
        String, ForeignKey("sensors.id"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    rainfall: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture: Mapped[float | None] = mapped_column(Float, nullable=True)
    slope_movement: Mapped[float | None] = mapped_column(Float, nullable=True)

    sensor = relationship("Sensor", back_populates="readings")
