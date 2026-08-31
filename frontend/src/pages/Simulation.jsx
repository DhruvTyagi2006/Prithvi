import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import RiskBadge from '../components/RiskBadge';
import { SHELTERS } from '../data/mockData';
import { runSimulation } from '../utils/risk';

const PRESETS = {
  normal: { rainfall: 5, soilMoisture: 40, slopeMovement: 1, label: 'Normal' },
  heavy: { rainfall: 35, soilMoisture: 70, slopeMovement: 5, label: 'Heavy rainfall' },
  critical: { rainfall: 60, soilMoisture: 90, slopeMovement: 15, label: 'Critical' },
};

function Slider({ label, unit, value, min, max, onChange, accent }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#163A5F]">{label}</label>
        <span className="font-mono text-sm text-ink/60">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-moss-deep"
        style={{ accentColor: accent }}
      />
    </div>
  );
}

export default function Simulation() {
  const [rainfall, setRainfall] = useState(5);
  const [soilMoisture, setSoilMoisture] = useState(40);
  const [slopeMovement, setSlopeMovement] = useState(1);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const resultRef = useRef(null);
  const floodValRef = useRef({ v: 0 });
  const landslideValRef = useRef({ v: 0 });
  const [displayFlood, setDisplayFlood] = useState(0);
  const [displayLandslide, setDisplayLandslide] = useState(0);

  const applyPreset = (key) => {
    const p = PRESETS[key];
    gsap.timeline()
      .to({}, { duration: 0 })
      .to({ r: rainfall }, {
        r: p.rainfall,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: function () { setRainfall(Math.round(this.targets()[0].r)); },
      }, 0)
      .to({ s: soilMoisture }, {
        s: p.soilMoisture,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: function () { setSoilMoisture(Math.round(this.targets()[0].s)); },
      }, 0)
      .to({ m: slopeMovement }, {
        m: p.slopeMovement,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: function () { setSlopeMovement(Math.round(this.targets()[0].m * 10) / 10); },
      }, 0);
  };

  const handleRun = () => {
    setRunning(true);
    const sim = runSimulation({ rainfall, soilMoisture, slopeMovement });

    gsap.to(floodValRef.current, {
      v: sim.floodProbability * 100,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => setDisplayFlood(Math.round(floodValRef.current.v)),
    });
    gsap.to(landslideValRef.current, {
      v: sim.landslideProbability * 100,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => setDisplayLandslide(Math.round(landslideValRef.current.v)),
      onComplete: () => setRunning(false),
    });

    setResult(sim);
  };

  useEffect(() => {
    if (result && resultRef.current) {
      gsap.fromTo(
        resultRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [result]);

  const nearestShelter = SHELTERS[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss-deep">Simulation</p>
      <h1 className="mt-1 font-display text-3xl text-[#163A5F]">
        Simulate a disaster scenario
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Move the sliders to change rainfall, soil moisture, and slope movement,
        then run the simulation to see how predicted risk responds (US-08 in the PRD).
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className="rounded-full border border-[#163A5F]/20 px-4 py-1.5 text-xs font-medium text-[#163A5F] transition-colors hover:bg-[#163A5F]/5"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 rounded-2xl border border-[#163A5F]/10 bg-white p-7 shadow-sm md:grid-cols-2">
        <div className="space-y-7">
          <Slider label="Rainfall" unit="mm/h" value={rainfall} min={0} max={80} onChange={setRainfall} accent="#6fb3c2" />
          <Slider label="Soil Moisture" unit="%" value={soilMoisture} min={0} max={100} onChange={setSoilMoisture} accent="#7fa37a" />
          <Slider label="Slope Movement" unit="mm" value={slopeMovement} min={0} max={20} onChange={setSlopeMovement} accent="#b94a43" />

          <button
            onClick={handleRun}
            disabled={running}
            className="w-full rounded-full bg-[#163A5F] px-6 py-3 text-sm font-semibold text-mist transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {running ? 'Running simulation…' : 'Run simulation'}
          </button>
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-xl bg-mist-deep p-6">
          <div>
            <p className="text-xs text-ink/45">Flood Risk</p>
            <p className="font-display text-3xl text-[#163A5F]">{displayFlood}%</p>
          </div>
          <div>
            <p className="text-xs text-ink/45">Landslide Risk</p>
            <p className="font-display text-3xl text-[#163A5F]">{displayLandslide}%</p>
          </div>
          {result && <RiskBadge level={result.overallRisk.key} size="lg" />}
        </div>
      </div>

      {result && (
        <div ref={resultRef} className="mt-6 rounded-2xl border border-[#163A5F]/10 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl text-[#163A5F]">Prediction result</h2>
            <p className="font-mono text-xs text-ink/45">
              Estimated warning window: ~{result.leadTimeMinutes} min
            </p>
          </div>
          <p className="mt-3 text-sm text-ink/70">
            <span className="font-medium text-[#163A5F]">Recommended action: </span>
            {result.recommendedAction}
          </p>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-mist-deep px-4 py-3 text-sm">
            <span className="text-ink/60">Nearest shelter</span>
            <span className="font-medium text-[#163A5F]">
              {nearestShelter.name} &middot; {nearestShelter.distanceKm} km
            </span>
          </div>
          <p className="mt-4 text-[11px] text-ink/40">
            This lead-time and risk estimate is a prototype indicator for demonstration
            purposes and is not an officially validated evacuation prediction.
          </p>
        </div>
      )}
    </div>
  );
}
