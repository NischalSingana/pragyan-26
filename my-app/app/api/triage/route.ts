import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triageRequestSchema } from "@/lib/validations/triage";
import { runEnsembleTriage, ensembleToRiskLevel, buildExplanationJson } from "@/lib/triageEngine";
import { computeEWSScore } from "@/lib/ews";
import { auditLog, getRoleFromRequest } from "@/lib/audit";
import { consumeTriageRateLimit, getClientId } from "@/lib/rateLimit";
import { RiskLevel } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  const clientId = getClientId(request);
  if (!consumeTriageRateLimit(clientId)) {
    return NextResponse.json(
      { error: "Too many triage requests. Please try again later." },
      { status: 429 }
    );
  }
  try {
    const body = await request.json();
    const parsed = triageRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const triageInput = {
      age: data.age,
      gender: data.gender,
      symptoms: data.symptoms,
      vitals: {
        bp: data.vitals?.bp,
        heartRate: data.vitals?.heartRate,
        temperature: data.vitals?.temperature,
        spO2: data.vitals?.spO2,
      },
      preExistingConditions: data.preExistingConditions,
    };

    const result = await runEnsembleTriage(triageInput);
    const ewsScore = computeEWSScore(triageInput);
    const userRole = getRoleFromRequest(request.headers);

    const riskLevel = ensembleToRiskLevel(result) as RiskLevel;
    const explanation = buildExplanationJson(result, ewsScore) as Prisma.InputJsonValue;

    const patient = await prisma.patient.create({
      data: {
        name: data.name,
        age: data.age,
        gender: data.gender,
        symptoms: data.symptoms,
        bloodPressure: data.vitals?.bp ?? null,
        heartRate: data.vitals?.heartRate ?? null,
        temperature: data.vitals?.temperature ?? null,
        preExistingConditions: data.preExistingConditions,
        riskScore: result.finalRiskScore,
        riskLevel,
        recommendedDepartment: result.recommended_department,
        explanation,
        ewsScore,
        aiDisagreement: result.disagreement,
      },
    });

    await auditLog({
      action: "TRIAGE_RESULT",
      userRole,
      patientId: patient.id,
      metadata: {
        riskLevel: result.finalRisk,
        disagreement: result.disagreement,
        safetyOverride: result.safetyOverrideApplied,
        ewsOverride: result.ewsOverrideApplied,
      },
    });
    if (result.safetyOverrideApplied) {
      await auditLog({
        action: "SAFETY_OVERRIDE",
        userRole,
        patientId: patient.id,
        metadata: { finalRisk: result.finalRisk },
      });
    }
    if (result.disagreement) {
      await auditLog({
        action: "AI_DISAGREEMENT",
        userRole,
        patientId: patient.id,
        metadata: { modelVotes: result.modelVotes },
      });
    }

    return NextResponse.json(
      {
        patient,
        triage: {
          finalRisk: result.finalRisk,
          finalRiskScore: result.finalRiskScore,
          recommended_department: result.recommended_department,
          contributing_factors: result.contributing_factors,
          confidenceScore: result.confidenceScore,
          modelVotes: result.modelVotes,
          disagreement: result.disagreement,
          safetyOverrideApplied: result.safetyOverrideApplied,
          ewsOverrideApplied: result.ewsOverrideApplied,
          ewsScore,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/triage:", e);
    const message = e instanceof Error ? e.message : "Triage failed";
    const isValidation = message.includes("JSON") || message.includes("Invalid");
    return NextResponse.json(
      { error: isValidation ? message : "AI triage failed. Please try again." },
      { status: isValidation ? 422 : 503 }
    );
  }
}
