# Prithvi Backend — Core API / Database / Location Module

This is **Developer 1's** portion of the Prithvi backend: core API architecture,
database, and location/shelter/historical data. It is built as the shared
foundation that the ML (prediction) and IoT/risk/alerts modules plug into —
it does not implement prediction, sensors, alerts, or simulation logic.

## Stack

Python · FastAPI · Pydantic · SQLAlchemy · PostgreSQL (SQLite for local/zero-config dev)

## 1. Install

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
```

## 2. Configure the database

```bash
cp .env.example .env
```

By default `DATABASE_URL` is a local SQLite file (`sqlite:///./prithvi.db`) —
this needs no setup and is fine for development or for teammates who just
want to run the API. For Postgres (the PRD's recommended target), edit `.env`:

```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/prithvi
```

Works the same way with a managed instance (Supabase, Neon, Railway) — just
paste in the connection string they give you.

## 3. Run

From the **repository root** (not inside `backend/`), so the `backend.*`
package imports resolve correctly:

```bash
uvicorn backend.main:app --reload
```

Tables are created automatically on startup (`init_db()` — no separate
migration step for this MVP).

## 4. Seed demo data

```bash
python3 -m backend.database.seed
```

Seeds 6 locations, 4 shelters, 6 sensors + readings, 6 risk predictions, and
3 historical events, mirrored from the frontend's `src/data/mockData.js` so
the API returns the same demo villages the UI was designed against. This is
fictionalized/simulated data for the hackathon MVP, not validated real-world
measurements. Safe to re-run — it skips seeding if locations already exist.

## 5. Explore the API

Open **http://127.0.0.1:8000/docs** for interactive Swagger, or
**/redoc** for ReDoc. Every endpoint below appears there with full
request/response schemas.

## Endpoints owned by this module

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | API + DB connectivity check |
| GET | `/locations` | All villages/wards (static/reference fields only) |
| GET | `/locations/{location_id}` | 404 on unknown id; includes pointers to risk/sensor/shelter endpoints |
| GET | `/shelters` | All shelters |
| GET | `/shelters/nearest?latitude=&longitude=` | Nearest shelter + dynamically computed distance (haversine, no routing) |

## Placeholder endpoints (owned by Developer 2 / Developer 3)

`/predict`, `/risk/{location_id}`, `/sensors`, `/sensors/{sensor_id}`,
`/sensors/data`, `/alerts`, `/alerts/{location_id}`, `/simulation/start`,
`/simulation/step` are mounted (see `routers/placeholders.py`) so their
agreed request/response contracts are visible in Swagger, but they return
`501 Not Implemented`. Replace each with a real router as that module lands,
then remove the matching stub and its `include_router` call in `main.py`.

## Database structure

```
Location ──< Sensor ──< SensorReading
   │
   └──< RiskPrediction

Shelter          (referenced by Location.nearest_shelter_id; distance to a
                  shelter is always computed at request time, never stored)

HistoricalEvent  (stores its own lat/lng — not FK'd to Location, since past
                  events don't line up with today's village boundaries)
```

Key modeling decision: environmental/risk fields shown in the frontend mock
(rainfall, soil moisture, flood/landslide probability, lead time) are **not**
columns on `Location`. They live on `SensorReading` (raw environmental
observations) and `RiskPrediction` (model output), each keyed to a location
by foreign key. `Location` holds only static identity/geography/terrain
fields. This keeps the data model correct while still letting the frontend
reconstruct the same view it currently gets from `mockData.js`.

## Integration points for the ML and IoT developers

- Import shared models from `backend.models.*` and shared schemas from
  `backend.schemas.*` — there is **one** definition of each entity; don't
  redefine `Sensor`, `SensorReading`, or `RiskPrediction` in your own module.
- Add your router (e.g. `routers/predict.py`) and `include_router()` it in
  `main.py` in place of the matching stub in `routers/placeholders.py`.
- Use `backend.database.connection.get_db` as your FastAPI dependency to get
  a request-scoped `Session`, exactly as `routers/locations.py` and
  `routers/shelters.py` do.
- The `/predict` request/response shape is already defined in
  `schemas/predict.py`, copied verbatim from the PRD (sec. 15/21).

## Tests

```bash
pytest backend/tests
```

Covers `/health`, `/locations` (list, get-by-id, 404), `/shelters`, and
`/shelters/nearest` (including the required-params 422 case) against an
isolated in-memory SQLite database.

## Project structure

```
backend/
├── main.py                  # FastAPI app, CORS, router mounting
├── config.py                 # env-based settings
├── requirements.txt
├── .env.example
├── database/
│   ├── connection.py          # engine/session/Base, init_db(), health check
│   └── seed.py                 # demo data seeding (mirrors mockData.js)
├── models/                    # SQLAlchemy models (one shared definition each)
│   ├── location.py
│   ├── shelter.py
│   ├── sensor.py
│   ├── sensor_reading.py
│   ├── risk_prediction.py
│   └── historical_event.py
├── schemas/                   # Pydantic request/response contracts
│   ├── common.py               # shared error format
│   ├── location.py
│   ├── shelter.py
│   ├── sensor.py
│   ├── sensor_reading.py
│   ├── risk_prediction.py
│   ├── historical_event.py
│   └── predict.py              # shared /predict contract (Dev 2 implements)
├── routers/
│   ├── health.py
│   ├── locations.py
│   ├── shelters.py
│   └── placeholders.py         # 501 stubs for Dev 2 / Dev 3 endpoints
├── services/                  # business logic, kept out of routers
│   ├── geo.py                   # haversine distance
│   ├── location_service.py
│   └── shelter_service.py
└── tests/
    └── test_api.py
```
