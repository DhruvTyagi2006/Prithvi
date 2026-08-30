"""
Sensor = a physical/simulated IoT device at a location (PRD sec. 22).

Owned structurally here (shared foundation), but populated/updated by
Developer 3's IoT simulator via GET/POST /sensors* endpoints, which are out
of scope for this module (see implementation notes sec. 4 and 22).
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.connection import Base


class Sensor(Base):
    __tablename__ = "sensors"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    location_id: Mapped[str] = mapped_column(
        String, ForeignKey("locations.id"), nullable=False
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    sensor_type: Mapped[str] = mapped_column(String, nullable=False)
    # ONLINE / WARNING / OFFLINE — kept as a plain string rather than a DB
    # enum so Developer 3 can extend statuses without a migration.
    status: Mapped[str] = mapped_column(String, nullable=False, default="ONLINE")
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    location = relationship("Location", back_populates="sensors")
    readings = relationship(
        "SensorReading", back_populates="sensor", cascade="all, delete-orphan"
    )
