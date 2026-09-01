from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from backend.models.sensor import Sensor
from backend.models.sensor_reading import SensorReading
from backend.models.location import Location


DATA_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "iot_sensor_data_with_soil.csv"
)


REQUIRED_COLUMNS = [
    "sensor_id",
    "state",
    "district",
    "latitude",
    "longitude",
    "timestamp",
    "rainfall_1h",
    "rainfall_6h",
    "rainfall_24h",
    "soil_moisture",
    "slope_movement",
]


def load_sensor_data() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Sensor data file not found: {DATA_PATH}"
        )

    df = pd.read_csv(DATA_PATH)

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            "Sensor CSV is missing required columns: "
            + ", ".join(missing_columns)
        )

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce",
        utc=True,
    )

    numeric_columns = [
        "latitude",
        "longitude",
        "rainfall_1h",
        "rainfall_6h",
        "rainfall_24h",
        "soil_moisture",
        "slope_movement",
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    return (
        df.dropna(
            subset=[
                "sensor_id",
                "timestamp",
            ]
        )
        .sort_values("timestamp")
        .reset_index(drop=True)
    )


def find_nearest_location(
    latitude: float,
    longitude: float,
    locations: list[Location],
) -> Location | None:
    """
    Find the Prithvi location geographically closest
    to the sensor coordinates.
    """

    if not locations:
        return None

    nearest_location = None
    nearest_distance = float("inf")

    for location in locations:
        distance = (
            (location.latitude - latitude) ** 2
            + (location.longitude - longitude) ** 2
        )

        if distance < nearest_distance:
            nearest_distance = distance
            nearest_location = location

    return nearest_location


def get_all_sensors(
    db: Session | None = None,
) -> list[dict]:
    df = load_sensor_data()

    locations = []

    if db is not None:
        locations = db.query(Location).all()

    latest = (
        df.sort_values("timestamp")
        .groupby("sensor_id", as_index=False)
        .tail(1)
        .copy()
    )

    sensors = []

    for _, row in latest.iterrows():

        nearest_location = find_nearest_location(
            float(row["latitude"]),
            float(row["longitude"]),
            locations,
        )

        sensors.append(
            {
                "id": str(row["sensor_id"]),

                "location_id": (
                    nearest_location.id
                    if nearest_location
                    else str(row["sensor_id"])
                ),

                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),

                "sensor_type": "environmental",

                "status": calculate_sensor_status(
                    row["timestamp"]
                ),

                "last_updated": row[
                    "timestamp"
                ].to_pydatetime(),

                "rainfall": safe_float(
                    row["rainfall_1h"]
                ),

                "soil_moisture": safe_float(
                    row["soil_moisture"]
                ),

                "slope_movement": safe_float(
                    row["slope_movement"]
                ),

                "state": clean_string(
                    row["state"]
                ),

                "district": clean_string(
                    row["district"]
                ),
            }
        )

    return sensors


def get_sensor(
    sensor_id: str,
    db: Session | None = None,
) -> dict | None:
    df = load_sensor_data()

    sensor_rows = df[
        df["sensor_id"].astype(str)
        == str(sensor_id)
    ]

    if sensor_rows.empty:
        return None

    row = (
        sensor_rows
        .sort_values("timestamp")
        .iloc[-1]
    )

    locations = []

    if db is not None:
        locations = db.query(Location).all()

    nearest_location = find_nearest_location(
        float(row["latitude"]),
        float(row["longitude"]),
        locations,
    )

    return {
        "id": str(row["sensor_id"]),

        "location_id": (
            nearest_location.id
            if nearest_location
            else str(row["sensor_id"])
        ),

        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),

        "sensor_type": "environmental",

        "status": calculate_sensor_status(
            row["timestamp"]
        ),

        "last_updated": row[
            "timestamp"
        ].to_pydatetime(),

        "rainfall": safe_float(
            row["rainfall_1h"]
        ),

        "soil_moisture": safe_float(
            row["soil_moisture"]
        ),

        "slope_movement": safe_float(
            row["slope_movement"]
        ),

        "state": clean_string(
            row["state"]
        ),

        "district": clean_string(
            row["district"]
        ),
    }


