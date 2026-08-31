import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import gsap from 'gsap';
import 'leaflet/dist/leaflet.css';
import RiskBadge from '../components/RiskBadge';
import { LOCATIONS, SHELTERS, classifyRisk } from '../data/mockData';

function FlyToLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 11, { duration: 0.9 });
    }
  }, [location, map]);
  return null;
}

export default function RiskMap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselected = searchParams.get('location');
  const [selectedId, setSelectedId] = useState(preselected || LOCATIONS[0].id);
  const panelRef = useRef(null);

  const selected = useMemo(() => LOCATIONS.find((l) => l.id === selectedId), [selectedId]);
  const shelter = selected && SHELTERS.find((s) => s.id === selected.nearestShelter);

  useEffect(() => {
    if (preselected) setSelectedId(preselected);
  }, [preselected]);

  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, x: 24 },
        { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [selectedId]);

  const center = [30.35, 78.9];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss-deep">Risk Map</p>
      <h1 className="mt-1 font-display text-3xl text-[#163A5F]">Hyper-local risk visualization</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Villages are colored by current overall risk. Select a marker to see its full
        prediction, environmental readings, and nearest shelter.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="h-[560px] overflow-hidden rounded-2xl border border-[#163A5F]/10 shadow-sm">
          <MapContainer center={center} zoom={9} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyToLocation location={selected} />
            {LOCATIONS.map((loc) => {
              const risk = classifyRisk(Math.max(loc.floodProbability, loc.landslideProbability) * 100);
              const isSelected = loc.id === selectedId;
              return (
                <CircleMarker
                  key={loc.id}
                  center={[loc.lat, loc.lng]}
                  radius={isSelected ? 14 : 10}
                  pathOptions={{
                    color: risk.color,
                    fillColor: risk.color,
                    fillOpacity: isSelected ? 0.85 : 0.55,
                    weight: isSelected ? 3 : 1.5,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedId(loc.id);
                      setSearchParams({ location: loc.id });
                    },
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]}>
                    {loc.name} &middot; {risk.label}
                  </Tooltip>
                </CircleMarker>
              );
            })}
            {SHELTERS.map((s) => (
              <CircleMarker
                key={s.id}
                center={[s.lat, s.lng]}
                radius={5}
                pathOptions={{ color: '#0F2027', fillColor: '#AFD8E0', fillOpacity: 0.9, weight: 1.5 }}
              >
                <Tooltip direction="top" offset={[0, -6]}>Shelter: {s.name}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Detail panel */}
        {selected && (
          <div ref={panelRef} className="h-fit rounded-2xl border border-[#163A5F]/10 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl text-[#163A5F]">{selected.name}</h2>
                <p className="text-xs text-ink/45">
                  {selected.district}, {selected.state}
                </p>
              </div>
              <RiskBadge
                level={classifyRisk(Math.max(selected.floodProbability, selected.landslideProbability) * 100).key}
              />
            </div>

            <dl className="mt-5 space-y-2.5 font-mono text-sm">
              {[
                ['Flood Probability', `${Math.round(selected.floodProbability * 100)}%`],
                ['Landslide Probability', `${Math.round(selected.landslideProbability * 100)}%`],
                ['Rainfall (1h)', `${selected.rainfall1h} mm/h`],
                ['Soil Moisture', `${selected.soilMoisture}%`],
                ['Slope', `${selected.slope}°`],
                ['Last Updated', new Date(selected.lastUpdated).toLocaleTimeString('en-IN')],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-[#163A5F]/10 pb-2">
                  <dt className="text-ink/50">{k}</dt>
                  <dd className="text-[#163A5F]">{v}</dd>
                </div>
              ))}
            </dl>

            {shelter && (
              <div className="mt-4 rounded-lg bg-mist-deep px-3 py-2.5 text-sm">
                <p className="text-xs text-ink/45">Nearest Shelter</p>
                <p className="font-medium text-[#163A5F]">{shelter.name} &middot; {shelter.distanceKm} km</p>
              </div>
            )}

            <Link
              to={`/location/${selected.id}`}
              className="mt-5 block rounded-full bg-[#163A5F] px-4 py-2.5 text-center text-sm font-semibold text-mist transition-transform hover:scale-105"
            >
              Full location details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
