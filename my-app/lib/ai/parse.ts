import type { TriageOutput } from "./types";

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;

function isValidRiskLevel(s: string): s is "LOW" | "MEDIUM" | "HIGH" {
  return RISK_LEVELS.includes(s as (typeof RISK_LEVELS)[number]);
}

/**
 * Extract JSON from model response (strip markdown code blocks if present).
 */
export function extractJson(text: string): string {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  return trimmed;
}

/**
 * Parse and validate AI response into TriageOutput. Throws on invalid shape.
 */
export function parseTriageOutput(rawContent: string): TriageOutput {
  const jsonStr = extractJson(rawContent);
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error("AI response is not valid JSON");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("AI response is not a JSON object");
  }

  const obj = data as Record<string, unknown>;

  const risk_score = obj.risk_score;
  if (typeof risk_score !== "number" || risk_score < 0 || risk_score > 1) {
    throw new Error("Invalid or missing risk_score (must be number 0-1)");
  }

  const risk_level = obj.risk_level;
  if (typeof risk_level !== "string" || !isValidRiskLevel(risk_level)) {
    throw new Error("Invalid or missing risk_level (must be LOW, MEDIUM, or HIGH)");
  }

  const recommended_department =
    typeof obj.recommended_department === "string"
      ? obj.recommended_department.trim()
      : "";
  if (!recommended_department) {
    throw new Error("Missing recommended_department");
  }

  const contributing_factors = obj.contributing_factors;
  if (!Array.isArray(contributing_factors)) {
    throw new Error("contributing_factors must be an array");
  }
  const factors = contributing_factors.map((item: unknown) => {
    if (!item || typeof item !== "object") {
      throw new Error("Each contributing_factor must be { factor, impact }");
    }
    const o = item as Record<string, unknown>;
    const factor = typeof o.factor === "string" ? o.factor : String(o.factor ?? "");
    const impact = typeof o.impact === "number" ? o.impact : Number(o.impact) || 0;
    return { factor, impact };
  });

  const confidence = obj.confidence;
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    throw new Error("Invalid or missing confidence (must be number 0-1)");
  }

  return {
    risk_score,
    risk_level,
    recommended_department,
    contributing_factors: factors,
    confidence,
  };
}
