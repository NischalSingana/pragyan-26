import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPatientSchema } from "@/lib/validations/patient";
import { RiskLevel } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPatientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const patient = await prisma.patient.create({
      data: {
        name: data.name,
        age: data.age,
        gender: data.gender,
        symptoms: data.symptoms,
        bloodPressure: data.bloodPressure ?? null,
        heartRate: data.heartRate ?? null,
        temperature: data.temperature ?? null,
        preExistingConditions: data.preExistingConditions,
        riskScore: data.riskScore ?? null,
        riskLevel: data.riskLevel as RiskLevel,
        recommendedDepartment: data.recommendedDepartment,
        explanation: (data.explanation ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return NextResponse.json(patient, { status: 201 });
  } catch (e) {
    console.error("POST /api/patient:", e);
    return NextResponse.json(
      { error: "Failed to create patient" },
      { status: 500 }
    );
  }
}
