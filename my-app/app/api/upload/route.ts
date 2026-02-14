import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadToR2, R2_BUCKET } from "@/lib/r2";
import { processDocumentInBackground } from "@/lib/documentProcessor";
import { DocumentProcessingStatus } from "@prisma/client";
import { getRoleFromRequest } from "@/lib/audit";
import { auditLog } from "@/lib/audit";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export async function POST(request: NextRequest) {
  if (!R2_BUCKET) {
    return NextResponse.json(
      { error: "File storage is not configured" },
      { status: 503 }
    );
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patientId") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No file provided or file is empty" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, JPEG, PNG" },
        { status: 400 }
      );
    }

    if (!patientId || typeof patientId !== "string" || !patientId.trim()) {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId.trim() },
    });
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const key = `triage/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileUrl = await uploadToR2(key, buffer, file.type);

    const doc = await prisma.uploadedDocument.create({
      data: {
        patientId: patient.id,
        fileUrl,
        extractedText: "",
        processingStatus: DocumentProcessingStatus.UPLOADED,
      },
    });

    processDocumentInBackground(doc.id, buffer, file.type);

    const userRole = getRoleFromRequest(request.headers);
    await auditLog({
      action: "DOCUMENT_UPLOADED",
      userRole,
      patientId: patient.id,
      metadata: { documentId: doc.id, fileUrl },
    });

    return NextResponse.json(
      {
        id: doc.id,
        fileUrl,
        documentId: doc.id,
        status: doc.processingStatus,
        message: "File uploaded. Extraction running in background.",
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/upload:", e);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
