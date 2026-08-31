// Rule-based stand-in for the ML prediction + risk fusion engine described
// in the PRD (sections 11–14). Kept simple and transparent on purpose: it's
// the frontend's simulation input, not a claim about model accuracy.

import { classifyRisk } from '../data/mockData';

export function computeFloodProbability({ rainfall, soilMoisture }) {
  const rainScore = Math.min(rainfall / 60, 1); // 60 mm/h ~ saturating
  const soilScore = Math.min(soilMoisture / 95, 1);
  const p = 0.6 * rainScore + 0.4 * soilScore;
  return Math.max(0, Math.min(1, p));
}

export function computeLandslideProbability({ rainfall, soilMoisture, slopeMovement }) {
  const rainScore = Math.min(rainfall / 60, 1);
  const soilScore = Math.min(soilMoisture / 95, 1);
  const slopeScore = Math.min(slopeMovement / 15, 1);
  const p = 0.3 * rainScore + 0.3 * soilScore + 0.4 * slopeScore;
  return Math.max(0, Math.min(1, p));
}

export function computeLeadTimeMinutes({ floodProbability, landslideProbability, slopeMovement }) {
  const severity = Math.max(floodProbability, landslideProbability);
  const base = 240 - severity * 200; // faster escalation -> shorter window
  const slopePenalty = slopeMovement > 8 ? 40 : 0;
  return Math.max(20, Math.round(base - slopePenalty));
}

export function runSimulation({ rainfall, soilMoisture, slopeMovement }) {
  const floodProbability = computeFloodProbability({ rainfall, soilMoisture });
  const landslideProbability = computeLandslideProbability({ rainfall, soilMoisture, slopeMovement });
  const overallProbability = Math.max(floodProbability, landslideProbability) * 100;
  const overallRisk = classifyRisk(overallProbability);
  const leadTimeMinutes = computeLeadTimeMinutes({ floodProbability, landslideProbability, slopeMovement });

  let recommendedAction =
    'No action needed. Continue routine monitoring.';
  if (overallRisk.key === 'MODERATE') {
    recommendedAction = 'Weather conditions are deteriorating. Monitor updates.';
  } else if (overallRisk.key === 'HIGH') {
    recommendedAction = 'High disaster risk detected. Authorities should prepare evacuation measures.';
  } else if (overallRisk.key === 'CRITICAL') {
    recommendedAction = 'Critical risk detected. Immediate evacuation of vulnerable zones is recommended.';
  }

  return {
    floodProbability,
    landslideProbability,
    overallRisk,
    leadTimeMinutes,
    recommendedAction,
  };
}
