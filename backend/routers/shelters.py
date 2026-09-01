from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.schemas.common import ErrorResponse
from backend.schemas.shelter import ShelterNearestOut, ShelterOut
from backend.services import shelter_service

router = APIRouter(prefix="/shelters", tags=["shelters"])


@router.get(
    "",
    response_model=list[ShelterOut],
    summary="List all shelters",
    description="Returns every designated evacuation shelter (PRD sec. 19/22).",
)
def list_shelters(db: Session = Depends(get_db)) -> list[ShelterOut]:
    shelters = shelter_service.get_all_shelters(db)
    return [ShelterOut.model_validate(s) for s in shelters]


@router.get(
    "/nearest",
    response_model=ShelterNearestOut,
    responses={404: {"model": ErrorResponse, "description": "No shelters exist"}},
    summary="Find the nearest shelter to a point",
    description=(
        "Given a latitude/longitude, returns the closest shelter with its "
        "distance computed dynamically (great-circle, no routing) — see "
        "PRD sec. 19."
    ),
)
def get_nearest_shelter(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude of the query point."),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude of the query point."),
    db: Session = Depends(get_db),
) -> ShelterNearestOut:
    result = shelter_service.get_nearest_shelter(db, latitude, longitude)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No shelters are registered.",
        )
    shelter, distance_km = result
    return ShelterNearestOut(
        id=shelter.id,
        name=shelter.name,
        latitude=shelter.latitude,
        longitude=shelter.longitude,
        capacity=shelter.capacity,
        distance_km=distance_km,
    )
