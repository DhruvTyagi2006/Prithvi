"""
RiskPrediction = one ML/risk-engine output for a location at a point in time
(PRD sec. 22). Written by Developer 2's prediction pipeline (POST /predict);
read by Developer 3's alert logic and by the frontend's location/dashboard
views. Owned structurally here so there is a single shared definition.
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.connection import Base


class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[str] = mapped_column(
        String, ForeignKey("locations.id"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    flood_probability: Mapped[float] = mapped_column(Float, nullable=False)
    landslide_probability: Mapped[float] = mapped_column(Float, nullable=False)
    # LOW / MODERATE / HIGH / CRITICAL, per PRD sec. 12. Configurable
    # thresholds live in the risk-engine code (Developer 3), not the DB.
    overall_risk: Mapped[str] = mapped_column(String, nullable=False)
    # Minutes; nullable because a LOW-risk prediction may have no meaningful
    # warning window (mirrors `leadTimeMinutes: null` in the frontend mock).
    lead_time: Mapped[int | None] = mapped_column(Integer, nullable=True)

    location = relationship("Location", back_populates="risk_predictions")
