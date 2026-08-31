from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.schemas.common import ErrorResponse
from backend.schemas.location import LocationDetailOut, LocationOut
from backend.services import location_service

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get(
    "",
    response_model=list[LocationOut],
    summary="List all locations",
    description=(
        "Returns every village/ward tracked by Prithvi. Used by the "
        "Dashboard location selector, Risk Map markers, and hyper-local "
        "location selection (PRD sec. 6/15)."
    ),
)
def list_locations(db: Session = Depends(get_db)) -> list[LocationOut]:
    locations = location_service.get_all_locations(db)
    return [LocationOut.model_validate(loc) for loc in locations]


@router.get(
    "/{location_id}",
    response_model=LocationDetailOut,
    responses={404: {"model": ErrorResponse, "description": "Location not found"}},
    summary="Get a single location",
    description=(
        "Returns static/reference details for one location (Location "
        "Details page). Does not include current risk, sensor, or shelter "
        "data — fetch those from their own endpoints using the pointers in "
        "`related_endpoints`."
    ),
)
def get_location(location_id: str, db: Session = Depends(get_db)) -> LocationDetailOut:
    location = location_service.get_location_by_id(db, location_id)
    if location is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location '{location_id}' not found.",
        )

    detail = LocationDetailOut.model_validate(location)
    detail.related_endpoints = {
        "shelters_nearest": f"/shelters/nearest?latitude={location.latitude}&longitude={location.longitude}",
        "risk": f"/risk/{location.id}",
        "sensors": f"/sensors?location_id={location.id}",
    }
    return detail
