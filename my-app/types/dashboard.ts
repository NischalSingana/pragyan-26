export type DashboardData = {
  totalPatients: number;
  patients: Array<{
    id: string;
    name: string;
    age: number;
    gender?: string;
    riskLevel: string;
    riskScore?: number | null;
    recommendedDepartment: string;
    adjustedDepartment?: string;
    adjusted?: boolean;
    estimatedWaitMin?: number;
    priorityScore?: number;
    explanation?: { confidence?: number; contributing_factors?: Array<{ factor: string; impact: number }> } | null;
    ewsScore?: number | null;
    aiDisagreement?: boolean | null;
    createdAt: string;
  }>;
  departmentLoads: Array<{
    id: string;
    departmentName: string;
    currentPatients: number;
    availableDoctors: number;
    avgWaitTime: number;
    loadRatio?: number;
    estimatedWaitMin?: number;
    bedOccupancy?: number;
  }>;
  riskDistribution: Array<{ level: string; count: number }>;
  highRiskPatients?: Array<{
    id: string;
    name: string;
    age: number;
    riskLevel: string;
    recommendedDepartment: string;
    adjustedDepartment?: string;
    adjusted?: boolean;
    estimatedWaitMin?: number;
    priorityScore?: number;
  }>;
  waitTimeByDept?: Array<{
    department: string;
    avgWaitTime: number;
    estimatedWaitMin: number;
    currentPatients: number;
    bedOccupancy?: number;
  }>;
  avgWaitTimeOverall?: number;
  riskDistributionByGender?: Array<{
    gender: string;
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    total: number;
  }>;
  riskDistributionByAge?: Array<{
    ageGroup: string;
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    total: number;
  }>;
  arrivalRateHistory?: Array<{ hour: number; arrivals: number }>;
  forecastNextHour?: number;
  surgeMode?: boolean;
  biasWarning?: boolean;
  fairnessDetails?: {
    biasWarning: boolean;
    overallHighRate: number;
    byGender: Array<{ gender: string; highRate: number; deviation: number; exceedsThreshold: boolean }>;
    byAgeGroup: Array<{ ageGroup: string; highRate: number; deviation: number; exceedsThreshold: boolean }>;
  };
  aiDisagreementCount?: number;
};
