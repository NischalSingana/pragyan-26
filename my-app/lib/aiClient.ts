import type { TriageInput, TriageOutput } from "@/lib/ai/types";
import { buildTriageUserMessage, getSystemPrompt } from "@/lib/ai/prompt";
import { parseTriageOutput } from "@/lib/ai/parse";
import { applySafetyOverride } from "@/lib/ai/safety";
import type { TriageResult } from "@/lib/ai/types";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";

type ProviderName = "groq1" | "groq2" | "openrouter1" | "openrouter2";

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Groq returned empty or invalid response");
  }
  return content;
}

async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned empty or invalid response");
  }
  return content;
}

async function getRawFromProvider(
  provider: ProviderName,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const groq1 = process.env.GROQ_API_KEY_1;
  const groq2 = process.env.GROQ_API_KEY_2;
  const openRouter1 = process.env.OPENROUTER_API_KEY_1;
  const openRouter2 = process.env.OPENROUTER_API_KEY_2;

  switch (provider) {
    case "groq1":
      if (!groq1) throw new Error("GROQ_API_KEY_1 not configured");
      return callGroq(groq1, systemPrompt, userMessage);
    case "groq2":
      if (!groq2) throw new Error("GROQ_API_KEY_2 not configured");
      return callGroq(groq2, systemPrompt, userMessage);
    case "openrouter1":
      if (!openRouter1) throw new Error("OPENROUTER_API_KEY_1 not configured");
      return callOpenRouter(openRouter1, systemPrompt, userMessage);
    case "openrouter2":
      if (!openRouter2) throw new Error("OPENROUTER_API_KEY_2 not configured");
      return callOpenRouter(openRouter2, systemPrompt, userMessage);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function tryProvider(
  provider: ProviderName,
  systemPrompt: string,
  userMessage: string
): Promise<TriageOutput> {
  const raw = await getRawFromProvider(provider, systemPrompt, userMessage);
  return parseTriageOutput(raw);
}

/**
 * Call LLM with fallback (Groq 1 → Groq 2 → OpenRouter 1 → OpenRouter 2).
 * Returns raw response text. Used by triage and EHR extraction.
 */
export async function callLlmWithFallback(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  let lastError: Error | null = null;
  for (const provider of FALLBACK_ORDER) {
    try {
      return await getRawFromProvider(provider, systemPrompt, userMessage);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError ?? new Error("All AI providers failed");
}

const FALLBACK_ORDER: ProviderName[] = [
  "groq1",
  "groq2",
  "openrouter1",
  "openrouter2",
];

/**
 * Run AI triage with fallback: Groq 1 → Groq 2 → OpenRouter 1 → OpenRouter 2.
 * Applies safety override (chest pain + high BP → HIGH risk).
 * @throws if all providers fail or no keys are configured
 */
export async function runTriage(input: TriageInput): Promise<TriageResult> {
  const systemPrompt = getSystemPrompt();
  const userMessage = buildTriageUserMessage(input);

  let lastError: Error | null = null;
  for (const provider of FALLBACK_ORDER) {
    try {
      const output = await tryProvider(provider, systemPrompt, userMessage);
      return applySafetyOverride(input, output);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }

  throw lastError ?? new Error("All AI providers failed");
}
