from sqlalchemy.orm import Session

from backend.models.location import Location


def get_all_locations(db: Session) -> list[Location]:
    return db.query(Location).order_by(Location.name).all()


def get_location_by_id(db: Session, location_id: str) -> Location | None:
    return db.query(Location).filter(Location.id == location_id).first()
