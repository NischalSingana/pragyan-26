import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RiskLevel } from "@prisma/client";
import {
  enrichPatientsWithPriority,
  departmentLoadRatio,
  estimatedWaitTime,
  smartWaitTimeMinutes,
} from "@/lib/departmentOptimization";
import { runFairnessCheck } from "@/lib/fairnessEngine";
import { isSurgeMode } from "@/lib/config/surgeMode";

function getAgeGroup(age: number): string {
  if (age < 18) return "0-17";
  if (age < 35) return "18-34";
  if (age < 50) return "35-49";
  if (age < 65) return "50-64";
  return "65+";
}

export async function GET() {
  try {
    const [
      patientsRaw,
      departmentLoads,
      riskCounts,
      totalPatients,
      patientsForForecast,
    ] = await Promise.all([
      prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          name: true,
          age: true,
          gender: true,
          riskScore: true,
          riskLevel: true,
          recommendedDepartment: true,
          explanation: true,
          ewsScore: true,
          aiDisagreement: true,
          createdAt: true,
        },
      }),
      prisma.departmentLoad.findMany({ orderBy: { departmentName: "asc" } }),
      prisma.patient.groupBy({
        by: ["riskLevel"],
        _count: { id: true },
      }),
      prisma.patient.count(),
      prisma.patient.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        select: { createdAt: true },
      }),
    ]);

    const riskDistribution = [
      { level: "LOW", count: riskCounts.find((r) => r.riskLevel === RiskLevel.LOW)?._count.id ?? 0 },
      { level: "MEDIUM", count: riskCounts.find((r) => r.riskLevel === RiskLevel.MEDIUM)?._count.id ?? 0 },
      { level: "HIGH", count: riskCounts.find((r) => r.riskLevel === RiskLevel.HIGH)?._count.id ?? 0 },
      { level: "REVIEW_REQUIRED", count: riskCounts.find((r) => r.riskLevel === RiskLevel.REVIEW_REQUIRED)?._count.id ?? 0 },
    ];

    const deptLoads = departmentLoads.map((d) => {
      const loadRatio = departmentLoadRatio(d.currentPatients, d.availableDoctors);
      const estimatedWaitMin = d.avgTreatmentTime != null
        ? smartWaitTimeMinutes(d)
        : estimatedWaitTime(d);
      return {
        ...d,
        loadRatio,
        estimatedWaitMin,
        smartWaitMin: d.avgTreatmentTime != null ? smartWaitTimeMinutes(d) : undefined,
      };
    });

    const patients = enrichPatientsWithPriority(
      patientsRaw.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      departmentLoads
    );

    const highRiskPatients = patients
      .filter((p) => p.riskLevel === "HIGH")
      .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
      .slice(0, 20);

    const waitTimeByDept = deptLoads.map((d) => ({
      department: d.departmentName,
      avgWaitTime: d.avgWaitTime,
      estimatedWaitMin: d.estimatedWaitMin,
      currentPatients: d.currentPatients,
      bedOccupancy: (d as { bedOccupancy?: number }).bedOccupancy,
    }));

    const avgWaitTimeOverall =
      deptLoads.length > 0
        ? deptLoads.reduce((s, d) => s + d.avgWaitTime * d.currentPatients, 0) /
          Math.max(
            1,
            deptLoads.reduce((s, d) => s + d.currentPatients, 0)
          )
        : 0;

    const riskByGender = patientsRaw.reduce(
      (acc, p) => {
        const g = p.gender?.trim() || "Unknown";
        if (!acc[g]) acc[g] = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        acc[g][p.riskLevel] = (acc[g][p.riskLevel] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, Record<string, number>>
    );
    const riskDistributionByGender = Object.entries(riskByGender).map(
      ([gender, counts]) => {
        const LOW = counts.LOW ?? 0;
        const MEDIUM = counts.MEDIUM ?? 0;
        const HIGH = counts.HIGH ?? 0;
        const REVIEW_REQUIRED = counts.REVIEW_REQUIRED ?? 0;
        return {
          gender,
          LOW,
          MEDIUM,
          HIGH,
          total: LOW + MEDIUM + HIGH + REVIEW_REQUIRED,
        };
      }
    );

    const riskByAgeGroup = patientsRaw.reduce(
      (acc, p) => {
        const group = getAgeGroup(p.age);
        if (!acc[group]) acc[group] = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        acc[group][p.riskLevel] = (acc[group][p.riskLevel] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, Record<string, number>>
    );
    const riskDistributionByAge = Object.entries(riskByAgeGroup).map(
      ([ageGroup, counts]) => {
        const LOW = counts.LOW ?? 0;
        const MEDIUM = counts.MEDIUM ?? 0;
        const HIGH = counts.HIGH ?? 0;
        const REVIEW_REQUIRED = counts.REVIEW_REQUIRED ?? 0;
        return {
          ageGroup,
          LOW,
          MEDIUM,
          HIGH,
          total: LOW + MEDIUM + HIGH + REVIEW_REQUIRED,
        };
      }
    );

    const fairness = runFairnessCheck(
      riskDistributionByGender as Array<{ gender?: string; LOW: number; MEDIUM: number; HIGH: number; total: number }>,
      riskDistributionByAge as Array<{ ageGroup?: string; LOW: number; MEDIUM: number; HIGH: number; total: number }>
    );
    const aiDisagreementCount = patientsRaw.filter((p) => p.aiDisagreement === true).length;
    const surgeMode = isSurgeMode();

    const hourlyBuckets: Record<number, number> = {};
    const now = Date.now();
    for (let i = 0; i < 24; i++) {
      hourlyBuckets[i] = 0;
    }
    patientsForForecast.forEach((p) => {
      const h = Math.floor(
        (now - new Date(p.createdAt).getTime()) / (60 * 60 * 1000)
      );
      if (h >= 0 && h < 24) {
        hourlyBuckets[23 - h] = (hourlyBuckets[23 - h] ?? 0) + 1;
      }
    });
    const arrivalRateHistory = Object.entries(hourlyBuckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([hour, count]) => ({ hour: Number(hour), arrivals: count }));
    const recentAvg =
      arrivalRateHistory.length >= 3
        ? arrivalRateHistory
            .slice(-6)
            .reduce((s, x) => s + x.arrivals, 0) / Math.min(6, arrivalRateHistory.length)
        : arrivalRateHistory.reduce((s, x) => s + x.arrivals, 0) / Math.max(1, arrivalRateHistory.length);
    const forecastNextHour = Math.max(0, Math.round(recentAvg));

    return NextResponse.json({
      totalPatients,
      patients,
      departmentLoads: deptLoads,
      riskDistribution,
      highRiskPatients,
      waitTimeByDept,
      avgWaitTimeOverall: Math.round(avgWaitTimeOverall),
      riskDistributionByGender,
      riskDistributionByAge,
      arrivalRateHistory,
      forecastNextHour,
      surgeMode,
      biasWarning: fairness.biasWarning,
      fairnessDetails: fairness,
      aiDisagreementCount,
    });
  } catch (e) {
    console.error("GET /api/dashboard:", e);
    const message = e instanceof Error ? e.message : String(e);
    const isDbUnreachable =
      message.includes("Can't reach database") ||
      message.includes("database server") ||
      message.includes("PostgreSQL connection") ||
      message.includes("kind: Closed") ||
      (e as Error & { code?: string }).name === "PrismaClientInitializationError";
    if (isDbUnreachable) {
      return NextResponse.json(
        {
          error:
            "Database unavailable. If you're using Neon, the database may be suspended—open the Neon console to wake it, then retry.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
