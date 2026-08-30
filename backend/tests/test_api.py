"""
Minimal test suite covering this module's owned endpoints (implementation
notes sec. 21). Uses an isolated in-memory SQLite DB per test run so tests
never touch the real dev database.

Run with:
    pytest backend/tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database.connection import Base, get_db
from backend.database.seed import (
    HISTORICAL_EVENTS,
    LOCATIONS,
    RISK_PREDICTIONS,
    SENSORS,
    SHELTERS,
    SEED_TIMESTAMP,
)
from backend.main import app
from backend.models.historical_event import HistoricalEvent
from backend.models.location import Location
from backend.models.risk_prediction import RiskPrediction
from backend.models.sensor import Sensor
from backend.models.sensor_reading import SensorReading
from backend.models.shelter import Shelter

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture()
def client():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed a small known dataset directly (bypasses backend.database.seed's
    # own engine, which points at DATABASE_URL, not this test DB).
    db = TestingSessionLocal()
    for row in SHELTERS:
        db.add(Shelter(**row))
    db.flush()
    for row in LOCATIONS:
        db.add(Location(**row))
    db.flush()
    for row in SENSORS:
        reading = dict(row["reading"])
        db.add(
            Sensor(
                id=row["id"],
                location_id=row["location_id"],
                latitude=30.0,
                longitude=78.0,
                sensor_type=row["sensor_type"],
                status=row["status"],
                last_updated=SEED_TIMESTAMP,
            )
        )
        db.flush()
        db.add(SensorReading(sensor_id=row["id"], timestamp=SEED_TIMESTAMP, **reading))
    for row in RISK_PREDICTIONS:
        db.add(RiskPrediction(timestamp=SEED_TIMESTAMP, **row))
    for row in HISTORICAL_EVENTS:
        db.add(HistoricalEvent(**row))
    db.commit()
    db.close()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"


def test_list_locations(client):
    resp = client.get("/locations")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == len(LOCATIONS)
    assert {loc["id"] for loc in body} == {loc["id"] for loc in LOCATIONS}


def test_get_location_valid_id(client):
    resp = client.get("/locations/loc-001")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "loc-001"
    assert body["name"] == "Kaudiyala"
    assert "related_endpoints" in body


def test_get_location_invalid_id(client):
    resp = client.get("/locations/loc-999")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_list_shelters(client):
    resp = client.get("/shelters")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == len(SHELTERS)


def test_nearest_shelter(client):
    # Close to loc-001 / shelter-001.
    resp = client.get("/shelters/nearest", params={"latitude": 30.221, "longitude": 78.478})
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "shelter-001"
    assert body["distance_km"] >= 0


def test_nearest_shelter_requires_coordinates(client):
    resp = client.get("/shelters/nearest")
    assert resp.status_code == 422
