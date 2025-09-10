// src/lib/calc.js
import rates from './rates.json';

/**
 * @param {number|string} sqft
 * @param {string} projectType
 * @param {string} quality   "Low" | "Medium" | "High"
 * @param {string} location  "US" | "Ghana" (extendable)
 */
export function computeEstimate(sqft, projectType, quality, location) {
  const s = Number(sqft);
  if (!Number.isFinite(s) || s <= 0) throw new Error('Invalid room size');

  const project = rates.projects[projectType];
  if (!project) throw new Error('Unknown project type');

  // quality multiplier (default 1)
  const qMul = rates.qualityMultipliers[quality] ?? 1;

  // location multiplier supports either a number OR { multiplier, currency }
  const locObj = rates.locationMultipliers[location];
  const lMul =
    typeof locObj === 'object' && locObj !== null
      ? (locObj.multiplier ?? 1)
      : (locObj ?? 1);

  const laborBase = project.laborPerSqFt * s;
  const materialBase = project.materialPerSqFt * s;

  const labor = round2(laborBase * qMul * lMul);
  const material = round2(materialBase * qMul * lMul);
  const total = round2(labor + material);

  // Optional: expose currency if you want to render it in the UI
  const currency =
    typeof locObj === 'object' && locObj !== null ? locObj.currency : 'USD';

  return { labor, material, total, currency };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
