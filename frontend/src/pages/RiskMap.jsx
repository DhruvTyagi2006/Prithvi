import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet';

import gsap from 'gsap';
import 'leaflet/dist/leaflet.css';

import RiskBadge from '../components/RiskBadge';
import {
  getLocations,
  getRisk,
  getShelters,
} from '../services/api';

function FlyToLocation({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.flyTo(
        [Number(location.latitude), Number(location.longitude)],
        11,
        {
          duration: 0.9,
        }
      );
    }
  }, [location, map]);

  return null;
}

function getRiskStyle(level) {
  switch (level) {
    case 'CRITICAL':
      return {
        color: '#dc2626',
        fillOpacity: 0.85,
      };

    case 'HIGH':
      return {
        color: '#ea580c',
        fillOpacity: 0.8,
      };

    case 'MODERATE':
      return {
        color: '#d97706',
        fillOpacity: 0.75,
      };

    case 'LOW':
    default:
      return {
        color: '#3f7d5a',
        fillOpacity: 0.65,
      };
  }
}

export default function RiskMap() {
  const [searchParams, setSearchParams] = useSearchParams();

  const preselected = searchParams.get('location');

  // =====================================================
  // STATE
  // =====================================================

  const [locations, setLocations] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [risks, setRisks] = useState({});

  const [selectedId, setSelectedId] = useState(
    preselected || null
  );

  const [loading, setLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(false);
  const [error, setError] = useState(null);

  const panelRef = useRef(null);

  // =====================================================
  // LOAD LOCATIONS + SHELTERS + RISK DATA
  // =====================================================

  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [locationData, shelterData] =
          await Promise.all([
            getLocations(),
            getShelters(),
          ]);

        console.log(
          'Risk Map locations:',
          locationData
        );

        console.log(
          'Risk Map shelters:',
          shelterData
        );

        const processedLocations = Array.isArray(
          locationData
        )
          ? locationData
          : locationData?.locations || [];

        const processedShelters = Array.isArray(
          shelterData
        )
          ? shelterData
          : shelterData?.shelters || [];

        setLocations(processedLocations);
        setShelters(processedShelters);

        // Select URL location if it exists.
        // Otherwise select the first location.
        if (processedLocations.length > 0) {
          const urlLocationExists =
            preselected &&
            processedLocations.some(
              (location) =>
                String(location.id) ===
                String(preselected)
            );

          setSelectedId(
            urlLocationExists
              ? preselected
              : processedLocations[0].id
          );
        }

        // =================================================
        // FETCH RISK FOR EVERY LOCATION
        // =================================================

        const riskResults = await Promise.all(
          processedLocations.map(async (location) => {
            try {
              const risk = await getRisk(location.id);

              return {
                locationId: location.id,
                risk,
              };
            } catch (riskError) {
              console.error(
                `Failed to load risk for ${location.id}:`,
                riskError
              );

              return {
                locationId: location.id,
                risk: null,
              };
            }
          })
        );

        const riskMap = {};

        riskResults.forEach(
          ({ locationId, risk }) => {
            if (risk) {
              riskMap[locationId] = risk;
            }
          }
        );

        console.log(
          'Risk Map risk data:',
          riskMap
        );

        setRisks(riskMap);
      } catch (err) {
        console.error(
          'Failed to load risk map data:',
          err
        );

        setError(
          err?.message ||
            'Failed to load risk map data'
        );
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, [preselected]);

  // =====================================================
  // UPDATE SELECTED LOCATION FROM URL
  // =====================================================

  useEffect(() => {
    if (!preselected || locations.length === 0) {
      return;
    }

    const exists = locations.some(
      (location) =>
        String(location.id) ===
        String(preselected)
    );

    if (exists) {
      setSelectedId(preselected);
    }
  }, [preselected, locations]);

  // =====================================================
  // SELECTED LOCATION
  // =====================================================

  const selected = useMemo(() => {
    return locations.find(
      (location) =>
        String(location.id) ===
        String(selectedId)
    );
  }, [locations, selectedId]);

  // =====================================================
  // SELECTED LOCATION RISK
  // =====================================================

  const selectedRisk = selected
    ? risks[selected.id]
    : null;

  // =====================================================
  // NEAREST SHELTER
  // =====================================================

  const shelter = useMemo(() => {
    if (!selected) {
      return null;
    }

    return shelters.find(
      (shelterItem) =>
        String(shelterItem.id) ===
        String(selected.nearest_shelter_id)
    );
  }, [selected, shelters]);

  // =====================================================
  // GSAP PANEL ANIMATION
  // =====================================================

  useEffect(() => {
    if (!panelRef.current || !selected) {
      return;
    }

    gsap.fromTo(
      panelRef.current,
      {
        opacity: 0,
        x: 24,
      },
      {
        opacity: 1,
        x: 0,
        duration: 0.4,
        ease: 'power2.out',
      }
    );
  }, [selectedId]);

  // =====================================================
  // LOCATION SELECT HANDLER
  // =====================================================

  const handleLocationSelect = (locationId) => {
    setSelectedId(locationId);

    setSearchParams({
      location: locationId,
    });
  };

  // =====================================================
  // MAP CENTER
  // =====================================================

  const center = [30.35, 78.9];

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#163A5F]">
          Loading risk map...
        </p>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-600">
            Failed to load risk map
          </p>

          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // NO LOCATIONS
  // =====================================================

  if (locations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#163A5F]">
          No location data available.
        </p>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss-deep">
        Risk Map
      </p>

      <h1 className="mt-1 font-display text-3xl text-[#163A5F]">
        Hyper-local risk visualization
      </h1>

      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Locations are displayed using live backend
        prediction data. Select a marker to view
        flood probability, landslide probability,
        environmental conditions, warning time,
        and the nearest shelter.
      </p>

      {/* =====================================================
          MAP + DETAILS
      ===================================================== */}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">

        {/* ===================================================
            MAP
        =================================================== */}

        <div className="h-[560px] overflow-hidden rounded-2xl border border-[#163A5F]/10 shadow-sm">

          <MapContainer
            center={center}
            zoom={9}
            className="h-full w-full"
            scrollWheelZoom
          >

            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyToLocation location={selected} />

            {/* ===============================================
                LOCATION MARKERS
            =============================================== */}

            {locations.map((location) => {
              const risk =
                risks[location.id];

              const riskLevel =
                risk?.overall_risk || 'LOW';

              const riskStyle =
                getRiskStyle(riskLevel);

              const isSelected =
                String(location.id) ===
                String(selectedId);

              return (
                <CircleMarker
                  key={location.id}
                  center={[
                    Number(location.latitude),
                    Number(location.longitude),
                  ]}
                  radius={
                    isSelected ? 14 : 10
                  }
                  pathOptions={{
                    color:
                      riskStyle.color,
                    fillColor:
                      riskStyle.color,
                    fillOpacity:
                      isSelected
                        ? 0.9
                        : riskStyle.fillOpacity,
                    weight:
                      isSelected ? 3 : 1.5,
                  }}
                  eventHandlers={{
                    click: () =>
                      handleLocationSelect(
                        location.id
                      ),
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -8]}
                  >
                    {location.name} &middot;{' '}
                    {riskLevel}
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* ===============================================
                SHELTER MARKERS
            =============================================== */}

            {shelters.map((shelterItem) => (
              <CircleMarker
                key={shelterItem.id}
                center={[
                  Number(
                    shelterItem.latitude
                  ),
                  Number(
                    shelterItem.longitude
                  ),
                ]}
                radius={5}
                pathOptions={{
                  color: '#0F2027',
                  fillColor: '#AFD8E0',
                  fillOpacity: 0.9,
                  weight: 1.5,
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -6]}
                >
                  Shelter:{' '}
                  {shelterItem.name}
                </Tooltip>
              </CircleMarker>
            ))}

          </MapContainer>
        </div>

        {/* ===================================================
            DETAIL PANEL
        =================================================== */}

        {selected && (
          <div
            ref={panelRef}
            className="h-fit rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm"
          >

            {/* LOCATION NAME */}

            <div className="flex items-start justify-between gap-3">

              <div>
                <h2 className="font-display text-2xl text-[#163A5F]">
                  {selected.name}
                </h2>

                <p className="text-xs text-ink/45">
                  {selected.district},{' '}
                  {selected.state}
                </p>
              </div>

              <RiskBadge
                level={
                  selectedRisk?.overall_risk ||
                  'LOW'
                }
              />

            </div>

            {/* =================================================
                RISK VALUES
            ================================================= */}

            {riskLoading ? (
              <p className="mt-5 text-sm text-ink/50">
                Loading prediction...
              </p>
            ) : (
              <dl className="mt-5 space-y-2.5 font-mono text-sm">

                <div className="flex items-center justify-between border-b border-[#163A5F]/10 pb-2">
                  <dt className="text-ink/50">
                    Flood Probability
                  </dt>

                  <dd className="text-[#163A5F]">
                    {selectedRisk
                      ? `${Math.round(
                          Number(
                            selectedRisk.flood_probability
                          ) * 100
                        )}%`
                      : '--'}
                  </dd>
                </div>

                <div className="flex items-center justify-between border-b border-[#163A5F]/10 pb-2">
                  <dt className="text-ink/50">
                    Landslide Probability
                  </dt>

                  <dd className="text-[#163A5F]">
                    {selectedRisk
                      ? `${Math.round(
                          Number(
                            selectedRisk.landslide_probability
                          ) * 100
                        )}%`
                      : '--'}
                  </dd>
                </div>

                <div className="flex items-center justify-between border-b border-[#163A5F]/10 pb-2">
                  <dt className="text-ink/50">
                    Warning Window
                  </dt>

                  <dd className="text-[#163A5F]">
                    {selectedRisk?.lead_time != null
                      ? `~${selectedRisk.lead_time} min`
                      : '--'}
                  </dd>
                </div>

                <div className="flex items-center justify-between border-b border-[#163A5F]/10 pb-2">
                  <dt className="text-ink/50">
                    Elevation
                  </dt>

                  <dd className="text-[#163A5F]">
                    {selected.elevation != null
                      ? `${selected.elevation} m`
                      : '--'}
                  </dd>
                </div>

                <div className="flex items-center justify-between border-b border-[#163A5F]/10 pb-2">
                  <dt className="text-ink/50">
                    Slope
                  </dt>

                  <dd className="text-[#163A5F]">
                    {selected.slope != null
                      ? `${selected.slope}°`
                      : '--'}
                  </dd>
                </div>

                <div className="flex items-center justify-between border-b border-[#163A5F]/10 pb-2">
                  <dt className="text-ink/50">
                    Soil Type
                  </dt>

                  <dd className="text-[#163A5F]">
                    {selected.soil_type || '--'}
                  </dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-ink/50">
                    Population
                  </dt>

                  <dd className="text-[#163A5F]">
                    {selected.population != null
                      ? Number(
                          selected.population
                        ).toLocaleString(
                          'en-IN'
                        )
                      : '--'}
                  </dd>
                </div>

              </dl>
            )}

            {/* =================================================
                LAST UPDATED
            ================================================= */}

            <p className="mt-4 text-[11px] text-ink/40">
              Prediction updated{' '}
              {selectedRisk?.timestamp
                ? new Date(
                    selectedRisk.timestamp
                  ).toLocaleString('en-IN')
                : '--'}
            </p>

            {/* =================================================
                SHELTER
            ================================================= */}

            {shelter && (
              <div className="mt-4 rounded-lg bg-mist-deep px-3 py-2.5 text-sm">

                <p className="text-xs text-ink/45">
                  Nearest Shelter
                </p>

                <p className="font-medium text-[#163A5F]">
                  {shelter.name}
                </p>

                <p className="mt-1 text-xs text-ink/55">
                  Capacity:{' '}
                  {shelter.capacity}
                </p>

              </div>
            )}

            {/* =================================================
                FULL LOCATION DETAILS
            ================================================= */}

            <Link
              to={`/location/${selected.id}`}
              className="mt-5 block rounded-full bg-[#163A5F] px-4 py-2.5 text-center text-sm font-semibold text-mist transition-transform hover:scale-105"
            >
              Full location details
            </Link>

          </div>
        )}

      </div>

      {/* =====================================================
          LOCATION SELECTOR
      ===================================================== */}

      <div className="mt-5 rounded-2xl border border-[#163A5F]/10 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-xs uppercase tracking-wide text-ink/45">
              Select Location
            </p>

            <p className="mt-1 text-sm text-ink/60">
              Choose a monitored location to view
              its current prediction.
            </p>
          </div>

          <select
            value={selectedId || ''}
            onChange={(event) =>
              handleLocationSelect(
                event.target.value
              )
            }
            className="rounded-full border border-[#163A5F]/20 bg-white px-4 py-2 text-sm font-medium text-[#163A5F] focus:outline-none focus:ring-2 focus:ring-moss/40"
          >
            {locations.map((location) => (
              <option
                key={location.id}
                value={location.id}
              >
                {location.name},{' '}
                {location.district}
              </option>
            ))}
          </select>

        </div>

      </div>

    </div>
  );
}