import { useEffect, useMemo, useRef, useState } from 'react';

import gsap from 'gsap';

import { getSensors, getLocations } from '../services/api';

const STATUS_STYLES = {
  ONLINE: {
    dot: 'bg-moss',
    text: 'text-moss-deep',
    bg: 'bg-moss/10',
  },

  WARNING: {
    dot: 'bg-risk-moderate',
    text: 'text-risk-moderate',
    bg: 'bg-risk-moderate/10',
  },

  OFFLINE: {
    dot: 'bg-risk-critical',
    text: 'text-risk-critical',
    bg: 'bg-risk-critical/10',
  },
};

export default function Sensors() {
  const ref = useRef(null);

  const [sensors, setSensors] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =====================================================
  // LOAD SENSORS + LOCATIONS FROM BACKEND
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [sensorData, locationData] = await Promise.all([
          getSensors(),
          getLocations(),
        ]);

        console.log('Sensors received from backend:', sensorData);
        console.log('Locations received from backend:', locationData);

        // Backend returns:
        // {
        //   sensors: [...],
        //   total: 45
        // }

        const processedSensors = Array.isArray(sensorData)
          ? sensorData
          : sensorData?.sensors || [];

        setSensors(processedSensors);

        setLocations(
          Array.isArray(locationData) ? locationData : []
        );
      } catch (err) {
        console.error('Failed to load sensor data:', err);

        setError(
          err?.message || 'Failed to load sensor data'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // =====================================================
  // SENSOR COUNTS
  // =====================================================

  const counts = useMemo(() => {
    return sensors.reduce((acc, sensor) => {
      const status = sensor.status || 'OFFLINE';

      acc[status] = (acc[status] || 0) + 1;

      return acc;
    }, {});
  }, [sensors]);

  // =====================================================
  // GSAP ANIMATION
  // =====================================================

  useEffect(() => {
    if (loading || sensors.length === 0) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from('.sensor-card', {
        opacity: 0,
        y: 16,
        stagger: 0.05,
        duration: 0.45,
        ease: 'power2.out',
      });
    }, ref);

    return () => ctx.revert();
  }, [loading, sensors]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#163A5F]">
          Loading sensors...
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
            Failed to load sensors
          </p>

          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // NO SENSOR DATA
  // =====================================================

  if (sensors.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#163A5F]">
          No sensor data available.
        </p>
      </div>
    );
  }

  // =====================================================
  // SENSOR PAGE
  // =====================================================

  return (
    <div
      ref={ref}
      className="mx-auto max-w-7xl px-6 py-10"
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss-deep">
        Sensors
      </p>

      <h1 className="mt-1 font-display text-3xl text-[#163A5F]">
        Real-time sensor monitoring
      </h1>

      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Environmental sensor network providing location,
        sensor status, and monitoring information for the
        Prithvi disaster early warning system.
      </p>

      {/* =====================================================
          STATUS SUMMARY
      ===================================================== */}

      <div className="mt-6 flex flex-wrap gap-3">
        {Object.entries(STATUS_STYLES).map(
          ([status, style]) => (
            <div
              key={status}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium ${style.bg} ${style.text}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${style.dot}`}
              />

              {status} &middot; {counts[status] || 0}
            </div>
          )
        )}
      </div>

      {/* =====================================================
          TOTAL SENSOR COUNT
      ===================================================== */}

      <div className="mt-6 rounded-2xl border border-[#163A5F]/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/45">
              Total Sensors
            </p>

            <p className="mt-1 font-display text-3xl text-[#163A5F]">
              {sensors.length}
            </p>
          </div>

          <div className="rounded-full bg-mist px-4 py-2 text-xs text-ink/50">
            Backend connected
          </div>
        </div>
      </div>

      {/* =====================================================
          SENSOR CARDS
      ===================================================== */}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sensors.map((sensor) => {
          /*
           * Backend format:
           *
           * {
           *   location_id: "NAG_02",
           *   latitude: 26.845472,
           *   longitude: 95.077639,
           *   sensor_type: "environmental",
           *   status: "OFFLINE",
           *   id: "NAG_02",
           *   last_updated: "2019-08-18T11:00:00Z"
           * }
           */

          const location = locations.find(
            (loc) =>
              String(loc.id) ===
              String(sensor.location_id)
          );

          const status =
            sensor.status || 'OFFLINE';

          const style =
            STATUS_STYLES[status] ||
            STATUS_STYLES.OFFLINE;

          return (
            <div
              key={sensor.id}
              className="sensor-card rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm"
            >
              {/* SENSOR HEADER */}

              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-sm font-medium text-[#163A5F]">
                  {sensor.id}
                </p>

                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                  />

                  {status}
                </span>
              </div>

              {/* SENSOR TYPE */}

              <p className="mt-2 text-xs capitalize text-ink/45">
                {sensor.sensor_type
                  ? sensor.sensor_type.replace(
                      /-/g,
                      ' '
                    )
                  : 'Environmental sensor'}
              </p>

              {/* LOCATION */}

              <p className="mt-1 text-xs text-ink/45">
                {location?.name ||
                  sensor.location_id ||
                  'Unknown location'}
              </p>

              {/* SENSOR DETAILS */}

              <dl className="mt-4 space-y-2 font-mono text-sm">
                <div className="flex justify-between border-b border-[#163A5F]/5 pb-1.5">
                  <dt className="text-ink/50">
                    Location ID
                  </dt>

                  <dd className="text-[#163A5F]">
                    {sensor.location_id || '—'}
                  </dd>
                </div>

                <div className="flex justify-between border-b border-[#163A5F]/5 pb-1.5">
                  <dt className="text-ink/50">
                    Latitude
                  </dt>

                  <dd className="text-[#163A5F]">
                    {sensor.latitude != null
                      ? sensor.latitude
                      : '—'}
                  </dd>
                </div>

                <div className="flex justify-between border-b border-[#163A5F]/5 pb-1.5">
                  <dt className="text-ink/50">
                    Longitude
                  </dt>

                  <dd className="text-[#163A5F]">
                    {sensor.longitude != null
                      ? sensor.longitude
                      : '—'}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-ink/50">
                    Sensor Type
                  </dt>

                  <dd className="text-[#163A5F]">
                    {sensor.sensor_type || '—'}
                  </dd>
                </div>
              </dl>

              {/* LAST UPDATED */}

              <p className="mt-4 text-[11px] text-ink/40">
                Last updated{' '}
                {sensor.last_updated
                  ? new Date(
                      sensor.last_updated
                    ).toLocaleString('en-IN')
                  : '—'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}