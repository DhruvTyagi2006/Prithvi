from dataclasses import dataclass
from pathlib import Path

import joblib
import pandas as pd

from backend.schemas.risk_prediction import RiskLevel


MODEL_PATH = (
    Path(__file__).resolve().parents[1]
    / "ml"
    / "landslide_model.joblib"
)

FEATURES = [
    "rainfall_1h",
    "rainfall_6h",
    "rainfall_24h",
    "soil_moisture",
    "elevation",
    "slope",
    "aspect",
]


@dataclass(frozen=True)
class PredictionResult:
    flood_probability: float
    landslide_probability: float
    overall_risk: RiskLevel
    lead_time: int
    recommended_action: str


def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}"
        )

    return joblib.load(MODEL_PATH)


def calculate_flood_probability(
    rainfall_1h: float,
    rainfall_6h: float,
    rainfall_24h: float,
    soil_moisture: float,
) -> float:
    rainfall_score = min(
        (
            0.45 * rainfall_1h / 60.0
            + 0.30 * rainfall_6h / 120.0
            + 0.25 * rainfall_24h / 250.0
        ),
        1.0,
    )

    soil_score = min(
        max(soil_moisture, 0.0) / 100.0,
        1.0,
    )

    probability = (
        0.70 * rainfall_score
        + 0.30 * soil_score
    )

    return round(
        min(max(probability, 0.0), 1.0),
        4,
    )


def classify_risk(
    probability: float,
) -> RiskLevel:
    if probability < 0.30:
        return RiskLevel.LOW

    if probability < 0.60:
        return RiskLevel.MODERATE

    if probability < 0.80:
        return RiskLevel.HIGH

    return RiskLevel.CRITICAL


def calculate_lead_time(
    probability: float,
) -> int:
    lead_time = 240 - (
        probability * 200
    )

    return max(
        20,
        round(lead_time),
    )


def get_recommended_action(
    risk_level: RiskLevel,
) -> str:
    actions = {
        RiskLevel.LOW: (
            "No immediate action required. "
            "Continue monitoring."
        ),
        RiskLevel.MODERATE: (
            "Monitor weather conditions and "
            "prepare for possible escalation."
        ),
        RiskLevel.HIGH: (
            "High disaster risk detected. "
            "Authorities should prepare evacuation measures."
        ),
        RiskLevel.CRITICAL: (
            "Critical risk detected. Immediate evacuation "
            "of vulnerable areas is recommended."
        ),
    }

    return actions[risk_level]


def predict_risk(
    rainfall_1h: float,
    rainfall_6h: float,
    rainfall_24h: float,
    soil_moisture: float,
    slope: float,
    elevation: float,
    aspect: float = 0.0,
) -> PredictionResult:

    model_bundle = load_model()

    model = model_bundle["model"]

    features = pd.DataFrame(
        [[
            rainfall_1h,
            rainfall_6h,
            rainfall_24h,
            soil_moisture,
            elevation,
            slope,
            aspect,
        ]],
        columns=FEATURES,
    )

    landslide_probability = float(
        model.predict_proba(features)[0][1]
    )

    landslide_probability = round(
        min(max(landslide_probability, 0.0), 1.0),
        4,
    )

    flood_probability = calculate_flood_probability(
        rainfall_1h=rainfall_1h,
        rainfall_6h=rainfall_6h,
        rainfall_24h=rainfall_24h,
        soil_moisture=soil_moisture,
    )

    overall_probability = max(
        flood_probability,
        landslide_probability,
    )

    overall_risk = classify_risk(
        overall_probability
    )

    return PredictionResult(
        flood_probability=flood_probability,
        landslide_probability=landslide_probability,
        overall_risk=overall_risk,
        lead_time=calculate_lead_time(
            overall_probability
        ),
        recommended_action=get_recommended_action(
            overall_risk
        ),
    )