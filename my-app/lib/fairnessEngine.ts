/**
 * Phase 5 — Fairness monitoring: compare HIGH risk % by gender and age.
 * If deviation > threshold → biasWarning.
 */

export type RiskByGroup = {
  gender?: string;
  ageGroup?: string;
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  total: number;
};

const BIAS_DEVIATION_THRESHOLD = 0.15; // 15% deviation from overall HIGH rate

/**
 * Compute overall HIGH risk rate (HIGH / total).
 */
function overallHighRate(groups: RiskByGroup[]): number {
  const total = groups.reduce((s, g) => s + g.total, 0);
  const high = groups.reduce((s, g) => s + g.HIGH, 0);
  if (total === 0) return 0;
  return high / total;
}

/**
 * Check if a group's HIGH rate deviates significantly from overall.
 */
function groupDeviation(
  group: RiskByGroup,
  overallHigh: number
): number {
  if (group.total === 0) return 0;
  const groupHigh = group.HIGH / group.total;
  return Math.abs(groupHigh - overallHigh);
}

export type FairnessResult = {
  biasWarning: boolean;
  overallHighRate: number;
  byGender: Array<{ gender: string; highRate: number; deviation: number; exceedsThreshold: boolean }>;
  byAgeGroup: Array<{ ageGroup: string; highRate: number; deviation: number; exceedsThreshold: boolean }>;
};

/**
 * Compare HIGH risk % by gender and age group. Set biasWarning if any group exceeds deviation threshold.
 */
export function runFairnessCheck(
  riskDistributionByGender: RiskByGroup[],
  riskDistributionByAge: RiskByGroup[]
): FairnessResult {
  const allGroups = [...riskDistributionByGender, ...riskDistributionByAge];
  const overallHigh = overallHighRate(allGroups);

  const byGender = riskDistributionByGender.map((g) => {
    const highRate = g.total === 0 ? 0 : g.HIGH / g.total;
    const deviation = groupDeviation(g, overallHigh);
    return {
      gender: g.gender ?? "Unknown",
      highRate,
      deviation,
      exceedsThreshold: deviation > BIAS_DEVIATION_THRESHOLD,
    };
  });

  const byAgeGroup = riskDistributionByAge.map((g) => {
    const highRate = g.total === 0 ? 0 : g.HIGH / g.total;
    const deviation = groupDeviation(g, overallHigh);
    return {
      ageGroup: g.ageGroup ?? "Unknown",
      highRate,
      deviation,
      exceedsThreshold: deviation > BIAS_DEVIATION_THRESHOLD,
    };
  });

  const biasWarning =
    byGender.some((x) => x.exceedsThreshold) ||
    byAgeGroup.some((x) => x.exceedsThreshold);

  return {
    biasWarning,
    overallHighRate: overallHigh,
    byGender,
    byAgeGroup,
  };
}
