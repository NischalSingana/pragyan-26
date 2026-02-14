import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/pdf";
import { extractEhrFromText } from "@/lib/ehrExtract";
import { ehrToFormData } from "@/lib/ai/ehrTypes";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PDF_TYPE = "application/pdf";

/**
 * POST /api/extract-pdf
 * Accepts a PDF file, extracts text and runs AI EHR extraction.
 * Returns structuredData and formData (for pre-filling patient form). No patient created, no storage.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

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
    if (file.type !== PDF_TYPE) {
      return NextResponse.json(
        { error: "Only PDF is allowed for extract-pdf" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText: string;
    try {
      extractedText = await extractTextFromPdf(buffer);
    } catch (extractErr) {
      const msg = extractErr instanceof Error ? extractErr.message : "PDF extraction failed";
      console.error("extract-pdf:", msg);
      return NextResponse.json(
        {
          error: "Could not extract text from PDF.",
          detail: process.env.NODE_ENV === "development" ? msg : undefined,
          hint: "If the PDF is scanned (image-only), upload as JPEG/PNG on Documents or use an image.",
        },
        { status: 422 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "No text in PDF. The file may be scanned images—try uploading as image or use Documents with Vision." },
        { status: 422 }
      );
    }

    const structuredData = await extractEhrFromText(extractedText);
    const formDataOut = ehrToFormData(structuredData);

    return NextResponse.json({
      extractedText: extractedText.slice(0, 8000),
      structuredData,
      formData: formDataOut,
    });
  } catch (e) {
    console.error("POST /api/extract-pdf:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
