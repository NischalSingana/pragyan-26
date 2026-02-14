/**
 * Input for AI triage. Matches the structure expected by the LLM.
 */
export type TriageInput = {
  age: number;
  gender: string;
  symptoms: string[];
  vitals: {
    bp?: string;
    heartRate?: number;
    temperature?: number;
    spO2?: number;
  };
  preExistingConditions: string[];
};

/**
 * Strict JSON output from a single model.
 */
export type TriageOutput = {
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  recommended_department: string;
  contributing_factors: Array<{ factor: string; impact: number }>;
  confidence: number;
};

/**
 * Single model vote for ensemble.
 */
export type ModelVote = {
  provider: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_score: number;
  confidence: number;
  latencyMs?: number;
};

/**
 * Ensemble result: final risk, votes, disagreement flag, confidence.
 */
export type EnsembleResult = {
  finalRisk: "LOW" | "MEDIUM" | "HIGH" | "REVIEW_REQUIRED";
  finalRiskScore: number;
  recommended_department: string;
  contributing_factors: Array<{ factor: string; impact: number }>;
  modelVotes: ModelVote[];
  disagreement: boolean;
  confidenceScore: number;
  safetyOverrideApplied?: boolean;
  ewsOverrideApplied?: boolean;
};

/**
 * Normalized result after safety/EWS overrides, ready to persist.
 */
export type TriageResult = TriageOutput & {
  safetyOverrideApplied?: boolean;
  ewsOverrideApplied?: boolean;
  aiDisagreement?: boolean;
};
