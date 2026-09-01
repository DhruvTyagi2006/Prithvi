import pandas as pd
from sqlalchemy.orm import Session

from backend.models.location import Location
from backend.services.sensor_data_service import load_sensor_data


def safe_number(value) -> float:
    """
    Convert a pandas/CSV value into a JSON-safe float.

    NaN and infinite values are converted to 0.0.
    """
    try:
        value = float(value)

        if pd.isna(value) or not pd.api.types.is_number(value):
            return 0.0

        if value == float("inf") or value == float("-inf"):
            return 0.0

        return value

    except (TypeError, ValueError):
        return 0.0


def safe_string(value) -> str | None:
    """
    Convert a pandas value into a JSON-safe string.
    """
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    return str(value).strip()


def classify_alert_risk(
    probability: float,
) -> str:

    if probability < 0.30:
        return "LOW"

    if probability < 0.60:
        return "MODERATE"

    if probability < 0.80:
        return "HIGH"

    return "CRITICAL"


def calculate_alert_probability(
    rainfall_1h: float | None,
    rainfall_6h: float | None,
    rainfall_24h: float | None,
    soil_moisture: float | None,
    slope_movement: float | None,
) -> float:

    rainfall_1h = safe_number(rainfall_1h)
    rainfall_6h = safe_number(rainfall_6h)
    rainfall_24h = safe_number(rainfall_24h)
    soil_moisture = safe_number(soil_moisture)
    slope_movement = safe_number(slope_movement)

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

    movement_score = min(
        max(slope_movement, 0.0) / 10.0,
        1.0,
    )

    probability = (
        0.60 * rainfall_score
        + 0.25 * soil_score
        + 0.15 * movement_score
    )

    if pd.isna(probability) or probability != probability:
        probability = 0.0

    return round(
        min(
            max(probability, 0.0),
            1.0,
        ),
        4,
    )


def get_alert_action(
    risk_level: str,
) -> str:

    actions = {
        "LOW": (
            "Continue monitoring environmental conditions."
        ),
        "MODERATE": (
            "Monitor weather conditions and prepare "
            "for possible escalation."
        ),
        "HIGH": (
            "Prepare emergency response measures "
            "and monitor the affected location closely."
        ),
        "CRITICAL": (
            "Immediate emergency response is recommended "
            "for vulnerable areas."
        ),
    }

    return actions.get(
        risk_level,
        "Continue monitoring environmental conditions.",
    )


def get_alert_message(
    risk_level: str,
    state: str | None,
    district: str | None,
) -> str:

    location = (
        district
        or state
        or "the monitored location"
    )

    messages = {
        "LOW": (
            f"Environmental conditions at {location} "
            "are currently within the low-risk range."
        ),
        "MODERATE": (
            f"Elevated environmental risk detected at "
            f"{location}. Continued monitoring is advised."
        ),
        "HIGH": (
            f"High environmental risk detected at "
            f"{location}. Emergency preparedness is advised."
        ),
        "CRITICAL": (
            f"Critical environmental risk detected at "
            f"{location}. Immediate attention is required."
        ),
    }

    return messages.get(
        risk_level,
        f"Environmental risk detected at {location}.",
    )


def find_nearest_location(
    latitude: float | None,
    longitude: float | None,
    db: Session,
) -> Location | None:
    """
    Find the closest Prithvi location to a sensor
    using latitude and longitude.
    """

    if latitude is None or longitude is None:
        return None

    locations = (
        db.query(Location)
        .all()
    )

    if not locations:
        return None

    nearest_location = None
    nearest_distance = float("inf")

    for location in locations:

        if (
            location.latitude is None
            or location.longitude is None
        ):
            continue

        distance = (
            (
                float(location.latitude)
                - float(latitude)
            ) ** 2
            +
            (
                float(location.longitude)
                - float(longitude)
            ) ** 2
        )

        if distance < nearest_distance:
            nearest_distance = distance
            nearest_location = location

    return nearest_location


def build_alert(
    row: dict,
    db: Session,
) -> dict:

    sensor_id = safe_string(
        row.get("sensor_id")
    )

    state = safe_string(
        row.get("state")
    )

    district = safe_string(
        row.get("district")
    )

    latitude = safe_number(
        row.get("latitude")
    )

    longitude = safe_number(
        row.get("longitude")
    )

    nearest_location = find_nearest_location(
        latitude=latitude,
        longitude=longitude,
        db=db,
    )

    location_id = (
        str(nearest_location.id)
        if nearest_location is not None
        else None
    )

    probability = calculate_alert_probability(
        rainfall_1h=row.get("rainfall_1h"),
        rainfall_6h=row.get("rainfall_6h"),
        rainfall_24h=row.get("rainfall_24h"),
        soil_moisture=row.get("soil_moisture"),
        slope_movement=row.get("slope_movement"),
    )

    risk_level = classify_alert_risk(
        probability
    )

    timestamp = row.get("timestamp")

    if pd.isna(timestamp):
        timestamp = pd.Timestamp.now(tz="UTC")

    timestamp = pd.Timestamp(timestamp)

    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize("UTC")
    else:
        timestamp = timestamp.tz_convert("UTC")

    return {
        "id": f"alert-{sensor_id}",
        "location_id": location_id,
        "sensor_id": sensor_id,
        "state": state,
        "district": district,
        "alert_type": "ENVIRONMENTAL_RISK",
        "risk_level": risk_level,
        "probability": probability,
        "message": get_alert_message(
            risk_level=risk_level,
            state=state,
            district=district,
        ),
        "recommended_action": get_alert_action(
            risk_level
        ),
        "timestamp": timestamp.to_pydatetime(),
    }


def get_all_alerts(
    db: Session,
) -> list[dict]:
    """
    Generate alerts from the latest real observation
    for every sensor.

    No fabricated sensor readings are created.
    """

    df = load_sensor_data()

    if df.empty:
        return []

    latest = (
        df.sort_values("timestamp")
        .groupby(
            "sensor_id",
            as_index=False,
        )
        .tail(1)
        .copy()
    )

    alerts = []

    for _, row in latest.iterrows():

        alert = build_alert(
            row.to_dict(),
            db,
        )

        # Only include alerts that successfully
        # map to a Prithvi location.
        if alert["location_id"] is not None:
            alerts.append(alert)

    alerts.sort(
        key=lambda alert: alert["probability"],
        reverse=True,
    )

    return alerts


def get_alerts_for_location(
    location_id: str,
    db: Session,
) -> list[dict]:

    alerts = get_all_alerts(db)

    location_id = str(location_id)

    return [
        alert
        for alert in alerts
        if str(alert["location_id"])
        == location_id
    ]