def get_latest_reading(
    sensor_id: str,
    db: Session | None = None,
) -> dict | None:

    if db is not None:
        reading = (
            db.query(SensorReading)
            .filter(
                SensorReading.sensor_id
                == sensor_id
            )
            .order_by(
                SensorReading.timestamp.desc()
            )
            .first()
        )

        if reading is not None:
            return {
                "sensor_id": reading.sensor_id,
                "timestamp": reading.timestamp,
                "rainfall_1h": reading.rainfall,
                "rainfall_6h": None,
                "rainfall_24h": None,
                "soil_moisture": reading.soil_moisture,
                "slope_movement": reading.slope_movement,
            }

    df = load_sensor_data()

    sensor_rows = df[
        df["sensor_id"].astype(str)
        == str(sensor_id)
    ]

    if sensor_rows.empty:
        return None

    row = (
        sensor_rows
        .sort_values("timestamp")
        .iloc[-1]
    )

    return {
        "sensor_id": str(row["sensor_id"]),
        "state": clean_string(
            row["state"]
        ),
        "district": clean_string(
            row["district"]
        ),
        "latitude": safe_float(
            row["latitude"]
        ),
        "longitude": safe_float(
            row["longitude"]
        ),
        "timestamp": row[
            "timestamp"
        ].to_pydatetime(),
        "rainfall_1h": safe_float(
            row["rainfall_1h"]
        ),
        "rainfall_6h": safe_float(
            row["rainfall_6h"]
        ),
        "rainfall_24h": safe_float(
            row["rainfall_24h"]
        ),
        "soil_moisture": safe_float(
            row["soil_moisture"]
        ),
        "slope_movement": safe_float(
            row["slope_movement"]
        ),
    }


def get_sensor_readings(
    sensor_id: str | None = None,
    limit: int = 100,
    db: Session | None = None,
) -> list[dict]:

    readings = []

    if db is not None:

        query = db.query(SensorReading)

        if sensor_id is not None:
            query = query.filter(
                SensorReading.sensor_id
                == sensor_id
            )

        database_readings = (
            query
            .order_by(
                SensorReading.timestamp.desc()
            )
            .limit(limit)
            .all()
        )

        for reading in database_readings:
            readings.append(
                {
                    "id": reading.id,
                    "sensor_id": reading.sensor_id,
                    "timestamp": reading.timestamp,
                    "rainfall": reading.rainfall,
                    "soil_moisture": (
                        reading.soil_moisture
                    ),
                    "slope_movement": (
                        reading.slope_movement
                    ),
                }
            )

    if readings:
        return readings

    df = load_sensor_data()

    if sensor_id is not None:
        df = df[
            df["sensor_id"].astype(str)
            == str(sensor_id)
        ]

    df = (
        df.sort_values(
            "timestamp",
            ascending=False,
        )
        .head(limit)
    )

    for _, row in df.iterrows():

        readings.append(
            {
                "sensor_id": str(
                    row["sensor_id"]
                ),

                "timestamp": row[
                    "timestamp"
                ].to_pydatetime(),

                "rainfall_1h": safe_float(
                    row["rainfall_1h"]
                ),

                "rainfall_6h": safe_float(
                    row["rainfall_6h"]
                ),

                "rainfall_24h": safe_float(
                    row["rainfall_24h"]
                ),

                "soil_moisture": safe_float(
                    row["soil_moisture"]
                ),

                "slope_movement": safe_float(
                    row["slope_movement"]
                ),
            }
        )

    return readings


def create_sensor_reading(
    db: Session,
    sensor_id: str,
    timestamp,
    rainfall: float | None,
    soil_moisture: float | None,
    slope_movement: float | None,
):

    sensor = (
        db.query(Sensor)
        .filter(
            Sensor.id == sensor_id
        )
        .first()
    )

    if sensor is None:
        return None

    reading = SensorReading(
        sensor_id=sensor_id,
        timestamp=timestamp,
        rainfall=rainfall,
        soil_moisture=soil_moisture,
        slope_movement=slope_movement,
    )

    db.add(reading)

    sensor.last_updated = timestamp

    db.commit()
    db.refresh(reading)

    return reading


def calculate_sensor_status(
    timestamp: pd.Timestamp,
) -> str:

    if pd.isna(timestamp):
        return "OFFLINE"

    # Historical CSV data is being used as
    # simulated IoT sensor data for the prototype.
    return "ONLINE"


def safe_float(value):

    if pd.isna(value):
        return None

    return float(value)


def clean_string(value):

    if pd.isna(value):
        return None

    return str(value).strip()