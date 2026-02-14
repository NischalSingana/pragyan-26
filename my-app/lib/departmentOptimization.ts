/**
 * Dynamic Department Optimization
 * Priority score and re-routing for hospital load balancing.
 * Phase 4 — Surge mode threshold. Phase 6 — Smart wait time.
 */

import { getSurgeConfig } from "@/lib/config/surgeMode";

const MAX_WAIT_TIME_MIN = 120; // max wait for normalization (minutes)

export type DepartmentLoadRow = {
  id: string;
  departmentName: string;
  currentPatients: number;
  availableDoctors: number;
  avgWaitTime: number;
  avgTreatmentTime?: number;
  bedOccupancy?: number;
};

function getOverloadThreshold(): number {
  return getSurgeConfig().overloadThreshold;
}

export type PatientForPriority = {
  id: string;
  riskScore: number | null;
  recommendedDepartment: string;
};

/**
 * normalized_wait_time = avgWaitTime / maxWaitTime (capped 0-1)
 */
export function normalizedWaitTime(avgWaitTime: number): number {
  return Math.min(1, Math.max(0, avgWaitTime / MAX_WAIT_TIME_MIN));
}

/**
 * resource_availability_score: higher when more doctors relative to patients.
 * Score in [0, 1]; 1 = plenty of capacity.
 */
export function resourceAvailabilityScore(
  currentPatients: number,
  availableDoctors: number
): number {
  const total = currentPatients + availableDoctors;
  if (total === 0) return 1;
  return Math.min(1, availableDoctors / Math.max(1, currentPatients));
}

/**
 * Load ratio for heatmap: 0 = empty, 1 = full. Based on patients vs capacity (patients + doctors).
 */
export function departmentLoadRatio(
  currentPatients: number,
  availableDoctors: number
): number {
  const capacity = currentPatients + Math.max(1, availableDoctors);
  return Math.min(1, currentPatients / capacity);
}

/**
 * Final Priority Score: risk + wait + resource. Surge mode increases risk weight.
 */
export function finalPriorityScore(
  riskScore: number,
  dept: DepartmentLoadRow
): number {
  const { highRiskPriorityWeight } = getSurgeConfig();
  const risk = Math.min(1, Math.max(0, riskScore));
  const normWait = normalizedWaitTime(dept.avgWaitTime);
  const resource = resourceAvailabilityScore(
    dept.currentPatients,
    dept.availableDoctors
  );
  const riskW = highRiskPriorityWeight;
  const waitW = (1 - riskW) * 0.5;
  const resourceW = (1 - riskW) * 0.5;
  return riskW * risk + waitW * normWait + resourceW * resource;
}

/**
 * Estimated wait time for a department (minutes).
 * Simple model: base wait + (currentPatients / max(1, availableDoctors)) * factor.
 */
export function estimatedWaitTime(dept: DepartmentLoadRow): number {
  const base = dept.avgWaitTime;
  const queueFactor = dept.currentPatients / Math.max(1, dept.availableDoctors);
  return Math.round(base + queueFactor * 5);
}

/**
 * Phase 6 — Smart wait time: (currentPatients / doctorCount) * avgTreatmentTime.
 * Falls back to estimatedWaitTime if avgTreatmentTime missing.
 */
export function smartWaitTimeMinutes(dept: DepartmentLoadRow): number {
  const doctors = Math.max(1, dept.availableDoctors);
  const avgTreatment = dept.avgTreatmentTime ?? 15;
  return Math.round((dept.currentPatients / doctors) * avgTreatment);
}

/**
 * Check if department is overloaded (uses surge threshold when SURGE_MODE=true).
 */
export function isOverloaded(dept: DepartmentLoadRow): boolean {
  return departmentLoadRatio(dept.currentPatients, dept.availableDoctors) >= getOverloadThreshold();
}

const FALLBACK_ORDER = [
  "General Medicine",
  "Emergency",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Others",
];

/**
 * If recommended department is overloaded, return next best alternative from same or fallback list.
 */
export function adjustDepartmentIfOverloaded(
  recommendedDepartment: string,
  departmentLoads: DepartmentLoadRow[]
): { department: string; adjusted: boolean; estimatedWaitMin: number } {
  const dept = departmentLoads.find(
    (d) => d.departmentName === recommendedDepartment
  );
  if (!dept) {
    const first = departmentLoads[0];
    return {
      department: recommendedDepartment,
      adjusted: false,
      estimatedWaitMin: first ? estimatedWaitTime(first) : 0,
    };
  }
  const wait = estimatedWaitTime(dept);
  if (!isOverloaded(dept)) {
    return { department: recommendedDepartment, adjusted: false, estimatedWaitMin: wait };
  }
  const others = departmentLoads
    .filter((d) => d.departmentName !== recommendedDepartment && !isOverloaded(d))
    .sort(
      (a, b) =>
        estimatedWaitTime(a) - estimatedWaitTime(b)
    );
  if (others.length === 0) {
    return { department: recommendedDepartment, adjusted: false, estimatedWaitMin: wait };
  }
  const best = others[0];
  return {
    department: best.departmentName,
    adjusted: true,
    estimatedWaitMin: estimatedWaitTime(best),
  };
}

/**
 * Enrich patients with final priority score, adjusted department, and estimated wait.
 */
export function enrichPatientsWithPriority(
  patients: Array<{
    id: string;
    riskScore: number | null;
    recommendedDepartment: string;
    riskLevel?: string;
    name?: string;
    age?: number;
    gender?: string;
    createdAt?: string;
    explanation?: unknown;
  }>,
  departmentLoads: DepartmentLoadRow[]
): Array<{
  id: string;
  riskScore: number | null;
  recommendedDepartment: string;
  adjustedDepartment: string;
  adjusted: boolean;
  estimatedWaitMin: number;
  priorityScore: number;
  riskLevel?: string;
  name?: string;
  age?: number;
  gender?: string;
  createdAt?: string;
  explanation?: unknown;
}> {
  return patients.map((p) => {
    const risk = p.riskScore ?? (p.riskLevel === "HIGH" ? 0.8 : p.riskLevel === "MEDIUM" ? 0.5 : p.riskLevel === "REVIEW_REQUIRED" ? 0.6 : 0.2);
    const { department, adjusted, estimatedWaitMin } = adjustDepartmentIfOverloaded(
      p.recommendedDepartment,
      departmentLoads
    );
    const dept = departmentLoads.find((d) => d.departmentName === department);
    const priorityScore = dept
      ? finalPriorityScore(risk, dept)
      : 0.6 * risk;
    return {
      ...p,
      adjustedDepartment: department,
      adjusted,
      estimatedWaitMin,
      priorityScore,
    };
  });
}
