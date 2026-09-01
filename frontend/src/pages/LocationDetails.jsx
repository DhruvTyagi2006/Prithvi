import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import gsap from 'gsap';

import RiskBadge from '../components/RiskBadge';

import {
  getLocations,
  getSensors,
  getShelters,
  getRisk,
} from '../services/api';

export default function LocationDetails() {
  const { id } = useParams();

  const ref = useRef(null);

  const [locations, setLocations] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [risk, setRisk] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =====================================================
  // LOAD LOCATION DATA
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          locationData,
          sensorData,
          shelterData,
          riskData,
        ] = await Promise.all([
          getLocations(),
          getSensors(),
          getShelters(),
          getRisk(id),
        ]);

        console.log(
          'Location details - locations:',
          locationData
        );

        console.log(
          'Location details - sensors:',
          sensorData
        );

        console.log(
          'Location details - shelters:',
          shelterData
        );

        console.log(
          'Location details - risk:',
          riskData
        );

        const processedLocations = Array.isArray(
          locationData
        )
          ? locationData
          : locationData?.locations || [];

        const processedSensors = Array.isArray(
          sensorData
        )
          ? sensorData
          : sensorData?.sensors || [];

        const processedShelters = Array.isArray(
          shelterData
        )
          ? shelterData
          : shelterData?.shelters || [];

        setLocations(processedLocations);
        setSensors(processedSensors);
        setShelters(processedShelters);
        setRisk(riskData);
      } catch (err) {
        console.error(
          'Failed to load location details:',
          err
        );

        setError(
          err?.message ||
            'Failed to load location details'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  // =====================================================
  // CURRENT LOCATION
  // =====================================================

  const location = useMemo(() => {
    return locations.find(
      (item) =>
        String(item.id) === String(id)
    );
  }, [locations, id]);

  // =====================================================
  // LOCATION SENSORS
  // =====================================================

  const locationSensors = useMemo(() => {
    if (!location) {
      return [];
    }

    const threshold = 0.15;

    return sensors.filter((sensor) => {
      if (
        sensor.latitude == null ||
        sensor.longitude == null
      ) {
        return false;
      }

      const latitudeDifference = Math.abs(
        Number(sensor.latitude) -
          Number(location.latitude)
      );

      const longitudeDifference = Math.abs(
        Number(sensor.longitude) -
          Number(location.longitude)
      );

      return (
        latitudeDifference <= threshold &&
        longitudeDifference <= threshold
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
      (item) =>
        String(item.id) ===
        String(location.nearest_shelter_id)
    );
  }, [location, shelters]);

  // =====================================================
  // GSAP
  // =====================================================

  useEffect(() => {
    if (loading || !location) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from('.detail-block', {
        opacity: 0,
        y: 18,
        stagger: 0.08,
        duration: 0.5,
        ease: 'power2.out',
      });
    }, ref);

    return () => ctx.revert();
  }, [loading, location]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#163A5F]">
          Loading location details...
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
            Failed to load location
          </p>

          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // LOCATION NOT FOUND
  // =====================================================

  if (!location) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  // =====================================================
  // RISK VALUES
  // =====================================================

  const floodProbability = Number(
    risk?.flood_probability ?? 0
  );

  const landslideProbability = Number(
    risk?.landslide_probability ?? 0
  );

  const overallRisk =
    risk?.overall_risk || 'LOW';

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      ref={ref}
      className="mx-auto max-w-5xl px-6 py-10"
    >

      {/* =================================================
          BACK
      ================================================= */}

      <Link
        to="/map"
        className="text-xs font-medium text-moss-deep hover:underline"
      >
        &larr; Back to risk map
      </Link>

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="detail-block mt-4 flex flex-wrap items-center justify-between gap-4">

        <div>
          <h1 className="font-display text-4xl text-[#163A5F]">
            {location.name}
          </h1>

          <p className="mt-1 text-sm text-ink/50">
            {location.district},{' '}
            {location.state}
            {' · '}
            Population{' '}
            {Number(
              location.population || 0
            ).toLocaleString('en-IN')}
          </p>
        </div>

        <RiskBadge
          level={overallRisk}
          size="lg"
        />

      </div>

      {/* =================================================
          RISK SUMMARY
      ================================================= */}

      <div className="detail-block mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">

        <div className="rounded-xl border border-[#163A5F]/10 bg-white p-4 shadow-sm">
          <p className="text-xs text-ink/45">
            Flood Probability
          </p>

          <p className="mt-1 font-display text-xl text-[#163A5F]">
            {Math.round(
              floodProbability * 100
            )}
            %
          </p>
        </div>

        <div className="rounded-xl border border-[#163A5F]/10 bg-white p-4 shadow-sm">
          <p className="text-xs text-ink/45">
            Landslide Probability
          </p>

          <p className="mt-1 font-display text-xl text-[#163A5F]">
            {Math.round(
              landslideProbability * 100
            )}
            %
          </p>
        </div>

        <div className="rounded-xl border border-[#163A5F]/10 bg-white p-4 shadow-sm">
          <p className="text-xs text-ink/45">
            Warning Window
          </p>

          <p className="mt-1 font-display text-xl text-[#163A5F]">
            {risk?.lead_time != null
              ? `~${risk.lead_time} min`
              : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-[#163A5F]/10 bg-white p-4 shadow-sm">
          <p className="text-xs text-ink/45">
            Elevation
          </p>

          <p className="mt-1 font-display text-xl text-[#163A5F]">
            {location.elevation != null
              ? `${location.elevation} m`
              : '—'}
          </p>
        </div>

      </div>

      {/* =================================================
          ENVIRONMENT + SENSORS
      ================================================= */}

      <div className="detail-block mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* ENVIRONMENT */}

        <div className="rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">

          <p className="text-xs uppercase tracking-wide text-ink/45">
            Environmental Conditions
          </p>

          <dl className="mt-4 space-y-2.5 font-mono text-sm">

            <div className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
              <dt className="text-ink/50">
                Latitude
              </dt>

              <dd className="text-[#163A5F]">
                {location.latitude}
              </dd>
            </div>

            <div className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
              <dt className="text-ink/50">
                Longitude
              </dt>

              <dd className="text-[#163A5F]">
                {location.longitude}
              </dd>
            </div>

            <div className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
              <dt className="text-ink/50">
                Elevation
              </dt>

              <dd className="text-[#163A5F]">
                {location.elevation != null
                  ? `${location.elevation} m`
                  : '—'}
              </dd>
            </div>

            <div className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
              <dt className="text-ink/50">
                Slope
              </dt>

              <dd className="text-[#163A5F]">
                {location.slope != null
                  ? `${location.slope}°`
                  : '—'}
              </dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-ink/50">
                Soil Type
              </dt>

              <dd className="text-[#163A5F]">
                {location.soil_type || '—'}
              </dd>
            </div>

          </dl>

        </div>

        {/* SENSORS */}

        <div className="rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">

          <p className="text-xs uppercase tracking-wide text-ink/45">
            Sensors at this location
          </p>

          <ul className="mt-4 space-y-3">

            {locationSensors.length === 0 && (
              <li className="text-sm text-ink/45">
                No sensors registered near this location.
              </li>
            )}

            {locationSensors.map((sensor) => (
              <li
                key={sensor.id}
                className="flex items-center justify-between text-sm"
              >

                <span className="font-mono text-ink/70">
                  {sensor.id}
                  {' · '}
                  {sensor.sensor_type || 'Environmental'}
                </span>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    sensor.status === 'ONLINE'
                      ? 'bg-moss/15 text-moss-deep'
                      : sensor.status === 'WARNING'
                        ? 'bg-risk-moderate/15 text-risk-moderate'
                        : 'bg-risk-critical/15 text-risk-critical'
                  }`}
                >
                  {sensor.status || 'OFFLINE'}
                </span>

              </li>
            ))}

          </ul>

        </div>

      </div>

      {/* =================================================
          RISK INFORMATION
      ================================================= */}

      <div className="detail-block mt-6 rounded-2xl border border-[#163A5F]/10 bg-mist-deep p-6">

        <div className="flex items-center gap-3">

          <RiskBadge
            level={overallRisk}
          />

          <p className="font-display text-lg text-[#163A5F]">
            Current Risk Assessment
          </p>

        </div>

        <p className="mt-3 text-sm text-ink/70">
          Flood probability is{' '}
          <strong>
            {Math.round(
              floodProbability * 100
            )}
            %
          </strong>{' '}
          and landslide probability is{' '}
          <strong>
            {Math.round(
              landslideProbability * 100
            )}
            %
          </strong>.
        </p>

        {risk?.lead_time != null && (
          <p className="mt-2 text-sm text-ink/70">
            Estimated warning window:{' '}
            <strong>
              ~{risk.lead_time} minutes
            </strong>
            .
          </p>
        )}

        {risk?.timestamp && (
          <p className="mt-3 text-[11px] text-ink/40">
            Prediction updated{' '}
            {new Date(
              risk.timestamp
            ).toLocaleString('en-IN')}
          </p>
        )}

      </div>

      {/* =================================================
          SHELTER
      ================================================= */}

      {shelter && (
        <div className="detail-block mt-6 flex flex-col gap-4 rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs uppercase tracking-wide text-ink/45">
              Nearest Shelter
            </p>

            <p className="mt-1 font-display text-xl text-[#163A5F]">
              {shelter.name}
            </p>

            <p className="text-sm text-ink/55">
              Capacity{' '}
              {shelter.capacity}
            </p>

            <p className="mt-1 text-xs text-ink/45">
              {shelter.latitude},{' '}
              {shelter.longitude}
            </p>

          </div>

          <Link
            to={`/map?location=${location.id}`}
            className="rounded-full bg-[#163A5F] px-5 py-2.5 text-center text-sm font-semibold text-mist transition-transform hover:scale-105"
          >
            View on risk map
          </Link>

        </div>
      )}

    </div>
  );
}