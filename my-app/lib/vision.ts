/**
 * Google Cloud Vision API — document text detection (handwriting + printed).
 * Supports:
 * 1. Service account: set GOOGLE_APPLICATION_CREDENTIALS to path to google_credentials.json
 * 2. API key: set GOOGLE_VISION_API_KEY
 */

const VISION_API = "https://vision.googleapis.com/v1/images:annotate";

async function extractWithServiceAccount(buffer: Buffer): Promise<string> {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!keyPath) return "";

  const { ImageAnnotatorClient } = await import("@google-cloud/vision");
  const client = new ImageAnnotatorClient({
    keyFilename: keyPath,
  });

  const [result] = await client.documentTextDetection({
    image: { content: buffer },
  });

  const text = result.fullTextAnnotation?.text;
  return typeof text === "string" ? text.trim() : "";
}

async function extractWithApiKey(buffer: Buffer): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey) return "";

  const base64 = buffer.toString("base64");
  const res = await fetch(`${VISION_API}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vision API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    responses?: Array<{
      fullTextAnnotation?: { text?: string };
      error?: { message?: string };
    }>;
  };

  const first = data.responses?.[0];
  if (first?.error) {
    throw new Error(first.error.message ?? "Vision API error");
  }

  const text = first?.fullTextAnnotation?.text;
  return typeof text === "string" ? text.trim() : "";
}

/**
 * Extract text from an image (handwriting + printed) using Google Vision.
 * Uses service account JSON if GOOGLE_APPLICATION_CREDENTIALS is set,
 * otherwise uses GOOGLE_VISION_API_KEY.
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const useCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const useApiKey = process.env.GOOGLE_VISION_API_KEY?.trim();

  if (!useCredentials && !useApiKey) {
    console.warn(
      "Neither GOOGLE_APPLICATION_CREDENTIALS nor GOOGLE_VISION_API_KEY set. Skipping Vision OCR."
    );
    return "";
  }

  if (useCredentials) {
    try {
      return await extractWithServiceAccount(buffer);
    } catch (e) {
      console.error("Vision (service account) failed:", e);
      if (useApiKey) {
        return await extractWithApiKey(buffer);
      }
      throw e;
    }
  }

  return await extractWithApiKey(buffer);
}
