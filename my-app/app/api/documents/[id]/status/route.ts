/**
 * Phase 1 — Polling endpoint for document processing status.
 * GET /api/documents/[id]/status → { processingStatus, processingError? }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await prisma.uploadedDocument.findUnique({
      where: { id },
      select: { processingStatus: true, processingError: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({
      processingStatus: doc.processingStatus,
      processingError: doc.processingError ?? undefined,
    });
  } catch (e) {
    console.error("GET /api/documents/[id]/status:", e);
    return NextResponse.json(
      { error: "Failed to fetch document status" },
      { status: 500 }
    );
  }
}
