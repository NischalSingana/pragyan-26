import { callLlmWithFallback } from "@/lib/aiClient";
import { EHR_SYSTEM_PROMPT } from "@/lib/ai/ehrPrompt";
import { parseEhrOutput } from "@/lib/ai/ehrParse";
import type { EhrStructuredData } from "@/lib/ai/ehrTypes";

/**
 * Extract structured medical entities from EHR/EMR document text using AI.
 * Returns structured data with optional source snippets for highlighting.
 */
export async function extractEhrFromText(documentText: string): Promise<EhrStructuredData> {
  if (!documentText.trim()) {
    return {
      symptoms: [],
      vitals: {},
      conditions: [],
      medications: [],
    };
  }

  const userMessage = `Extract clinical information from this document. Respond with only the JSON object.\n\n---\n${documentText.slice(0, 12000)}`;
  const raw = await callLlmWithFallback(EHR_SYSTEM_PROMPT, userMessage);
  return parseEhrOutput(raw);
}
