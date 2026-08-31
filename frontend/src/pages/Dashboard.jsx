import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import RiskBadge from '../components/RiskBadge';
import { LOCATIONS, SENSORS, ALERTS, classifyRisk, SHELTERS } from '../data/mockData';

function StatusDot({ status }) {
  const color =
    status === 'ONLINE' ? 'bg-moss' : status === 'WARNING' ? 'bg-risk-moderate' : 'bg-risk-critical';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export default function Dashboard() {
  const [selectedId, setSelectedId] = useState(LOCATIONS[0].id);
  const location = useMemo(() => LOCATIONS.find((l) => l.id === selectedId), [selectedId]);
  const overallRisk = classifyRisk(Math.max(location.floodProbability, location.landslideProbability) * 100);
  const alert = ALERTS.find((a) => a.locationId === location.id);
  const sensors = SENSORS.filter((s) => s.locationId === location.id);
  const shelter = SHELTERS.find((s) => s.id === location.nearestShelter);

  const cardsRef = useRef(null);
  useEffect(() => {
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
  }, [selectedId]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss-deep">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl text-[#163A5F]">
            Prithvi &mdash; Hyper-Local Disaster Early Warning
          </h1>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-full border border-[#163A5F]/20 bg-white px-4 py-2 text-sm font-medium text-[#163A5F] shadow-sm focus:outline-none focus:ring-2 focus:ring-moss/40"
        >
          {LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}, {loc.district}
            </option>
          ))}
        </select>
      </div>

      <div ref={cardsRef} className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Risk summary */}
        <div className="dash-card rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm lg:col-span-1">
          <p className="text-xs uppercase tracking-wide text-ink/45">Overall Risk</p>
          <div className="mt-2">
            <RiskBadge level={overallRisk.key} size="lg" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-ink/45">Flood Risk</p>
              <p className="font-display text-2xl text-[#163A5F]">
                {Math.round(location.floodProbability * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-ink/45">Landslide Risk</p>
              <p className="font-display text-2xl text-[#163A5F]">
                {Math.round(location.landslideProbability * 100)}%
              </p>
            </div>
          </div>
          {location.leadTimeMinutes && (
            <p className="mt-5 rounded-lg bg-mist-deep px-3 py-2 text-xs text-ink/60">
              Estimated warning window:{' '}
              <span className="font-mono font-medium text-[#163A5F]">
                ~{location.leadTimeMinutes} min
              </span>{' '}
              &mdash; prototype estimate, not a validated guarantee.
            </p>
          )}
        </div>

        {/* Environmental conditions */}
        <div className="dash-card rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-ink/45">Environmental Conditions</p>
          <dl className="mt-4 space-y-3 font-mono text-sm">
            {[
              ['Rainfall (1h)', `${location.rainfall1h} mm/h`],
              ['Rainfall (24h)', `${location.rainfall24h} mm`],
              ['Soil Moisture', `${location.soilMoisture}%`],
              ['Slope', `${location.slope}°`],
              ['Elevation', `${location.elevation} m`],
              ['Soil Type', location.soilType],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-[#163A5F]/5 pb-2">
                <dt className="text-ink/50">{k}</dt>
                <dd className="text-[#163A5F]">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11px] text-ink/40">
            Last updated {new Date(location.lastUpdated).toLocaleTimeString('en-IN')}
          </p>
        </div>

        {/* Sensors + shelter */}
        <div className="dash-card space-y-5">
          <div className="rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-ink/45">Sensor Monitoring</p>
              <Link to="/sensors" className="text-xs font-medium text-moss-deep hover:underline">
                View all
              </Link>
            </div>
            <ul className="mt-4 space-y-2.5">
              {sensors.length === 0 && (
                <li className="text-sm text-ink/45">No sensors registered at this location.</li>
              )}
              {sensors.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-mono text-ink/70">
                    <StatusDot status={s.status} /> {s.id}
                  </span>
                  <span className="text-xs text-ink/45">{s.status}</span>
                </li>
              ))}
            </ul>
          </div>

          {shelter && (
            <div className="rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-ink/45">Nearest Shelter</p>
              <p className="mt-2 font-display text-lg text-[#163A5F]">{shelter.name}</p>
              <p className="text-sm text-ink/55">
                {shelter.distanceKm} km &middot; capacity {shelter.capacity}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div
          className="dash-card mt-6 rounded-2xl border-l-4 p-6 shadow-sm"
          style={{
            borderColor: classifyRisk(
              alert.level === 'CRITICAL' ? 90 : alert.level === 'HIGH' ? 65 : 40
            ).color,
            backgroundColor: classifyRisk(
              alert.level === 'CRITICAL' ? 90 : alert.level === 'HIGH' ? 65 : 40
            ).bg,
          }}
        >
          <div className="flex items-center gap-3">
            <RiskBadge level={alert.level} />
            <p className="font-display text-lg text-[#163A5F]">{alert.headline}</p>
          </div>
          <p className="mt-2 text-sm text-ink/70">{alert.detail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {alert.factors.map((f) => (
              <span key={f} className="rounded-full bg-white/70 px-3 py-1 font-mono text-[11px] text-ink/60">
                {f}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium text-[#163A5F]">
            Recommended action: <span className="font-normal text-ink/70">{alert.recommendedAction}</span>
          </p>
        </div>
      )}

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
