"""
Seeds the database with demo data mirrored from the frontend's
src/data/mockData.js, so the API returns the same 6 locations / 4 shelters
the frontend was designed against, plus representative sensors, sensor
readings, historical events, and risk predictions (implementation notes
sec. 17).

This is fictionalized demo data for a hackathon MVP — not scientifically
validated locations or measurements (PRD sec. 17 / 29).

Run with:
    python -m backend.database.seed
"""
from datetime import date, datetime, timezone

from backend.database.connection import SessionLocal, init_db
from backend.models.historical_event import HistoricalEvent
from backend.models.location import Location
from backend.models.risk_prediction import RiskPrediction
from backend.models.sensor import Sensor
from backend.models.sensor_reading import SensorReading
from backend.models.shelter import Shelter

SHELTERS = [
    {"id": "shelter-001", "name": "Kaudiyala Community Hall", "latitude": 30.226, "longitude": 78.481, "capacity": 300},
    {"id": "shelter-002", "name": "Devprayag Govt. Inter College", "latitude": 30.150, "longitude": 78.602, "capacity": 450},
    {"id": "shelter-003", "name": "Ukhimath Panchayat Bhawan", "latitude": 30.505, "longitude": 79.104, "capacity": 500},
    {"id": "shelter-004", "name": "Chamoli Relief Center", "latitude": 30.412, "longitude": 79.328, "capacity": 350},
]

# Static/reference fields only — environmental+risk fields from mockData.js
# (floodProbability, rainfall1h, soilMoisture, leadTimeMinutes, ...) are
# seeded separately below as SensorReading / RiskPrediction rows instead.
LOCATIONS = [
    {"id": "loc-001", "name": "Kaudiyala", "district": "Tehri Garhwal", "state": "Uttarakhand", "population": 1420, "latitude": 30.221, "longitude": 78.478, "elevation": 1180, "slope": 34, "soil_type": "Sandy loam", "nearest_shelter_id": "shelter-001"},
    {"id": "loc-002", "name": "Devprayag Ridge", "district": "Tehri Garhwal", "state": "Uttarakhand", "population": 860, "latitude": 30.146, "longitude": 78.598, "elevation": 830, "slope": 21, "soil_type": "Clay loam", "nearest_shelter_id": "shelter-002"},
    {"id": "loc-003", "name": "Ukhimath", "district": "Rudraprayag", "state": "Uttarakhand", "population": 2210, "latitude": 30.502, "longitude": 79.100, "elevation": 1300, "slope": 12, "soil_type": "Silty loam", "nearest_shelter_id": "shelter-003"},
    {"id": "loc-004", "name": "Guptkashi Basin", "district": "Rudraprayag", "state": "Uttarakhand", "population": 1580, "latitude": 30.531, "longitude": 79.078, "elevation": 1319, "slope": 27, "soil_type": "Sandy clay", "nearest_shelter_id": "shelter-003"},
    {"id": "loc-005", "name": "Chamoli Lower Slopes", "district": "Chamoli", "state": "Uttarakhand", "population": 990, "latitude": 30.408, "longitude": 79.322, "elevation": 1420, "slope": 38, "soil_type": "Sandy loam", "nearest_shelter_id": "shelter-004"},
    {"id": "loc-006", "name": "Joshimath Approach", "district": "Chamoli", "state": "Uttarakhand", "population": 1760, "latitude": 30.556, "longitude": 79.564, "elevation": 1875, "slope": 41, "soil_type": "Loose colluvium", "nearest_shelter_id": "shelter-004"},
]

