import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import gsap from 'gsap';

import RiskBadge from '../components/RiskBadge';

import { classifyRisk } from '../data/mockData';

import {
  getLocations,
  getSensors,
  getRisk,
  getShelters,
} from '../services/api';

function StatusDot({ status }) {
  const color =
    status === 'ONLINE'
      ? 'bg-moss'
      : status === 'WARNING'
        ? 'bg-risk-moderate'
        : 'bg-risk-critical';

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color}`}
    />
  );
}

export default function Dashboard() {
  console.log('DASHBOARD COMPONENT LOADED');

  // =====================================================
  // STATE
  // =====================================================

  const [locations, setLocations] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [shelters, setShelters] = useState([]);

  const [risk, setRisk] = useState(null);

  const [selectedId, setSelectedId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(false);

  const [error, setError] = useState(null);

  const cardsRef = useRef(null);

  // =====================================================
  // LOAD LOCATIONS + SENSORS + SHELTERS
  // =====================================================

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          locationData,
          sensorData,
          shelterData,
        ] = await Promise.all([
          getLocations(),
          getSensors(),
          getShelters(),
        ]);

        console.log(
          'Locations received from backend:',
          locationData
        );

        console.log(
          'Sensors received from backend:',
          sensorData
        );

        console.log(
          'Shelters received from backend:',
          shelterData
        );

        // =================================================
        // LOCATIONS
        // =================================================

        const processedLocations = Array.isArray(
          locationData
        )
          ? locationData
          : locationData?.locations || [];

        setLocations(processedLocations);

        // Select first location
        if (processedLocations.length > 0) {
          setSelectedId(processedLocations[0].id);
        }

        // =================================================
        // SENSORS
        // =================================================

        const processedSensors = Array.isArray(sensorData)
          ? sensorData
          : sensorData?.sensors || [];

        setSensors(processedSensors);

        // =================================================
        // SHELTERS
        // =================================================

        const processedShelters = Array.isArray(
          shelterData
        )
          ? shelterData
          : shelterData?.shelters || [];

        setShelters(processedShelters);
      } catch (err) {
        console.error(
          'Failed to load dashboard data:',
          err
        );

        setError(
          err?.message ||
            'Failed to load dashboard data'
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // =====================================================
  // LOAD RISK WHEN LOCATION CHANGES
  // =====================================================

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const loadRisk = async () => {
      try {
        setRiskLoading(true);

        console.log(
          'Fetching risk for location:',
          selectedId
        );

        const riskData = await getRisk(selectedId);

        console.log(
          'Risk received from backend:',
          riskData
        );

        setRisk(riskData);
      } catch (err) {
        console.error(
          'Failed to load risk:',
          err
        );

        setRisk(null);
      } finally {
        setRiskLoading(false);
      }
    };

    loadRisk();
  }, [selectedId]);

  // =====================================================
  // CURRENT LOCATION
  // =====================================================

  const location = useMemo(() => {
    return locations.find(
      (loc) =>
        String(loc.id) ===
        String(selectedId)
    );
  }, [locations, selectedId]);

  // =====================================================
  // LOCATION SENSORS
  // =====================================================

  /*
   * IMPORTANT:
   *
   * Locations use IDs like:
   *
   * loc-005
   *
   * Sensors currently use IDs like:
   *
   * NAG_02
   *
   * Therefore we CANNOT match sensors using:
   *
   * sensor.location_id === location.id
   *
   * Instead, we match sensors using their coordinates.
   *
   * If a sensor is within a small distance of the
   * selected location, we consider it associated.
   */

  const locationSensors = useMemo(() => {
    if (!location) {
      return [];
    }

    const LOCATION_DISTANCE_THRESHOLD = 0.15;

    return sensors.filter((sensor) => {
      if (
        sensor.latitude == null ||
        sensor.longitude == null ||
        location.latitude == null ||
        location.longitude == null
      ) {
        return false;
      }

      const latitudeDifference =
        Math.abs(
          Number(sensor.latitude) -
            Number(location.latitude)
        );

      const longitudeDifference =
        Math.abs(
          Number(sensor.longitude) -
            Number(location.longitude)
        );

      return (
        latitudeDifference <=
          LOCATION_DISTANCE_THRESHOLD &&
        longitudeDifference <=
          LOCATION_DISTANCE_THRESHOLD
      );
    });
  }, [sensors, location]);

  // =====================================================
  // NEAREST SHELTER
  // =====================================================

  const shelter = useMemo(() => {
    if (!location) {
      return null;
    }

    return shelters.find(
      (shelterItem) =>
        String(shelterItem.id) ===
        String(location.nearest_shelter_id)
    );
  }, [location, shelters]);

  // =====================================================
  // RISK VALUES
  // =====================================================

  const floodProbability =
    Number(risk?.flood_probability ?? 0);

  const landslideProbability =
    Number(
      risk?.landslide_probability ?? 0
    );

  const highestProbability = Math.max(
    floodProbability,
    landslideProbability
  );

  const calculatedRisk =
    classifyRisk(
      highestProbability * 100
    );

  const overallRisk = risk
    ? {
        key:
          risk.overall_risk ||
          calculatedRisk.key,

        color: calculatedRisk.color,

        bg: calculatedRisk.bg,
      }
    : classifyRisk(0);

  // =====================================================
  // ALERT
  // =====================================================

  const alert = useMemo(() => {
    if (!risk || !location) {
      return null;
    }

    const level =
      risk.overall_risk || 'LOW';

    if (level === 'CRITICAL') {
      return {
        level: 'CRITICAL',
        headline:
          'Critical disaster risk detected',
        detail:
          'Current environmental conditions indicate a high probability of flood or landslide activity. Immediate precautionary action is recommended.',
        factors: [
          `Flood probability: ${Math.round(
            floodProbability * 100
          )}%`,
          `Landslide probability: ${Math.round(
            landslideProbability * 100
          )}%`,
        ],
        recommendedAction:
          'Move to the nearest safe shelter and follow local emergency instructions.',
      };
    }

    if (level === 'HIGH') {
      return {
        level: 'HIGH',
        headline:
          'High disaster risk detected',
        detail:
          'Environmental conditions indicate elevated flood or landslide risk. Residents should remain alert and prepare for possible evacuation.',
        factors: [
          `Flood probability: ${Math.round(
            floodProbability * 100
          )}%`,
          `Landslide probability: ${Math.round(
            landslideProbability * 100
          )}%`,
        ],
        recommendedAction:
          'Stay alert, monitor warnings, and be prepared to move to a safe location.',
      };
    }

    if (level === 'MODERATE') {
      return {
        level: 'MODERATE',
        headline:
          'Moderate disaster risk detected',
        detail:
          'Current conditions show a moderate level of flood or landslide risk. Continued monitoring is recommended.',
        factors: [
          `Flood probability: ${Math.round(
            floodProbability * 100
          )}%`,
          `Landslide probability: ${Math.round(
            landslideProbability * 100
          )}%`,
        ],
        recommendedAction:
          'Continue monitoring conditions and remain prepared for changing risk levels.',
      };
    }

    return {
      level: 'LOW',
      headline:
        'Low disaster risk',
      detail:
        'Current environmental conditions indicate relatively low disaster risk.',
      factors: [
        `Flood probability: ${Math.round(
          floodProbability * 100
        )}%`,
        `Landslide probability: ${Math.round(
          landslideProbability * 100
        )}%`,
      ],
      recommendedAction:
        'No immediate action required. Continue normal monitoring.',
    };
  }, [
    risk,
    location,
    floodProbability,
    landslideProbability,
  ]);

  // =====================================================
  // GSAP ANIMATION
  // =====================================================

  useEffect(() => {
    if (loading || !location) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from('.dash-card', {
        opacity: 0,
        y: 16,
        stagger: 0.06,
        duration: 0.5,
        ease: 'power2.out',
      });
    }, cardsRef);

    return () => ctx.revert();
  }, [
    selectedId,
    loading,
    location,
  ]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#163A5F]">
          Loading dashboard...
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
            Failed to load dashboard
          </p>

          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // NO LOCATION
  // =====================================================

  if (!location) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#163A5F]">
          No location data available.
        </p>
      </div>
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss-deep">
            Dashboard
          </p>

          <h1 className="mt-1 font-display text-3xl text-[#163A5F]">
            Prithvi &mdash; Hyper-Local Disaster Early Warning
          </h1>
        </div>

        <select
          value={selectedId || ''}
          onChange={(e) =>
            setSelectedId(e.target.value)
          }
          className="rounded-full border border-[#163A5F]/20 bg-white px-4 py-2 text-sm font-medium text-[#163A5F] shadow-sm focus:outline-none focus:ring-2 focus:ring-moss/40"
        >
          {locations.map((loc) => (
            <option
              key={loc.id}
              value={loc.id}
            >
              {loc.name}, {loc.district}
            </option>
          ))}
        </select>

      </div>

      {/* =================================================
          CARDS
      ================================================= */}

      <div
        ref={cardsRef}
        className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3"
      >

        {/* =================================================
            RISK SUMMARY
        ================================================= */}

        <div className="dash-card rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm lg:col-span-1">

          <p className="text-xs uppercase tracking-wide text-ink/45">
            Overall Risk
          </p>

          <div className="mt-2">

            {riskLoading ? (
              <p className="text-sm text-ink/50">
                Loading risk...
              </p>
            ) : (
              <RiskBadge
                level={overallRisk.key}
                size="lg"
              />
            )}

          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">

            <div>
              <p className="text-xs text-ink/45">
                Flood Risk
              </p>

              <p className="font-display text-2xl text-[#163A5F]">
                {Math.round(
                  floodProbability * 100
                )}
                %
              </p>
            </div>

            <div>
              <p className="text-xs text-ink/45">
                Landslide Risk
              </p>

              <p className="font-display text-2xl text-[#163A5F]">
                {Math.round(
                  landslideProbability * 100
                )}
                %
              </p>
            </div>

          </div>

          {risk?.lead_time != null && (
            <p className="mt-5 rounded-lg bg-mist-deep px-3 py-2 text-xs text-ink/60">
              Estimated warning window:{' '}

              <span className="font-mono font-medium text-[#163A5F]">
                ~{risk.lead_time} min
              </span>

              {' '}&mdash; prototype estimate, not a validated guarantee.
            </p>
          )}

        </div>

        {/* =================================================
            ENVIRONMENTAL CONDITIONS
        ================================================= */}

        <div className="dash-card rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">

          <p className="text-xs uppercase tracking-wide text-ink/45">
            Environmental Conditions
          </p>

          <dl className="mt-4 space-y-3 font-mono text-sm">

            <div className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
              <dt className="text-ink/50">
                Rainfall (1h)
              </dt>

              <dd className="text-[#163A5F]">
                {location.rainfall_1h != null
                  ? `${location.rainfall_1h} mm/h`
                  : '--'}
              </dd>
            </div>

            <div className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
              <dt className="text-ink/50">
                Rainfall (24h)
              </dt>

              <dd className="text-[#163A5F]">
                {location.rainfall_24h != null
                  ? `${location.rainfall_24h} mm`
                  : '--'}
              </dd>
            </div>

            <div className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
              <dt className="text-ink/50">
                Soil Moisture
              </dt>

              <dd className="text-[#163A5F]">
                {location.soil_moisture != null
                  ? `${location.soil_moisture}%`
                  : '--'}
              </dd>
            </div>

            <div className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
              <dt className="text-ink/50">
                Slope
              </dt>

              <dd className="text-[#163A5F]">
                {location.slope != null
                  ? `${location.slope}°`
                  : '--'}
              </dd>
            </div>

            <div className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
              <dt className="text-ink/50">
                Elevation
              </dt>

              <dd className="text-[#163A5F]">
                {location.elevation != null
                  ? `${location.elevation} m`
                  : '--'}
              </dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-ink/50">
                Soil Type
              </dt>

              <dd className="text-[#163A5F]">
                {location.soil_type || '--'}
              </dd>
            </div>

          </dl>

          <p className="mt-4 text-[11px] text-ink/40">
            Last updated{' '}

            {risk?.timestamp
              ? new Date(
                  risk.timestamp
                ).toLocaleTimeString(
                  'en-IN'
                )
              : '--'}
          </p>

        </div>

        {/* =================================================
            SENSORS + SHELTER
        ================================================= */}

        <div className="dash-card space-y-5">

          {/* SENSORS */}

          <div className="rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <p className="text-xs uppercase tracking-wide text-ink/45">
                Sensor Monitoring
              </p>

              <Link
                to="/sensors"
                className="text-xs font-medium text-moss-deep hover:underline"
              >
                View all
              </Link>

            </div>

            <ul className="mt-4 space-y-2.5">

              {locationSensors.length === 0 && (
                <li className="text-sm text-ink/45">
                  No sensors registered near this location.
                </li>
              )}

              {locationSensors
                .slice(0, 4)
                .map((sensor) => (

                  <li
                    key={sensor.id}
                    className="flex items-center justify-between text-sm"
                  >

                    <span className="flex items-center gap-2 font-mono text-ink/70">

                      <StatusDot
                        status={
                          sensor.status
                        }
                      />

                      {sensor.id}

                    </span>

                    <span className="text-xs text-ink/45">
                      {sensor.status}
                    </span>

                  </li>

                ))}

            </ul>

          </div>

          {/* SHELTER */}

          {shelter && (
            <div className="rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">

              <p className="text-xs uppercase tracking-wide text-ink/45">
                Nearest Shelter
              </p>

              <p className="mt-2 font-display text-lg text-[#163A5F]">
                {shelter.name}
              </p>

              <p className="text-sm text-ink/55">
                Capacity {shelter.capacity}
              </p>

            </div>
          )}

        </div>

      </div>

      {/* =================================================
          ALERT
      ================================================= */}

      {alert && (
        <div
          className="dash-card mt-6 rounded-2xl border-l-4 p-6 shadow-sm"
          style={{
            borderColor:
              classifyRisk(
                alert.level === 'CRITICAL'
                  ? 90
                  : alert.level === 'HIGH'
                    ? 65
                    : alert.level === 'MODERATE'
                      ? 40
                      : 15
              ).color,

            backgroundColor:
              classifyRisk(
                alert.level === 'CRITICAL'
                  ? 90
                  : alert.level === 'HIGH'
                    ? 65
                    : alert.level === 'MODERATE'
                      ? 40
                      : 15
              ).bg,
          }}
        >

          <div className="flex items-center gap-3">

            <RiskBadge
              level={alert.level}
            />

            <p className="font-display text-lg text-[#163A5F]">
              {alert.headline}
            </p>

          </div>

          <p className="mt-2 text-sm text-ink/70">
            {alert.detail}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">

            {alert.factors.map(
              (factor) => (
                <span
                  key={factor}
                  className="rounded-full bg-white/70 px-3 py-1 font-mono text-[11px] text-ink/60"
                >
                  {factor}
                </span>
              )
            )}

          </div>

          <p className="mt-4 text-sm font-medium text-[#163A5F]">
            Recommended action:{' '}

            <span className="font-normal text-ink/70">
              {alert.recommendedAction}
            </span>
          </p>

        </div>
      )}

      {/* =================================================
          BUTTONS
      ================================================= */}

      <div className="dash-card mt-6 flex flex-wrap gap-3">

        <Link
          to={`/map?location=${location.id}`}
          className="rounded-full bg-[#163A5F] px-5 py-2.5 text-sm font-semibold text-mist transition-transform hover:scale-105"
        >
          View on risk map
        </Link>

        <Link
          to={`/location/${location.id}`}
          className="rounded-full border border-[#163A5F]/20 px-5 py-2.5 text-sm font-medium text-[#163A5F] transition-colors hover:bg-[#163A5F]/5"
        >
          Full location details
        </Link>

      </div>

    </div>
  );
}