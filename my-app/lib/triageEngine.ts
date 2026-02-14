/**
 * Phase 2 — Ensemble AI triage with multi-model voting.
 * Phase 3 — Hybrid scoring with EWS (Early Warning Score).
 * Orchestrates: ensemble → safety override → EWS override → final result.
 */

import type { TriageInput, TriageOutput, EnsembleResult, ModelVote } from "@/lib/ai/types";
import { buildTriageUserMessage, getSystemPrompt } from "@/lib/ai/prompt";
import { parseTriageOutput } from "@/lib/ai/parse";
import { applySafetyOverride } from "@/lib/ai/safety";
import { callProvider, FALLBACK_ORDER, type ProviderName } from "@/lib/ai/llmProvider";
import { computeEWSScore, ewsOverrideToHigh } from "@/lib/ews";

/**
 * Run one model and return parsed output + vote.
 */
async function runOneModel(
  provider: ProviderName,
  systemPrompt: string,
  userMessage: string
): Promise<{ output: TriageOutput; vote: ModelVote } | null> {
  try {
    const { raw, latencyMs } = await callProvider(provider, systemPrompt, userMessage);
    const output = parseTriageOutput(raw);
    return {
      output,
      vote: {
        provider,
        risk_level: output.risk_level,
        risk_score: output.risk_score,
        confidence: output.confidence,
        latencyMs,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Majority risk level from votes. If tie, prefer higher risk.
 */
function majorityRiskLevel(votes: ModelVote[]): "LOW" | "MEDIUM" | "HIGH" {
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const v of votes) {
    counts[v.risk_level]++;
  }
  const order: ("HIGH" | "MEDIUM" | "LOW")[] = ["HIGH", "MEDIUM", "LOW"];
  let best: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let maxCount = 0;
  for (const level of order) {
    if (counts[level] >= maxCount) {
      maxCount = counts[level];
      best = level;
    }
  }
  return best;
}

/**
 * Average risk score and confidence from votes.
 */
function averageScores(votes: ModelVote[]): { riskScore: number; confidence: number } {
  if (votes.length === 0) return { riskScore: 0.5, confidence: 0 };
  const riskScore =
    votes.reduce((s, v) => s + v.risk_score, 0) / votes.length;
  const confidence =
    votes.reduce((s, v) => s + v.confidence, 0) / votes.length;
  return { riskScore, confidence };
}

/**
 * Ensemble: call models in order until we have at least 1 vote; prefer 2 for agreement check.
 * If 2+ votes and risk_level differs → disagreement, finalRisk REVIEW_REQUIRED.
 */
export async function runEnsembleTriage(input: TriageInput): Promise<EnsembleResult> {
  const systemPrompt = getSystemPrompt();
  const userMessage = buildTriageUserMessage(input);

  const votes: ModelVote[] = [];
  let lastOutput: TriageOutput | null = null;

  for (const provider of FALLBACK_ORDER) {
    const result = await runOneModel(provider, systemPrompt, userMessage);
    if (result) {
      votes.push(result.vote);
      lastOutput = result.output;
      if (votes.length >= 2) break; // two models for agreement check
    }
  }

  if (votes.length === 0 || !lastOutput) {
    throw new Error("All AI providers failed");
  }

  const disagreement =
    votes.length >= 2 &&
    new Set(votes.map((v) => v.risk_level)).size > 1;

  const finalRiskLevel = disagreement
    ? "REVIEW_REQUIRED"
    : (majorityRiskLevel(votes) as "LOW" | "MEDIUM" | "HIGH");
  const { riskScore: finalRiskScore, confidence: confidenceScore } =
    averageScores(votes);

  const result: EnsembleResult = {
    finalRisk: finalRiskLevel as EnsembleResult["finalRisk"],
    finalRiskScore,
    recommended_department: lastOutput.recommended_department,
    contributing_factors: lastOutput.contributing_factors,
    modelVotes: votes,
    disagreement,
    confidenceScore: disagreement ? Math.min(...votes.map((v) => v.confidence)) : confidenceScore,
  };

  // Apply safety override (chest pain + high BP → HIGH)
  const afterSafety = applySafetyOverride(input, {
    ...lastOutput,
    risk_level: result.finalRisk === "REVIEW_REQUIRED" ? majorityRiskLevel(votes) : result.finalRisk,
    risk_score: result.finalRiskScore,
    confidence: result.confidenceScore,
  });
  if (afterSafety.safetyOverrideApplied) {
    result.finalRisk = "HIGH";
    result.finalRiskScore = Math.max(result.finalRiskScore, afterSafety.risk_score);
    result.safetyOverrideApplied = true;
  }

  // Phase 3 — EWS override: if EWS exceeds threshold → HIGH
  const ewsScore = computeEWSScore(input);
  if (ewsOverrideToHigh(ewsScore)) {
    result.finalRisk = "HIGH";
    result.finalRiskScore = Math.max(result.finalRiskScore, 0.8);
    result.ewsOverrideApplied = true;
  }

  return result;
}

/**
 * Map ensemble result to DB-friendly risk level (REVIEW_REQUIRED is a valid enum).
 */
export function ensembleToRiskLevel(
  result: EnsembleResult
): "LOW" | "MEDIUM" | "HIGH" | "REVIEW_REQUIRED" {
  return result.finalRisk;
}

/**
 * Build explanation JSON for Patient.explanation (includes ensemble + EWS).
 */
export function buildExplanationJson(
  result: EnsembleResult,
  ewsScore: number
): Record<string, unknown> {
  return {
    risk_score: result.finalRiskScore,
    risk_level: result.finalRisk,
    recommended_department: result.recommended_department,
    contributing_factors: result.contributing_factors,
    confidence: result.confidenceScore,
    safetyOverrideApplied: result.safetyOverrideApplied ?? false,
    ewsOverrideApplied: result.ewsOverrideApplied ?? false,
    ewsScore,
    modelVotes: result.modelVotes,
    disagreement: result.disagreement,
  };
}
