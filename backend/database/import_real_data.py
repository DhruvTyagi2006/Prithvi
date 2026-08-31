from __future__ import annotations

import argparse
import csv
import re
from datetime import date, datetime
from pathlib import Path

from backend.database.connection import Base, SessionLocal, engine, init_db
from backend.models.historical_event import HistoricalEvent
from backend.models.location import Location
from backend.models.sensor import Sensor
from backend.models.sensor_reading import SensorReading


def to_float(value: str | None) -> float | None:
    if value is None or value.strip() == "":
        return None

    try:
        return float(value)
    except ValueError:
        return None


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None

    value = value.strip()

    formats = (
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%d-%m-%Y %H:%M",
    )

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    return None


def parse_history_date(value: str | None) -> date | None:
    if not value:
        return None

    value = value.strip()

    if value.upper() in {"NA", "N/A", "NONE", "NAN"}:
        return None

    value = re.sub(
        r"(\d{1,2})(st|nd|rd|th)",
        r"\1",
        value,
        flags=re.IGNORECASE,
    )

    match = re.search(
        r"(\d{1,2}\s+[A-Za-z]+\s+\d{4})",
        value,
    )

    if match:
        candidate = match.group(1)

        for fmt in ("%d %B %Y", "%d %b %Y"):
            try:
                return datetime.strptime(candidate, fmt).date()
            except ValueError:
                continue

    match = re.search(
        r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})",
        value,
    )

    if match:
        day, month, year = map(int, match.groups())

        try:
            return date(year, month, day)
        except ValueError:
            return None

    return None


def load_terrain(path: Path) -> dict[tuple[float, float], dict]:
    terrain = {}

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        for row in reader:
            latitude = to_float(row.get("Latitude"))
            longitude = to_float(row.get("Longitude"))

            if latitude is None or longitude is None:
                continue

            key = (
                round(latitude, 6),
                round(longitude, 6),
            )

            terrain[key] = row

    return terrain


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def import_data(
    terrain_path: Path,
    landslide_path: Path,
    sensor_path: Path,
    reset: bool,
) -> None:
    init_db()

    if reset:
        print("Resetting database...")
        reset_database()

    terrain = load_terrain(terrain_path)

    db = SessionLocal()

    try:
        sensors = {}
        latest_timestamp = {}
        sensor_readings = []

        with sensor_path.open(
            "r",
            encoding="utf-8-sig",
            newline="",
        ) as file:
            reader = csv.DictReader(file)

            for row in reader:
                sensor_id = row.get("sensor_id", "").strip()
                state = row.get("state", "").strip()
                district = row.get("district", "").strip()

                latitude = to_float(row.get("latitude"))
                longitude = to_float(row.get("longitude"))
                timestamp = parse_timestamp(row.get("timestamp"))

                if (
                    not sensor_id
                    or latitude is None
                    or longitude is None
                    or timestamp is None
                ):
                    continue

                if sensor_id not in sensors:
                    sensors[sensor_id] = {
                        "state": state,
                        "district": district,
                        "latitude": latitude,
                        "longitude": longitude,
                    }

                if (
                    sensor_id not in latest_timestamp
                    or timestamp > latest_timestamp[sensor_id]
                ):
                    latest_timestamp[sensor_id] = timestamp

                rainfall = to_float(row.get("rainfall_1h"))
                soil_moisture = to_float(row.get("soil_moisture"))

                if (
                    soil_moisture is not None
                    and 0 <= soil_moisture <= 1
                ):
                    soil_moisture *= 100

                sensor_readings.append(
                    {
                        "sensor_id": sensor_id,
                        "timestamp": timestamp,
                        "rainfall": rainfall,
                        "soil_moisture": soil_moisture,
                        "slope_movement": None,
                    }
                )

        location_rows = []

        for sensor_id, sensor in sensors.items():
            terrain_row = terrain.get(
                (
                    round(sensor["latitude"], 6),
                    round(sensor["longitude"], 6),
                )
            )

            elevation = None
            slope = None

            if terrain_row:
                elevation = to_float(
                    terrain_row.get("Elevation_m")
                )
                slope = to_float(
                    terrain_row.get("Slope_deg")
                )

            location_rows.append(
                {
                    "id": f"loc-{sensor_id.lower()}",
                    "name": (
                        f"{sensor['district']} "
                        f"Monitoring Point ({sensor_id})"
                    ),
                    "district": sensor["district"],
                    "state": sensor["state"],
                    "population": 0,
                    "latitude": sensor["latitude"],
                    "longitude": sensor["longitude"],
                    "elevation": elevation,
                    "slope": slope,
                    "soil_type": None,
                    "nearest_shelter_id": None,
                }
            )

        db.bulk_insert_mappings(
            Location,
            location_rows,
        )

        sensor_rows = []

        for sensor_id, sensor in sensors.items():
            sensor_rows.append(
                {
                    "id": sensor_id,
                    "location_id": f"loc-{sensor_id.lower()}",
                    "latitude": sensor["latitude"],
                    "longitude": sensor["longitude"],
                    "sensor_type": "rain-gauge",
                    "status": "ONLINE",
                    "last_updated": latest_timestamp[sensor_id],
                }
            )

        db.bulk_insert_mappings(
            Sensor,
            sensor_rows,
        )

        batch_size = 5000

        for start in range(
            0,
            len(sensor_readings),
            batch_size,
        ):
            batch = sensor_readings[
                start:start + batch_size
            ]

            db.bulk_insert_mappings(
                SensorReading,
                batch,
            )

            db.commit()

        historical_events = []
        skipped_without_date = 0

        with landslide_path.open(
            "r",
            encoding="utf-8-sig",
            newline="",
        ) as file:
            reader = csv.DictReader(file)

            for row in reader:
                latitude = to_float(
                    row.get("Latitude")
                )

                longitude = to_float(
                    row.get("Longitude")
                )

                event_date = parse_history_date(
                    row.get("History")
                )

                if (
                    latitude is None
                    or longitude is None
                    or event_date is None
                ):
                    skipped_without_date += 1
                    continue

                historical_events.append(
                    {
                        "id": (
                            f"gsi-"
                            f"{len(historical_events) + 1:05d}"
                        ),
                        "event_type": "LANDSLIDE",
                        "latitude": latitude,
                        "longitude": longitude,
                        "date": event_date,
                        "severity": "UNKNOWN",
                    }
                )

        db.bulk_insert_mappings(
            HistoricalEvent,
            historical_events,
        )

        db.commit()

        print("\nReal data import complete.")
        print(f"Locations: {len(location_rows)}")
        print(f"Sensors: {len(sensor_rows)}")
        print(f"Sensor readings: {len(sensor_readings)}")
        print(f"Landslides: {len(historical_events)}")
        print(
            f"Landslides skipped without date: "
            f"{skipped_without_date}"
        )

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--terrain",
        type=Path,
        required=True,
    )

    parser.add_argument(
        "--landslides",
        type=Path,
        required=True,
    )

    parser.add_argument(
        "--sensors",
        type=Path,
        required=True,
    )

    parser.add_argument(
        "--reset",
        action="store_true",
    )

    args = parser.parse_args()

    import_data(
        terrain_path=args.terrain,
        landslide_path=args.landslides,
        sensor_path=args.sensors,
        reset=args.reset,
    )


if __name__ == "__main__":
    main()