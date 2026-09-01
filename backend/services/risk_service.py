from dataclasses import dataclass

from backend.schemas.risk_prediction import RiskLevel


LOW_THRESHOLD = 0.30
MODERATE_THRESHOLD = 0.60
HIGH_THRESHOLD = 0.80


@dataclass(frozen=True)
class RiskResult:
    flood_probability: float
    landslide_probability: float
    overall_risk: RiskLevel
    lead_time: int | None
    recommended_action: str


def calculate_flood_probability(
    rainfall: float,
    soil_moisture: float,
) -> float:
    rainfall_score = min(max(rainfall, 0.0) / 60.0, 1.0)
    soil_score = min(max(soil_moisture, 0.0) / 95.0, 1.0)

    probability = (
        0.6 * rainfall_score
        + 0.4 * soil_score
    )

    return round(min(max(probability, 0.0), 1.0), 4)


def calculate_landslide_probability(
    rainfall: float,
    soil_moisture: float,
    slope_movement: float,
) -> float:
    rainfall_score = min(max(rainfall, 0.0) / 60.0, 1.0)
    soil_score = min(max(soil_moisture, 0.0) / 95.0, 1.0)
    movement_score = min(max(slope_movement, 0.0) / 15.0, 1.0)

    probability = (
        0.3 * rainfall_score
        + 0.3 * soil_score
        + 0.4 * movement_score
    )

    return round(min(max(probability, 0.0), 1.0), 4)


def classify_risk(probability: float) -> RiskLevel:
    probability = min(max(probability, 0.0), 1.0)

    if probability < LOW_THRESHOLD:
        return RiskLevel.LOW

    if probability < MODERATE_THRESHOLD:
        return RiskLevel.MODERATE

    if probability < HIGH_THRESHOLD:
        return RiskLevel.HIGH

    return RiskLevel.CRITICAL


def calculate_overall_probability(
    flood_probability: float,
    landslide_probability: float,
) -> float:
    return max(flood_probability, landslide_probability)


def calculate_lead_time(
    flood_probability: float,
    landslide_probability: float,
    slope_movement: float,
) -> int | None:
    severity = max(flood_probability, landslide_probability)

    if severity < LOW_THRESHOLD:
        return None

    lead_time = 240 - (severity * 200)

    if slope_movement > 8:
        lead_time -= 40

    return max(20, round(lead_time))


def get_recommended_action(risk_level: RiskLevel) -> str:
    actions = {
        RiskLevel.LOW: "No action needed. Continue routine monitoring.",
        RiskLevel.MODERATE: (
            "Weather conditions are deteriorating. Monitor updates."
        ),
        RiskLevel.HIGH: (
            "High disaster risk detected. Authorities should prepare "
            "evacuation measures."
        ),
        RiskLevel.CRITICAL: (
            "Critical risk detected. Immediate evacuation of vulnerable "
            "zones is recommended."
        ),
    }

    return actions[risk_level]


def calculate_risk(
    rainfall: float,
    soil_moisture: float,
    slope_movement: float,
    *,
    flood_probability: float | None = None,
    landslide_probability: float | None = None,
) -> RiskResult:
    if flood_probability is None:
        flood_probability = calculate_flood_probability(
            rainfall=rainfall,
            soil_moisture=soil_moisture,
        )

    if landslide_probability is None:
        landslide_probability = calculate_landslide_probability(
            rainfall=rainfall,
            soil_moisture=soil_moisture,
            slope_movement=slope_movement,
        )

    flood_probability = min(max(flood_probability, 0.0), 1.0)
    landslide_probability = min(max(landslide_probability, 0.0), 1.0)

    overall_probability = calculate_overall_probability(
        flood_probability=flood_probability,
        landslide_probability=landslide_probability,
    )

    overall_risk = classify_risk(overall_probability)

    return RiskResult(
        flood_probability=round(flood_probability, 4),
        landslide_probability=round(landslide_probability, 4),
        overall_risk=overall_risk,
        lead_time=calculate_lead_time(
            flood_probability=flood_probability,
            landslide_probability=landslide_probability,
            slope_movement=slope_movement,
        ),
        recommended_action=get_recommended_action(overall_risk),
    )