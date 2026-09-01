import { useEffect, useRef, useState } from 'react';

import gsap from 'gsap';

import RiskBadge from '../components/RiskBadge';

import {
  getLocations,
  getShelters,
  startSimulation,
  simulationStep,
} from '../services/api';

const PRESETS = {
  normal: {
    rainfall: 5,
    soilMoisture: 40,
    slopeMovement: 1,
    label: 'Normal',
  },

  heavy: {
    rainfall: 35,
    soilMoisture: 70,
    slopeMovement: 5,
    label: 'Heavy rainfall',
  },

  critical: {
    rainfall: 60,
    soilMoisture: 90,
    slopeMovement: 15,
    label: 'Critical',
  },
};

function Slider({
  label,
  unit,
  value,
  min,
  max,
  onChange,
  accent,
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#163A5F]">
          {label}
        </label>

        <span className="font-mono text-sm text-ink/60">
          {value} {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Number(e.target.value))
        }
        className="mt-2 w-full accent-moss-deep"
        style={{ accentColor: accent }}
      />
    </div>
  );
}

export default function Simulation() {
  // =====================================================
  // STATE
  // =====================================================

  const [locations, setLocations] = useState([]);
  const [shelters, setShelters] = useState([]);

  const [selectedLocationId, setSelectedLocationId] =
    useState('');

  const [rainfall, setRainfall] = useState(5);
  const [soilMoisture, setSoilMoisture] =
    useState(40);
  const [slopeMovement, setSlopeMovement] =
    useState(1);

  const [result, setResult] = useState(null);

  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const resultRef = useRef(null);

  const floodValRef = useRef({ v: 0 });
  const landslideValRef = useRef({ v: 0 });

  const [displayFlood, setDisplayFlood] =
    useState(0);

  const [displayLandslide, setDisplayLandslide] =
    useState(0);

  // =====================================================
  // LOAD LOCATIONS + SHELTERS
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          locationData,
          shelterData,
        ] = await Promise.all([
          getLocations(),
          getShelters(),
        ]);

        const processedLocations =
          Array.isArray(locationData)
            ? locationData
            : locationData?.locations || [];

        const processedShelters =
          Array.isArray(shelterData)
            ? shelterData
            : shelterData?.shelters || [];

        setLocations(processedLocations);
        setShelters(processedShelters);

        if (processedLocations.length > 0) {
          setSelectedLocationId(
            processedLocations[0].id
          );
        }
      } catch (err) {
        console.error(
          'Failed to load simulation data:',
          err
        );

        setError(
          err?.message ||
            'Failed to load simulation data'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // =====================================================
  // CURRENT LOCATION
  // =====================================================

  const selectedLocation = locations.find(
    (location) =>
      String(location.id) ===
      String(selectedLocationId)
  );

  // =====================================================
  // NEAREST SHELTER
  // =====================================================

  const nearestShelter = selectedLocation
    ? shelters.find(
        (shelter) =>
          String(shelter.id) ===
          String(
            selectedLocation.nearest_shelter_id
          )
      )
    : null;

  // =====================================================
  // PRESET
  // =====================================================

  const applyPreset = (key) => {
    const preset = PRESETS[key];

    gsap
      .timeline()
      .to(
        { value: rainfall },
        {
          value: preset.rainfall,
          duration: 0.6,
          ease: 'power2.out',

          onUpdate: function () {
            setRainfall(
              Math.round(
                this.targets()[0].value
              )
            );
          },
        },
        0
      )
      .to(
        { value: soilMoisture },
        {
          value: preset.soilMoisture,
          duration: 0.6,
          ease: 'power2.out',

          onUpdate: function () {
            setSoilMoisture(
              Math.round(
                this.targets()[0].value
              )
            );
          },
        },
        0
      )
      .to(
        { value: slopeMovement },
        {
          value: preset.slopeMovement,
          duration: 0.6,
          ease: 'power2.out',

          onUpdate: function () {
            setSlopeMovement(
              Math.round(
                this.targets()[0].value * 10
              ) / 10
            );
          },
        },
        0
      );
  };

  // =====================================================
  // RUN SIMULATION
  // =====================================================

  const handleRun = async () => {
    if (!selectedLocationId) {
      setError('Please select a location.');
      return;
    }

    try {
      setRunning(true);
      setError(null);

      /*
       * The backend requires the simulation to be
       * started before /simulation/step is called.
       */

      await startSimulation(
        selectedLocationId
      );

      /*
       * Send the actual slider values to the backend.
       */

      const backendResult =
        await simulationStep({
          locationId: selectedLocationId,
          rainfall,
          soilMoisture,
          slopeMovement,
        });

      console.log(
        'Simulation result:',
        backendResult
      );

      /*
       * Convert backend snake_case response
       * into the format used by this component.
       */

      const formattedResult = {
        locationId:
          backendResult.location_id,

        rainfall:
          backendResult.rainfall,

        soilMoisture:
          backendResult.soil_moisture,

        slopeMovement:
          backendResult.slope_movement,

        floodProbability:
          Number(
            backendResult.flood_probability ?? 0
          ),

        landslideProbability:
          Number(
            backendResult.landslide_probability ?? 0
          ),

        overallRisk:
          backendResult.overall_risk,

        leadTimeMinutes:
          backendResult.lead_time,

        recommendedAction:
          backendResult.recommended_action,
      };

      setResult(formattedResult);

      /*
       * Animate flood probability.
       */

      floodValRef.current.v =
        displayFlood;

      gsap.to(floodValRef.current, {
        v:
          formattedResult.floodProbability *
          100,

        duration: 0.9,
        ease: 'power2.out',

        onUpdate: () => {
          setDisplayFlood(
            Math.round(
              floodValRef.current.v
            )
          );
        },
      });

      /*
       * Animate landslide probability.
       */

      landslideValRef.current.v =
        displayLandslide;

      gsap.to(landslideValRef.current, {
        v:
          formattedResult.landslideProbability *
          100,

        duration: 0.9,
        ease: 'power2.out',

        onUpdate: () => {
          setDisplayLandslide(
            Math.round(
              landslideValRef.current.v
            )
          );
        },
      });
    } catch (err) {
      console.error(
        'Simulation failed:',
        err
      );

      setError(
        err?.message ||
          'Failed to run simulation'
      );

      setResult(null);
      setDisplayFlood(0);
      setDisplayLandslide(0);
    } finally {
      setRunning(false);
    }
  };

  // =====================================================
  // RESULT ANIMATION
  // =====================================================

  useEffect(() => {
    if (
      result &&
      resultRef.current
    ) {
      gsap.fromTo(
        resultRef.current,

        {
          opacity: 0,
          y: 16,
        },

        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }
  }, [result]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#163A5F]">
          Loading simulation data...
        </p>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error && locations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-600">
            Failed to load simulation
          </p>

          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">

      {/* =================================================
          HEADER
      ================================================= */}

      <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss-deep">
        Simulation
      </p>

      <h1 className="mt-1 font-display text-3xl text-[#163A5F]">
        Simulate a disaster scenario
      </h1>

      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Change environmental conditions and send
        them to the Prithvi backend to see how
        predicted disaster risk responds.
      </p>

      {/* =================================================
          LOCATION SELECTOR
      ================================================= */}

      <div className="mt-6 rounded-2xl border border-[#163A5F]/10 bg-white p-5 shadow-sm">

        <label className="text-xs uppercase tracking-wide text-ink/45">
          Simulation Location
        </label>

        <select
          value={selectedLocationId}
          onChange={(e) => {
            setSelectedLocationId(
              e.target.value
            );

            setResult(null);
            setDisplayFlood(0);
            setDisplayLandslide(0);
          }}
          className="mt-2 w-full rounded-xl border border-[#163A5F]/15 bg-white px-4 py-2.5 text-sm font-medium text-[#163A5F] focus:outline-none focus:ring-2 focus:ring-moss/40"
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

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">
            {error}
          </p>
        </div>
      )}

      {/* =================================================
          PRESETS
      ================================================= */}

      <div className="mt-6 flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(
          ([key, preset]) => (
            <button
              key={key}
              onClick={() =>
                applyPreset(key)
              }
              disabled={running}
              className="rounded-full border border-[#163A5F]/20 px-4 py-1.5 text-xs font-medium text-[#163A5F] transition-colors hover:bg-[#163A5F]/5 disabled:opacity-50"
            >
              {preset.label}
            </button>
          )
        )}
      </div>

      {/* =================================================
          CONTROLS + LIVE RESULT
      ================================================= */}

      <div className="mt-6 grid grid-cols-1 gap-8 rounded-2xl border border-[#163A5F]/10 bg-white p-7 shadow-sm md:grid-cols-2">

        {/* CONTROLS */}

        <div className="space-y-7">

          <Slider
            label="Rainfall"
            unit="mm/h"
            value={rainfall}
            min={0}
            max={80}
            onChange={setRainfall}
            accent="#6fb3c2"
          />

          <Slider
            label="Soil Moisture"
            unit="%"
            value={soilMoisture}
            min={0}
            max={100}
            onChange={setSoilMoisture}
            accent="#7fa37a"
          />

          <Slider
            label="Slope Movement"
            unit="mm"
            value={slopeMovement}
            min={0}
            max={20}
            onChange={setSlopeMovement}
            accent="#b94a43"
          />

          <button
            onClick={handleRun}
            disabled={running}
            className="w-full rounded-full bg-[#163A5F] px-6 py-3 text-sm font-semibold text-mist transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {running
              ? 'Running simulation…'
              : 'Run simulation'}
          </button>
        </div>

        {/* RESULT SUMMARY */}

        <div className="flex flex-col justify-center gap-4 rounded-xl bg-mist-deep p-6">

          <div>
            <p className="text-xs text-ink/45">
              Flood Risk
            </p>

            <p className="font-display text-3xl text-[#163A5F]">
              {displayFlood}%
            </p>
          </div>

          <div>
            <p className="text-xs text-ink/45">
              Landslide Risk
            </p>

            <p className="font-display text-3xl text-[#163A5F]">
              {displayLandslide}%
            </p>
          </div>

          {result && (
            <RiskBadge
              level={result.overallRisk}
              size="lg"
            />
          )}
        </div>
      </div>

      {/* =================================================
          PREDICTION RESULT
      ================================================= */}

      {result && (
        <div
          ref={resultRef}
          className="mt-6 rounded-2xl border border-[#163A5F]/10 bg-white p-7 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">

            <h2 className="font-display text-xl text-[#163A5F]">
              Prediction result
            </h2>

            <p className="font-mono text-xs text-ink/45">
              Estimated warning window:{' '}
              ~{result.leadTimeMinutes} min
            </p>
          </div>

          {/* INPUTS USED */}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

            <div className="rounded-lg bg-mist-deep px-4 py-3">
              <p className="text-xs text-ink/45">
                Rainfall
              </p>

              <p className="font-mono text-sm text-[#163A5F]">
                {result.rainfall} mm/h
              </p>
            </div>

            <div className="rounded-lg bg-mist-deep px-4 py-3">
              <p className="text-xs text-ink/45">
                Soil Moisture
              </p>

              <p className="font-mono text-sm text-[#163A5F]">
                {result.soilMoisture}%
              </p>
            </div>

            <div className="rounded-lg bg-mist-deep px-4 py-3">
              <p className="text-xs text-ink/45">
                Slope Movement
              </p>

              <p className="font-mono text-sm text-[#163A5F]">
                {result.slopeMovement} mm
              </p>
            </div>

          </div>

          {/* RECOMMENDATION */}

          <p className="mt-4 text-sm text-ink/70">
            <span className="font-medium text-[#163A5F]">
              Recommended action:{' '}
            </span>

            {result.recommendedAction}
          </p>

          {/* SHELTER */}

          {nearestShelter && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-mist-deep px-4 py-3 text-sm">

              <span className="text-ink/60">
                Nearest shelter
              </span>

              <span className="font-medium text-[#163A5F]">
                {nearestShelter.name}
                {' · '}
                capacity{' '}
                {nearestShelter.capacity}
              </span>

            </div>
          )}

          <p className="mt-4 text-[11px] text-ink/40">
            This lead-time and risk estimate is
            a prototype indicator for demonstration
            purposes and is not an officially
            validated evacuation prediction.
          </p>
        </div>
      )}

    </div>
  );
}