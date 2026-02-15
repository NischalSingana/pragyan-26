/**
 * Structured EHR extraction output with optional source snippets for explainability.
 */
export type EhrStructuredData = {
  patient?: {
    name?: string;
    age?: number | null;
    gender?: string | null;
  };
  symptoms: Array<{ value: string; sourceSnippet?: string }>;
  vitals: {
    bp?: string;
    heartRate?: number;
    temperature?: number;
    spO2?: number;
    [key: string]: string | number | undefined;
  };
  conditions: Array<{ value: string; sourceSnippet?: string }>;
  medications: Array<{ value: string; sourceSnippet?: string }>;
};

/** Flattened form for auto-fill (no sourceSnippet). */
export type EhrFormData = {
  patient?: { name?: string; age?: number; gender?: string };
  symptoms: string[];
  vitals: { bp?: string; heartRate?: number; temperature?: number; spO2?: number };
  conditions: string[];
  medications: string[];
};

export function ehrToFormData(ehr: EhrStructuredData): EhrFormData {
  const patient =
    ehr.patient && (ehr.patient.name || ehr.patient.age != null || ehr.patient.gender)
      ? {
          name: ehr.patient.name ?? undefined,
          age: typeof ehr.patient.age === "number" ? ehr.patient.age : undefined,
          gender: typeof ehr.patient.gender === "string" ? ehr.patient.gender : undefined,
        }
      : undefined;
  return {
    ...(patient && { patient }),
    symptoms: ehr.symptoms.map((s) => s.value),
    vitals: ehr.vitals ?? {},
    conditions: ehr.conditions.map((c) => c.value),
    medications: ehr.medications.map((m) => m.value),
  };
}
