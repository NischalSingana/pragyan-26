/**
 * Extract plain text from a PDF buffer.
 * Sets pdfjs worker path (file:// URL) so fake-worker dynamic import resolves in Node/Next.js.
 */

import path from "path";
import { pathToFileURL } from "url";

let workerSrcSet = false;

function getWorkerFileUrl(): string | null {
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs"
  );
  try {
    const fs = require("fs");
    if (fs.existsSync(workerPath)) {
      return pathToFileURL(workerPath).href;
    }
  } catch {
    //
  }
  return null;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const { PDFParse } = pdfParse;

    if (!workerSrcSet) {
      const workerUrl = getWorkerFileUrl();
      if (workerUrl) {
        PDFParse.setWorker(workerUrl);
      }
      workerSrcSet = true;
    }

    const data = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
    const parser = new PDFParse({
      data,
      verbosity: 0,
      disableFontFace: true,
    });
    const result = await parser.getText();
    await parser.destroy();
    const text = typeof result?.text === "string" ? result.text.trim() : "";
    return text;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("PDF text extraction failed:", err.message);
    throw err;
  }
}
