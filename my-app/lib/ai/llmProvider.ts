/**
 * Low-level LLM calls with exponential retry and latency logging.
 * Phase 8 — Production hardening.
 */

const GROQ_BASE = "https://api.groq.com/openai/v1";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";

export type ProviderName = "groq1" | "groq2" | "openrouter1" | "openrouter2";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function getApiKey(provider: ProviderName): string | undefined {
  switch (provider) {
    case "groq1":
      return process.env.GROQ_API_KEY_1;
    case "groq2":
      return process.env.GROQ_API_KEY_2;
    case "openrouter1":
      return process.env.OPENROUTER_API_KEY_1;
    case "openrouter2":
      return process.env.OPENROUTER_API_KEY_2;
    default:
      return undefined;
  }
}

/**
 * Call one provider with exponential backoff. Logs latency.
 */
export async function callProvider(
  provider: ProviderName,
  systemPrompt: string,
  userMessage: string
): Promise<{ raw: string; latencyMs: number }> {
  const apiKey = getApiKey(provider);
  if (!apiKey) throw new Error(`${provider} not configured`);

  const start = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const raw =
        provider.startsWith("groq")
          ? await callGroq(apiKey, systemPrompt, userMessage)
          : await callOpenRouter(apiKey, systemPrompt, userMessage);
      const latencyMs = Date.now() - start;
      return { raw, latencyMs };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  throw lastError ?? new Error("Provider failed after retries");
}

export const FALLBACK_ORDER: ProviderName[] = [
  "groq1",
  "groq2",
  "openrouter1",
  "openrouter2",
];
