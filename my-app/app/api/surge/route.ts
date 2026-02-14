import { NextResponse } from "next/server";
import { getSurgeConfig } from "@/lib/config/surgeMode";

/**
 * GET /api/surge — Return current surge mode status (for dashboard indicator).
 */
export async function GET() {
  const config = getSurgeConfig();
  return NextResponse.json({
    surgeMode: config.enabled,
    overloadThreshold: config.overloadThreshold,
    highRiskPriorityWeight: config.highRiskPriorityWeight,
  });
}
