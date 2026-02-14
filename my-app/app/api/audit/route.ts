import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/audit — List recent audit logs (ADMIN / COMMAND_CENTER).
 * Query: limit (default 50), action, patientId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
    const action = searchParams.get("action") ?? undefined;
    const patientId = searchParams.get("patientId") ?? undefined;

    const where: { action?: string; patientId?: string } = {};
    if (action) where.action = action;
    if (patientId) where.patientId = patientId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        userRole: l.userRole,
        patientId: l.patientId,
        metadata: l.metadata,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/audit:", e);
    return NextResponse.json(
      { error: "Failed to load audit logs" },
      { status: 500 }
    );
  }
}
