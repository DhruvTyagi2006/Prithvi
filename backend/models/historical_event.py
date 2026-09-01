"""
HistoricalEvent = a past flood/landslide occurrence (PRD sec. 10.4 / 22).

Stored by its own lat/lng rather than a hard FK to Location: historical
records rarely line up exactly with today's village boundaries/points, and
the PRD only asks for a "geographic relationship... where appropriate"
(implementation notes sec. 6) — nearest-location matching, if needed, is a
query-time concern for Developer 2's feature engineering, not a schema
constraint.
"""
from datetime import date as date_type

from sqlalchemy import Date, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.connection import Base


class HistoricalEvent(Base):
    __tablename__ = "historical_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)  # FLOOD / LANDSLIDE
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)  # e.g. LOW/MODERATE/HIGH/CRITICAL
