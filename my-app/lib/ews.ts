/**
 * Phase 3 — Early Warning Score (EWS) for hybrid triage.
 * EWS threshold exceeded → override to HIGH risk.
 */

import type { TriageInput } from "@/lib/ai/types";
import { parseBP } from "@/lib/ai/safety";

// EWS points (example formula)
const HIGH_BP_POINTS = 2;
const ABNORMAL_HR_POINTS = 2;
const SPO2_CRITICAL_POINTS = 3; // SpO2 < 92%
const HIGH_TEMP_POINTS = 1;    // Temp > 39 °C

const SPO2_THRESHOLD = 92;
const HIGH_TEMP_CELSIUS = 39;
const HR_MIN = 50;
const HR_MAX = 120;

/**
 * Convert °F to °C if value looks like Fahrenheit (> 50).
 */
function toCelsius(temp: number): number {
  if (temp > 50) {
    return ((temp - 32) * 5) / 9;
  }
  return temp;
}

/**
 * Compute Early Warning Score from vitals.
 * High BP +2, abnormal HR +2, SpO2 < 92 +3, Temp > 39 °C +1.
 */
export function computeEWSScore(input: TriageInput): number {
  let score = 0;
  const { vitals } = input;

  // High BP
  const bp = parseBP(vitals.bp);
  if (bp && (bp.systolic >= 160 || bp.diastolic >= 100)) {
    score += HIGH_BP_POINTS;
  }

  // Heart rate outside 50–120
  if (
    typeof vitals.heartRate === "number" &&
    (vitals.heartRate < HR_MIN || vitals.heartRate > HR_MAX)
  ) {
    score += ABNORMAL_HR_POINTS;
  }

  // SpO2 < 92%
  if (
    typeof vitals.spO2 === "number" &&
    vitals.spO2 < SPO2_THRESHOLD
  ) {
    score += SPO2_CRITICAL_POINTS;
  }

  // Temp > 39 °C
  if (typeof vitals.temperature === "number") {
    const tempC = toCelsius(vitals.temperature);
    if (tempC >= HIGH_TEMP_CELSIUS) {
      score += HIGH_TEMP_POINTS;
    }
  }

  return score;
}

/** EWS above this → force HIGH risk */
const EWS_HIGH_THRESHOLD = 4;

export function ewsOverrideToHigh(ewsScore: number): boolean {
  return ewsScore >= EWS_HIGH_THRESHOLD;
}
