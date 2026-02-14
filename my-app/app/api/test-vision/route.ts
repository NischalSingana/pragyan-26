/**
 * Test endpoint for Google Vision API — handwriting + printed text.
 * POST /api/test-vision with multipart "file" (image) or JSON { "image": "base64..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { extractTextFromImage } from "@/lib/vision";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let buffer: Buffer;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file || file.size === 0) {
        return NextResponse.json(
          { success: false, error: "No file provided or file is empty" },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: "File too large (max 5MB)" },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: "Invalid type. Use JPEG, PNG, GIF, or WebP" },
          { status: 400 }
        );
      }
      buffer = Buffer.from(await file.arrayBuffer());
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      const base64 = body?.image;
      if (typeof base64 !== "string") {
        return NextResponse.json(
          { success: false, error: "JSON body must include 'image' (base64 string)" },
          { status: 400 }
        );
      }
      buffer = Buffer.from(base64, "base64");
      if (buffer.length === 0) {
        return NextResponse.json(
          { success: false, error: "Invalid base64 image" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Use multipart/form-data with 'file' or JSON with 'image' (base64)" },
        { status: 400 }
      );
    }

    const extractedText = await extractTextFromImage(buffer);

    return NextResponse.json({
      success: true,
      extractedText,
      length: extractedText.length,
      message:
        extractedText.length > 0
          ? "Vision API OK — text extracted (handwriting + printed)."
          : "Vision API responded but no text detected. Try a clearer image or ensure DOCUMENT_TEXT_DETECTION is enabled.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("POST /api/test-vision:", e);
    return NextResponse.json(
      {
        success: false,
        error: message,
        hint: "Check GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_VISION_API_KEY and that the Vision API is enabled.",
      },
      { status: 500 }
    );
  }
}
