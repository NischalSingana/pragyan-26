import type { EhrStructuredData } from "./ehrTypes";

function extractJson(text: string): string {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  return trimmed;
}

function parseItem(
  raw: unknown
): { value: string; sourceSnippet?: string } {
  if (typeof raw === "string") return { value: raw };
  if (raw && typeof raw === "object" && "value" in raw) {
    const o = raw as Record<string, unknown>;
    return {
      value: String(o.value ?? ""),
      sourceSnippet:
        typeof o.sourceSnippet === "string" ? o.sourceSnippet : undefined,
    };
  }
  return { value: String(raw ?? "") };
}

export function parseEhrOutput(rawContent: string): EhrStructuredData {
  const jsonStr = extractJson(rawContent);
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error("EHR extraction response is not valid JSON");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("EHR extraction response is not a JSON object");
  }

  const obj = data as Record<string, unknown>;

  const symptoms = Array.isArray(obj.symptoms)
    ? obj.symptoms.map(parseItem)
    : [];
  const conditions = Array.isArray(obj.conditions)
    ? obj.conditions.map(parseItem)
    : [];
  const medications = Array.isArray(obj.medications)
    ? obj.medications.map(parseItem)
    : [];

  let vitals: EhrStructuredData["vitals"] = {};
  if (obj.vitals && typeof obj.vitals === "object" && !Array.isArray(obj.vitals)) {
    const v = obj.vitals as Record<string, unknown>;
    if (typeof v.bp === "string") vitals.bp = v.bp;
    if (typeof v.heartRate === "number") vitals.heartRate = v.heartRate;
    if (typeof v.temperature === "number") vitals.temperature = v.temperature;
  }

  let patient: EhrStructuredData["patient"];
  if (obj.patient && typeof obj.patient === "object" && !Array.isArray(obj.patient)) {
    const p = obj.patient as Record<string, unknown>;
    patient = {
      name: typeof p.name === "string" ? p.name : undefined,
      age: typeof p.age === "number" ? p.age : p.age === null ? null : undefined,
      gender: typeof p.gender === "string" ? p.gender : p.gender === null ? null : undefined,
    };
  }

  return { ...(patient && { patient }), symptoms, vitals, conditions, medications };
}
