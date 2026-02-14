import type { TriageOutput, TriageResult } from "./types";

const CHEST_PAIN_SYNONYMS = [
  "chest pain",
  "chest discomfort",
  "chest pressure",
  "chest tightness",
];

/**
 * Parse BP string (e.g. "120/80", "140/90") to { systolic, diastolic }.
 * Returns null if unparseable.
 */
export function parseBP(bp: string | undefined): {
  systolic: number;
  diastolic: number;
} | null {
  if (!bp || typeof bp !== "string") return null;
  const trimmed = bp.trim();
  const match = trimmed.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
  if (!match) return null;
  const systolic = parseInt(match[1], 10);
  const diastolic = parseInt(match[2], 10);
  if (Number.isNaN(systolic) || Number.isNaN(diastolic)) return null;
  return { systolic, diastolic };
}

/**
 * High BP threshold for safety override (chest pain + high BP → HIGH risk).
 * Conservative: systolic >= 160 or diastolic >= 100.
 */
const HIGH_BP_SYSTOLIC = 160;
const HIGH_BP_DIASTOLIC = 100;

export function isHighBP(bp: string | undefined): boolean {
  const parsed = parseBP(bp);
  if (!parsed) return false;
  return (
    parsed.systolic >= HIGH_BP_SYSTOLIC ||
    parsed.diastolic >= HIGH_BP_DIASTOLIC
  );
}

export function hasChestPain(symptoms: string[]): boolean {
  const lower = symptoms.map((s) => s.toLowerCase().trim());
  return CHEST_PAIN_SYNONYMS.some((keyword) =>
    lower.some((s) => s.includes(keyword) || keyword.includes(s))
  );
}

/**
 * Apply clinical safety override: chest pain + high BP → HIGH risk.
 * Returns new result with risk_level HIGH and safetyOverrideApplied: true if override was applied.
 */
export function applySafetyOverride(
  input: { symptoms: string[]; vitals: { bp?: string } },
  output: TriageOutput
): TriageResult {
  const chestPain = hasChestPain(input.symptoms);
  const highBP = isHighBP(input.vitals?.bp);

  if (chestPain && highBP && output.risk_level !== "HIGH") {
    return {
      ...output,
      risk_level: "HIGH",
      risk_score: Math.max(output.risk_score, 0.8),
      confidence: output.confidence,
      safetyOverrideApplied: true,
    };
  }

  return { ...output, safetyOverrideApplied: false };
}
