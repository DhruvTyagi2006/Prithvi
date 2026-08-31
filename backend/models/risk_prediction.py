from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.connection import Base


class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    location_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("locations.id"),
        nullable=False,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    flood_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    landslide_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    overall_risk: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    lead_time: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    location = relationship(
        "Location",
        back_populates="risk_predictions",
    )