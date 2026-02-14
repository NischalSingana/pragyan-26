/**
 * Phase 4 — Surge mode: global toggle for disaster / high-load response.
 * When true: higher priority for HIGH cases, lower overload tolerance, aggressive re-routing.
 */

const SURGE_ENV = "SURGE_MODE";

export function getSurgeConfig(): {
  enabled: boolean;
  overloadThreshold: number;
  highRiskPriorityWeight: number;
  rerouteAggressive: boolean;
} {
  const raw = process.env[SURGE_ENV]?.toLowerCase().trim();
  const enabled = raw === "true" || raw === "1" || raw === "yes";
  return {
    enabled,
    overloadThreshold: enabled ? 0.7 : 0.85,
    highRiskPriorityWeight: enabled ? 0.8 : 0.6,
    rerouteAggressive: enabled,
  };
}

export function isSurgeMode(): boolean {
  return getSurgeConfig().enabled;
}
