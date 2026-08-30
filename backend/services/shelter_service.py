from sqlalchemy.orm import Session

from backend.models.shelter import Shelter
from backend.services.geo import haversine_km


def get_all_shelters(db: Session) -> list[Shelter]:
    return db.query(Shelter).order_by(Shelter.name).all()


def get_nearest_shelter(
    db: Session, latitude: float, longitude: float
) -> tuple[Shelter, float] | None:
    """
    Returns (shelter, distance_km) for the closest shelter to the given
    point, or None if no shelters exist. O(n) scan — fine for the handful
    of demo shelters in this MVP; do not add PostGIS/spatial indexing for
    a 5-day hackathon (see "do not over-engineer" in project instructions).
    """
    shelters = db.query(Shelter).all()
    if not shelters:
        return None

    best_shelter = None
    best_distance = float("inf")
    for shelter in shelters:
        distance = haversine_km(latitude, longitude, shelter.latitude, shelter.longitude)
        if distance < best_distance:
            best_distance = distance
            best_shelter = shelter

    return best_shelter, round(best_distance, 2)
