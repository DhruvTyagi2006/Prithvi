from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.location import Location
from backend.models.risk_prediction import RiskPrediction
from backend.schemas.risk import (
    SimulationResponse,
    SimulationStartRequest,
    SimulationStepRequest,
)
from backend.services.risk_service import calculate_risk
from backend.services.simulation_service import (
    get_simulation_state,
    set_simulation_state,
)


router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.post("/start", response_model=SimulationResponse)
def start_simulation(
    request: SimulationStartRequest,
    db: Session = Depends(get_db),
):
    location = (
        db.query(Location)
        .filter(Location.id == request.location_id)
        .first()
    )

    if location is None:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    rainfall = 5.0
    soil_moisture = 40.0
    slope_movement = 1.0

    result = calculate_risk(
        rainfall=rainfall,
        soil_moisture=soil_moisture,
        slope_movement=slope_movement,
    )

    set_simulation_state(
        location_id=request.location_id,
        rainfall=rainfall,
        soil_moisture=soil_moisture,
        slope_movement=slope_movement,
    )

    prediction = RiskPrediction(
        location_id=request.location_id,
        flood_probability=result.flood_probability,
        landslide_probability=result.landslide_probability,
        overall_risk=result.overall_risk.value,
        lead_time=result.lead_time,
    )

    db.add(prediction)
    db.commit()

    return SimulationResponse(
        location_id=request.location_id,
        rainfall=rainfall,
        soil_moisture=soil_moisture,
        slope_movement=slope_movement,
        flood_probability=result.flood_probability,
        landslide_probability=result.landslide_probability,
        overall_risk=result.overall_risk.value,
        lead_time=result.lead_time,
        recommended_action=result.recommended_action,
    )


@router.post("/step", response_model=SimulationResponse)
def simulation_step(
    request: SimulationStepRequest,
    db: Session = Depends(get_db),
):
    location = (
        db.query(Location)
        .filter(Location.id == request.location_id)
        .first()
    )

    if location is None:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    if get_simulation_state(request.location_id) is None:
        raise HTTPException(
            status_code=400,
            detail="Simulation has not been started for this location",
        )

    result = calculate_risk(
        rainfall=request.rainfall,
        soil_moisture=request.soil_moisture,
        slope_movement=request.slope_movement,
    )

    set_simulation_state(
        location_id=request.location_id,
        rainfall=request.rainfall,
        soil_moisture=request.soil_moisture,
        slope_movement=request.slope_movement,
    )

    prediction = RiskPrediction(
        location_id=request.location_id,
        flood_probability=result.flood_probability,
        landslide_probability=result.landslide_probability,
        overall_risk=result.overall_risk.value,
        lead_time=result.lead_time,
    )

    db.add(prediction)
    db.commit()

    return SimulationResponse(
        location_id=request.location_id,
        rainfall=request.rainfall,
        soil_moisture=request.soil_moisture,
        slope_movement=request.slope_movement,
        flood_probability=result.flood_probability,
        landslide_probability=result.landslide_probability,
        overall_risk=result.overall_risk.value,
        lead_time=result.lead_time,
        recommended_action=result.recommended_action,
    )