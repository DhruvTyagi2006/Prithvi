from __future__ import annotations

import argparse
import math
import re
from pathlib import Path

import pandas as pd


FEATURES = [
    "rainfall_1h",
    "rainfall_6h",
    "rainfall_24h",
    "soil_moisture",
    "elevation",
    "slope",
    "aspect",
]


def distance_km(lat1, lon1, lat2, lon2):
    radius = 6371.0

    lat1 = math.radians(float(lat1))
    lat2 = math.radians(float(lat2))

    dlat = lat2 - lat1
    dlon = math.radians(float(lon2) - float(lon1))

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    return radius * 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )


def parse_history(value):
    if pd.isna(value):
        return None

    value = str(value).strip()

    if not value or value.upper() in {
        "NA",
        "NAN",
        "NONE",
        "NULL",
    }:
        return None

    value = re.sub(
        r"(\d{1,2})(st|nd|rd|th)",
        r"\1",
        value,
        flags=re.IGNORECASE,
    )

    if re.fullmatch(r"(19|20)\d{2}", value):
        return None

    parsed = pd.to_datetime(
        value,
        errors="coerce",
        dayfirst=True,
        utc=True,
    )

    if pd.isna(parsed):
        return None

    return parsed.tz_localize(None).normalize()


def load_sensors(path):
    df = pd.read_csv(path)

    required = {
        "sensor_id",
        "timestamp",
        "latitude",
        "longitude",
        "rainfall_1h",
        "rainfall_6h",
        "rainfall_24h",
        "soil_moisture",
    }

    missing = required - set(df.columns)

    if missing:
        raise ValueError(
            f"Sensor dataset is missing columns: "
            f"{sorted(missing)}"
        )

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce",
        utc=True,
    ).dt.tz_localize(None)

    numeric_columns = [
        "latitude",
        "longitude",
        "rainfall_1h",
        "rainfall_6h",
        "rainfall_24h",
        "soil_moisture",
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    mask = df["soil_moisture"].between(0, 1)

    df.loc[mask, "soil_moisture"] *= 100

    df = df.dropna(
        subset=[
            "sensor_id",
            "timestamp",
            "latitude",
            "longitude",
            "rainfall_1h",
            "rainfall_6h",
            "rainfall_24h",
            "soil_moisture",
        ]
    )

    return df.sort_values(
        ["sensor_id", "timestamp"]
    ).reset_index(drop=True)


def load_terrain(path):
    df = pd.read_csv(path)

    required = {
        "Latitude",
        "Longitude",
        "Elevation_m",
        "Slope_deg",
        "Aspect_deg",
    }

    missing = required - set(df.columns)

    if missing:
        raise ValueError(
            f"Terrain dataset is missing columns: "
            f"{sorted(missing)}"
        )

    df = df.rename(
        columns={
            "Latitude": "latitude",
            "Longitude": "longitude",
            "Elevation_m": "elevation",
            "Slope_deg": "slope",
            "Aspect_deg": "aspect",
        }
    )

    numeric_columns = [
        "latitude",
        "longitude",
        "elevation",
        "slope",
        "aspect",
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    return df.dropna(
        subset=numeric_columns
    ).reset_index(drop=True)


def load_landslides(path):
    df = pd.read_csv(path)

    required = {
        "Latitude",
        "Longitude",
        "History",
    }

    missing = required - set(df.columns)

    if missing:
        raise ValueError(
            f"Landslide dataset is missing columns: "
            f"{sorted(missing)}"
        )

    df["event_date"] = df["History"].apply(
        parse_history
    )

    df["latitude"] = pd.to_numeric(
        df["Latitude"],
        errors="coerce",
    )

    df["longitude"] = pd.to_numeric(
        df["Longitude"],
        errors="coerce",
    )

    return df.dropna(
        subset=[
            "event_date",
            "latitude",
            "longitude",
        ]
    ).reset_index(drop=True)


def build_sensor_locations(sensors):
    return (
        sensors[
            [
                "sensor_id",
                "latitude",
                "longitude",
            ]
        ]
        .drop_duplicates("sensor_id")
        .reset_index(drop=True)
    )


def nearest_sensor(
    latitude,
    longitude,
    sensor_locations,
    max_distance_km=100,
):
    best_sensor = None
    best_distance = float("inf")

    for _, sensor in sensor_locations.iterrows():
        current_distance = distance_km(
            latitude,
            longitude,
            sensor["latitude"],
            sensor["longitude"],
        )

        if current_distance < best_distance:
            best_distance = current_distance
            best_sensor = sensor["sensor_id"]

    if best_sensor is None:
        return None, None

    if best_distance > max_distance_km:
        return None, None

    return best_sensor, best_distance


def nearest_terrain(
    latitude,
    longitude,
    terrain,
):
    distances = (
        (terrain["latitude"] - latitude) ** 2
        + (terrain["longitude"] - longitude) ** 2
    )

    return terrain.loc[
        distances.idxmin()
    ]


def make_training_row(
    sensor_row,
    terrain_row,
    label,
):
    return {
        "rainfall_1h": float(
            sensor_row["rainfall_1h"]
        ),
        "rainfall_6h": float(
            sensor_row["rainfall_6h"]
        ),
        "rainfall_24h": float(
            sensor_row["rainfall_24h"]
        ),
        "soil_moisture": float(
            sensor_row["soil_moisture"]
        ),
        "elevation": float(
            terrain_row["elevation"]
        ),
        "slope": float(
            terrain_row["slope"]
        ),
        "aspect": float(
            terrain_row["aspect"]
        ),
        "label": int(label),
    }


def select_event_sensor_observation(
    sensor_data,
    event_date,
):
    start = (
        event_date
        - pd.Timedelta(days=1)
    )

    end = (
        event_date
        + pd.Timedelta(days=1)
    )

    candidates = sensor_data[
        (
            sensor_data["timestamp"]
            >= start
        )
        & (
            sensor_data["timestamp"]
            <= end
        )
    ].copy()

    if candidates.empty:
        return None

    candidates["time_difference"] = (
        candidates["timestamp"]
        - event_date
    ).abs()

    return candidates.sort_values(
        "time_difference"
    ).iloc[0]


def build_positive_samples(
    landslides,
    sensors,
    terrain,
):
    rows = []

    sensor_locations = build_sensor_locations(
        sensors
    )

    sensor_groups = {
        sensor_id: group
        for sensor_id, group
        in sensors.groupby("sensor_id")
    }

    sensor_min = sensors["timestamp"].min()
    sensor_max = sensors["timestamp"].max()

    matched = 0

    for _, event in landslides.iterrows():
        event_date = event["event_date"]

        if (
            event_date
            < sensor_min.normalize()
        ):
            continue

        if (
            event_date
            > sensor_max.normalize()
        ):
            continue

        sensor_id, _ = nearest_sensor(
            event["latitude"],
            event["longitude"],
            sensor_locations,
            max_distance_km=100,
        )

        if sensor_id is None:
            continue

        sensor_row = select_event_sensor_observation(
            sensor_groups[sensor_id],
            event_date,
        )

        if sensor_row is None:
            continue

        terrain_row = nearest_terrain(
            event["latitude"],
            event["longitude"],
            terrain,
        )

        rows.append(
            make_training_row(
                sensor_row,
                terrain_row,
                1,
            )
        )

        matched += 1

    print(
        f"Matched dated landslide events: {matched}"
    )

    return pd.DataFrame(rows)


def build_event_windows(
    landslides,
    sensors,
):
    sensor_locations = build_sensor_locations(
        sensors
    )

    windows = []

    for _, event in landslides.iterrows():
        sensor_id, _ = nearest_sensor(
            event["latitude"],
            event["longitude"],
            sensor_locations,
            max_distance_km=100,
        )

        if sensor_id is None:
            continue

        event_date = event["event_date"]

        windows.append(
            (
                sensor_id,
                event_date
                - pd.Timedelta(days=1),
                event_date
                + pd.Timedelta(days=1),
            )
        )

    return windows


def is_event_period(
    sensor_id,
    timestamp,
    event_windows,
):
    for (
        event_sensor_id,
        start,
        end,
    ) in event_windows:
        if (
            sensor_id == event_sensor_id
            and start <= timestamp <= end
        ):
            return True

    return False


def build_negative_samples(
    sensors,
    terrain,
    event_windows,
    count,
):
    candidates = sensors.sample(
        frac=1,
        random_state=42,
    ).reset_index(drop=True)

    rows = []

    for _, sensor_row in candidates.iterrows():
        if is_event_period(
            sensor_row["sensor_id"],
            sensor_row["timestamp"],
            event_windows,
        ):
            continue

        terrain_row = nearest_terrain(
            sensor_row["latitude"],
            sensor_row["longitude"],
            terrain,
        )

        rows.append(
            make_training_row(
                sensor_row,
                terrain_row,
                0,
            )
        )

        if len(rows) >= count:
            break

    return pd.DataFrame(rows)


def build_dataset(
    sensor_path,
    terrain_path,
    landslide_path,
    output_path,
):
    sensors = load_sensors(
        sensor_path
    )

    terrain = load_terrain(
        terrain_path
    )

    landslides_all = pd.read_csv(
        landslide_path
    )

    landslides = load_landslides(
        landslide_path
    )

    print(
        f"Total landslide records: "
        f"{len(landslides_all)}"
    )

    print(
        f"Records with exact dates: "
        f"{len(landslides)}"
    )

    print(
        f"Year-only/undated records excluded: "
        f"{len(landslides_all) - len(landslides)}"
    )

    print(
        f"Sensor observations: "
        f"{len(sensors)}"
    )

    print(
        f"Sensor period: "
        f"{sensors['timestamp'].min()} "
        f"to "
        f"{sensors['timestamp'].max()}"
    )

    positive = build_positive_samples(
        landslides,
        sensors,
        terrain,
    )

    if positive.empty:
        raise ValueError(
            "No dated landslides could be matched "
            "to sensor observations."
        )

    print(
        f"Positive samples: "
        f"{len(positive)}"
    )

    event_windows = build_event_windows(
        landslides,
        sensors,
    )

    negative = build_negative_samples(
        sensors,
        terrain,
        event_windows,
        len(positive),
    )

    if negative.empty:
        raise ValueError(
            "No valid negative sensor observations "
            "were found."
        )

    sample_count = min(
        len(positive),
        len(negative),
    )

    positive = positive.sample(
        n=sample_count,
        random_state=42,
    )

    negative = negative.sample(
        n=sample_count,
        random_state=42,
    )

    dataset = pd.concat(
        [
            positive,
            negative,
        ],
        ignore_index=True,
    )

    dataset = dataset[
        FEATURES + ["label"]
    ]

    dataset = dataset.dropna()

    dataset = dataset.sample(
        frac=1,
        random_state=42,
    ).reset_index(drop=True)

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    dataset.to_csv(
        output_path,
        index=False,
    )

    print(
        f"Training rows: {len(dataset)}"
    )

    print(
        f"Positive rows: "
        f"{int((dataset['label'] == 1).sum())}"
    )

    print(
        f"Negative rows: "
        f"{int((dataset['label'] == 0).sum())}"
    )

    print(
        f"Saved to: {output_path}"
    )


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--sensors",
        type=Path,
        default=Path(
            "data/iot_sensor_data_with_soil.csv"
        ),
    )

    parser.add_argument(
        "--terrain",
        type=Path,
        default=Path(
            "data/terrain.csv"
        ),
    )

    parser.add_argument(
        "--landslides",
        type=Path,
        default=Path(
            "data/landslide_final.csv"
        ),
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "data/landslide_training.csv"
        ),
    )

    args = parser.parse_args()

    build_dataset(
        sensor_path=args.sensors,
        terrain_path=args.terrain,
        landslide_path=args.landslides,
        output_path=args.output,
    )


if __name__ == "__main__":
    main()