/**
 * Async document processing: UPLOADED → PROCESSING → AI_EXTRACTED | FAILED.
 * Phase 1 — Background extraction with status updates.
 */

import { prisma } from "@/lib/prisma";
import { extractTextFromPdf } from "@/lib/pdf";
import { extractTextFromImage } from "@/lib/vision";
import { extractEhrFromText } from "@/lib/ehrExtract";
import { DocumentProcessingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { auditLog } from "@/lib/audit";

const APPLICATION_PDF = "application/pdf";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Run in background (do not await). Flow:
 * 1. Set status PROCESSING
 * 2. Extract text (PDF or Vision)
 * 3. If text empty → set AI_EXTRACTED with empty structuredData
 * 4. Else run AI EHR extraction → set AI_EXTRACTED with structuredData
 * 5. On error → set FAILED and audit DOCUMENT_FAILED
 */
export function processDocumentInBackground(
  documentId: string,
  buffer: Buffer,
  mimeType: string
): void {
  setImmediate(async () => {
    try {
      await prisma.uploadedDocument.update({
        where: { id: documentId },
        data: { processingStatus: DocumentProcessingStatus.PROCESSING },
      });

      let extractedText = "";
      if (mimeType === APPLICATION_PDF) {
        extractedText = await extractTextFromPdf(buffer);
      } else if (IMAGE_TYPES.includes(mimeType)) {
        extractedText = await extractTextFromImage(buffer);
      }

      await prisma.uploadedDocument.update({
        where: { id: documentId },
        data: { extractedText },
      });

      if (!extractedText.trim()) {
        await prisma.uploadedDocument.update({
          where: { id: documentId },
          data: {
            structuredData: {
              symptoms: [],
              vitals: {},
              conditions: [],
              medications: [],
            } as Prisma.InputJsonValue,
            processingStatus: DocumentProcessingStatus.AI_EXTRACTED,
            processingError: null,
          },
        });
        await auditLog({
          action: "DOCUMENT_PROCESSED",
          userRole: "TRIAGE_NURSE",
          patientId: (await prisma.uploadedDocument.findUnique({ where: { id: documentId }, select: { patientId: true } }))?.patientId ?? undefined,
          metadata: { documentId, status: "AI_EXTRACTED", emptyText: true },
        });
        return;
      }

      const structuredData = await extractEhrFromText(extractedText);

      await prisma.uploadedDocument.update({
        where: { id: documentId },
        data: {
          structuredData: structuredData as Prisma.InputJsonValue,
          processingStatus: DocumentProcessingStatus.AI_EXTRACTED,
          processingError: null,
        },
      });

      await auditLog({
        action: "DOCUMENT_PROCESSED",
        userRole: "TRIAGE_NURSE",
        patientId: (await prisma.uploadedDocument.findUnique({ where: { id: documentId }, select: { patientId: true } }))?.patientId ?? undefined,
        metadata: { documentId, status: "AI_EXTRACTED" },
      });
    } catch (e) {
      console.error("Document processing failed:", documentId, e);
      const message = e instanceof Error ? e.message : "Processing failed";
      await prisma.uploadedDocument
        .update({
          where: { id: documentId },
          data: {
            processingStatus: DocumentProcessingStatus.FAILED,
            processingError: message,
          },
        })
        .catch((err) => console.error("Failed to update status:", err));

      const doc = await prisma.uploadedDocument.findUnique({
        where: { id: documentId },
        select: { patientId: true },
      }).catch(() => null);
      await auditLog({
        action: "DOCUMENT_FAILED",
        userRole: "TRIAGE_NURSE",
        patientId: doc?.patientId ?? undefined,
        metadata: { documentId, error: message },
      });
    }
  });
}
