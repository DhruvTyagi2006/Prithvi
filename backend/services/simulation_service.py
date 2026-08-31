from typing import TypedDict


class SimulationState(TypedDict):
    rainfall: float
    soil_moisture: float
    slope_movement: float


_simulations: dict[str, SimulationState] = {}


def set_simulation_state(
    location_id: str,
    rainfall: float,
    soil_moisture: float,
    slope_movement: float,
) -> None:
    _simulations[location_id] = {
        "rainfall": rainfall,
        "soil_moisture": soil_moisture,
        "slope_movement": slope_movement,
    }


def get_simulation_state(
    location_id: str,
) -> SimulationState | None:
    return _simulations.get(location_id)