import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import RiskBadge from '../components/RiskBadge';
import { ALERTS, LOCATIONS, classifyRisk } from '../data/mockData';

export default function Alerts() {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.alert-card', { opacity: 0, x: -16, stagger: 0.08, duration: 0.5, ease: 'power2.out' });
    }, ref);
    return () => ctx.revert();
  }, []);

  const sorted = [...ALERTS].sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

  return (
    <div ref={ref} className="mx-auto max-w-4xl px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss-deep">Alerts</p>
      <h1 className="mt-1 font-display text-3xl text-fern">Current and historical alerts</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Every alert explains which factors triggered it and what action is
        recommended &mdash; never just a bare probability (G5 in the PRD).
      </p>

      <div className="mt-8 space-y-4">
        {sorted.map((alert) => {
          const loc = LOCATIONS.find((l) => l.id === alert.locationId);
          const risk = classifyRisk(alert.level === 'CRITICAL' ? 90 : alert.level === 'HIGH' ? 65 : 40);
          return (
            <div
              key={alert.id}
              className="alert-card rounded-2xl border-l-4 bg-white p-6 shadow-sm"
              style={{ borderColor: risk.color }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <RiskBadge level={alert.level} />
                  <p className="text-xs text-ink/45">
                    {loc?.name} &middot; {new Date(alert.issuedAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <Link to={`/location/${alert.locationId}`} className="text-xs font-medium text-moss-deep hover:underline">
                  View location &rarr;
                </Link>
              </div>
              <p className="mt-3 font-display text-lg text-fern">{alert.headline}</p>
              <p className="mt-1 text-sm text-ink/65">{alert.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {alert.factors.map((f) => (
                  <span key={f} className="rounded-full bg-mist-deep px-3 py-1 font-mono text-[11px] text-ink/60">
                    {f}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm">
                <span className="font-medium text-fern">Recommended action: </span>
                <span className="text-ink/70">{alert.recommendedAction}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