# Mirrors SENSORS in mockData.js (rainfall/soilMoisture/slopeMovement move to
# a SensorReading row instead of living on the Sensor itself).
SENSORS = [
    {"id": "SEN-001", "location_id": "loc-001", "sensor_type": "rain-gauge", "status": "ONLINE", "reading": {"rainfall": 42, "soil_moisture": 83, "slope_movement": 4.2}},
    {"id": "SEN-002", "location_id": "loc-001", "sensor_type": "soil-probe", "status": "ONLINE", "reading": {"rainfall": 41, "soil_moisture": 85, "slope_movement": 4.8}},
    {"id": "SEN-003", "location_id": "loc-004", "sensor_type": "slope-extensometer", "status": "WARNING", "reading": {"rainfall": 26, "soil_moisture": 71, "slope_movement": 9.1}},
    {"id": "SEN-004", "location_id": "loc-006", "sensor_type": "rain-gauge", "status": "OFFLINE", "reading": {"rainfall": None, "soil_moisture": None, "slope_movement": None}},
    {"id": "SEN-005", "location_id": "loc-002", "sensor_type": "soil-probe", "status": "ONLINE", "reading": {"rainfall": 18, "soil_moisture": 58, "slope_movement": 1.1}},
    {"id": "SEN-006", "location_id": "loc-003", "sensor_type": "rain-gauge", "status": "ONLINE", "reading": {"rainfall": 3, "soil_moisture": 34, "slope_movement": 0.2}},
]

# Mirrors the floodProbability/landslideProbability/leadTimeMinutes fields
# that used to sit on each LOCATIONS entry in mockData.js.
RISK_PREDICTIONS = [
    {"location_id": "loc-001", "flood_probability": 0.82, "landslide_probability": 0.76, "overall_risk": "CRITICAL", "lead_time": 90},
    {"location_id": "loc-002", "flood_probability": 0.54, "landslide_probability": 0.31, "overall_risk": "MODERATE", "lead_time": 180},
    {"location_id": "loc-003", "flood_probability": 0.12, "landslide_probability": 0.08, "overall_risk": "LOW", "lead_time": None},
    {"location_id": "loc-004", "flood_probability": 0.65, "landslide_probability": 0.58, "overall_risk": "HIGH", "lead_time": 150},
    {"location_id": "loc-005", "flood_probability": 0.29, "landslide_probability": 0.44, "overall_risk": "MODERATE", "lead_time": 240},
    {"location_id": "loc-006", "flood_probability": 0.38, "landslide_probability": 0.69, "overall_risk": "HIGH", "lead_time": 110},
]

# Representative historical events (PRD sec. 10.4) — not present in the
# frontend mock, added here since the PRD explicitly lists this entity.
HISTORICAL_EVENTS = [
    {"id": "hist-001", "event_type": "LANDSLIDE", "latitude": 30.221, "longitude": 78.478, "date": date(2023, 8, 14), "severity": "HIGH"},
    {"id": "hist-002", "event_type": "FLOOD", "latitude": 30.531, "longitude": 79.078, "date": date(2021, 7, 9), "severity": "CRITICAL"},
    {"id": "hist-003", "event_type": "LANDSLIDE", "latitude": 30.556, "longitude": 79.564, "date": date(2022, 9, 2), "severity": "MODERATE"},
]

SEED_TIMESTAMP = datetime(2026, 8, 25, 11, 42, 0, tzinfo=timezone.utc)


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        if db.query(Location).first() is not None:
            print("Database already seeded — skipping. Delete the DB file / tables to reseed.")
            return

        for row in SHELTERS:
            db.add(Shelter(**row))
        db.flush()  # so location FK references resolve

        for row in LOCATIONS:
            db.add(Location(**row))
        db.flush()

        for row in SENSORS:
            reading = row.pop("reading")
            db.add(
                Sensor(
                    id=row["id"],
                    location_id=row["location_id"],
                    latitude=next(l["latitude"] for l in LOCATIONS if l["id"] == row["location_id"]),
                    longitude=next(l["longitude"] for l in LOCATIONS if l["id"] == row["location_id"]),
                    sensor_type=row["sensor_type"],
                    status=row["status"],
                    last_updated=SEED_TIMESTAMP,
                )
            )
            db.flush()
            db.add(
                SensorReading(
                    sensor_id=row["id"],
                    timestamp=SEED_TIMESTAMP,
                    **reading,
                )
            )

        for row in RISK_PREDICTIONS:
            db.add(RiskPrediction(timestamp=SEED_TIMESTAMP, **row))

        for row in HISTORICAL_EVENTS:
            db.add(HistoricalEvent(**row))

        db.commit()
        print(
            f"Seeded {len(LOCATIONS)} locations, {len(SHELTERS)} shelters, "
            f"{len(SENSORS)} sensors, {len(RISK_PREDICTIONS)} risk predictions, "
            f"{len(HISTORICAL_EVENTS)} historical events."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
