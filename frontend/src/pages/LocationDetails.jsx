import { useParams, Link, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import RiskBadge from '../components/RiskBadge';
import { LOCATIONS, SENSORS, SHELTERS, ALERTS, classifyRisk } from '../data/mockData';

export default function LocationDetails() {
  const { id } = useParams();
  const location = LOCATIONS.find((l) => l.id === id);
  const ref = useRef(null);

  useEffect(() => {
    if (!location) return;
    const ctx = gsap.context(() => {
      gsap.from('.detail-block', { opacity: 0, y: 18, stagger: 0.08, duration: 0.5, ease: 'power2.out' });
    }, ref);
    return () => ctx.revert();
  }, [location]);

  if (!location) return <Navigate to="/dashboard" replace />;

  const risk = classifyRisk(Math.max(location.floodProbability, location.landslideProbability) * 100);
  const sensors = SENSORS.filter((s) => s.locationId === location.id);
  const shelter = SHELTERS.find((s) => s.id === location.nearestShelter);
  const alert = ALERTS.find((a) => a.locationId === location.id);

  return (
    <div ref={ref} className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/map" className="text-xs font-medium text-moss-deep hover:underline">
        &larr; Back to risk map
      </Link>

      <div className="detail-block mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-fern">{location.name}</h1>
          <p className="mt-1 text-sm text-ink/50">
            {location.district}, {location.state} &middot; Population {location.population.toLocaleString('en-IN')}
          </p>
        </div>
        <RiskBadge level={risk.key} size="lg" />
      </div>

      <div className="detail-block mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Flood Probability', `${Math.round(location.floodProbability * 100)}%`],
          ['Landslide Probability', `${Math.round(location.landslideProbability * 100)}%`],
          ['Lead Time', location.leadTimeMinutes ? `~${location.leadTimeMinutes} min` : '—'],
          ['Elevation', `${location.elevation} m`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-fern/10 bg-white p-4 shadow-sm">
            <p className="text-xs text-ink/45">{k}</p>
            <p className="mt-1 font-display text-xl text-fern">{v}</p>
          </div>
        ))}
      </div>

      <div className="detail-block mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-fern/10 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-ink/45">Environmental Conditions</p>
          <dl className="mt-4 space-y-2.5 font-mono text-sm">
            {[
              ['Rainfall (1h)', `${location.rainfall1h} mm/h`],
              ['Rainfall (24h)', `${location.rainfall24h} mm`],
              ['Soil Moisture', `${location.soilMoisture}%`],
              ['Soil Type', location.soilType],
              ['Slope', `${location.slope}°`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-fern/5 pb-2">
                <dt className="text-ink/50">{k}</dt>
                <dd className="text-fern">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-fern/10 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-ink/45">Sensors at this location</p>
          <ul className="mt-4 space-y-3">
            {sensors.length === 0 && <li className="text-sm text-ink/45">No sensors registered.</li>}
            {sensors.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span className="font-mono text-ink/70">{s.id} &middot; {s.type}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    s.status === 'ONLINE'
                      ? 'bg-moss/15 text-moss-deep'
                      : s.status === 'WARNING'
                        ? 'bg-risk-moderate/15 text-risk-moderate'
                        : 'bg-risk-critical/15 text-risk-critical'
                  }`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {alert && (
        <div className="detail-block mt-6 rounded-2xl border border-fern/10 bg-mist-deep p-6">
          <div className="flex items-center gap-3">
            <RiskBadge level={alert.level} />
            <p className="font-display text-lg text-fern">{alert.headline}</p>
          </div>
          <p className="mt-2 text-sm text-ink/70">
            Recommended action: <span className="font-medium text-fern">{alert.recommendedAction}</span>
          </p>
        </div>
      )}

      {shelter && (
        <div className="detail-block mt-6 flex items-center justify-between rounded-2xl border border-fern/10 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/45">Nearest Shelter</p>
            <p className="mt-1 font-display text-xl text-fern">{shelter.name}</p>
            <p className="text-sm text-ink/55">{shelter.distanceKm} km away &middot; capacity {shelter.capacity}</p>
          </div>
          <Link
            to={`/map?location=${location.id}`}
            className="rounded-full bg-fern px-5 py-2.5 text-sm font-semibold text-mist transition-transform hover:scale-105"
          >
            View route on map
          </Link>
        </div>
      )}
    </div>
  );
}
