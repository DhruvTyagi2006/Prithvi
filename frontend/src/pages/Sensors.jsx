import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SENSORS, LOCATIONS } from '../data/mockData';

const STATUS_STYLES = {
  ONLINE: { dot: 'bg-moss', text: 'text-moss-deep', bg: 'bg-moss/10' },
  WARNING: { dot: 'bg-risk-moderate', text: 'text-risk-moderate', bg: 'bg-risk-moderate/10' },
  OFFLINE: { dot: 'bg-risk-critical', text: 'text-risk-critical', bg: 'bg-risk-critical/10' },
};

export default function Sensors() {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.sensor-card', { opacity: 0, y: 16, stagger: 0.05, duration: 0.45, ease: 'power2.out' });
    }, ref);
    return () => ctx.revert();
  }, []);

  const counts = SENSORS.reduce(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }),
    {}
  );

  return (
    <div ref={ref} className="mx-auto max-w-7xl px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss-deep">Sensors</p>
      <h1 className="mt-1 font-display text-3xl text-[#163A5F]">Real-time sensor monitoring</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Simulated IoT sensor stream: rainfall, soil moisture, and slope movement
        readings feeding the prediction pipeline (G4 in the PRD).
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {Object.entries(STATUS_STYLES).map(([status, style]) => (
          <div key={status} className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium ${style.bg} ${style.text}`}>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            {status} &middot; {counts[status] || 0}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SENSORS.map((s) => {
          const loc = LOCATIONS.find((l) => l.id === s.locationId);
          const style = STATUS_STYLES[s.status];
          return (
            <div key={s.id} className="sensor-card rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm font-medium text-[#163A5F]">{s.id}</p>
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {s.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink/45 capitalize">{s.type.replace('-', ' ')}</p>
              <p className="text-xs text-ink/45">{loc?.name}</p>

              <dl className="mt-4 space-y-2 font-mono text-sm">
                <div className="flex justify-between border-b border-[#163A5F]/5 pb-1.5">
                  <dt className="text-ink/50">Rainfall</dt>
                  <dd className="text-[#163A5F]">{s.rainfall != null ? `${s.rainfall} mm/h` : '—'}</dd>
                </div>
                <div className="flex justify-between border-b border-[#163A5F]/5 pb-1.5">
                  <dt className="text-ink/50">Soil Moisture</dt>
                  <dd className="text-[#163A5F]">{s.soilMoisture != null ? `${s.soilMoisture}%` : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink/50">Slope Movement</dt>
                  <dd className="text-[#163A5F]">{s.slopeMovement != null ? `${s.slopeMovement} mm` : '—'}</dd>
                </div>
              </dl>
              <p className="mt-4 text-[11px] text-ink/40">
                Last updated {new Date(s.lastUpdated).toLocaleTimeString('en-IN')}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
