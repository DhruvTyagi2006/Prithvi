"""
Shelter = a designated evacuation site (PRD sec. 22).

`distance_km` from the frontend mock is NOT stored — it's request-relative
(distance from wherever the request's lat/lng is), so it's computed on the
fly in /shelters/nearest instead of persisted as static data.
"""
from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.connection import Base


class Shelter(Base):
    __tablename__ = "shelters"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
