/**
 * Phase 8 — In-memory rate limit for /api/triage.
 * For production at scale, use Redis or similar.
 */

const TRIAGE_LIMIT = 60; // requests per window
const TRIAGE_WINDOW_MS = 60_000; // 1 minute

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(identifier: string): string {
  return `triage:${identifier}`;
}

/**
 * Check and consume one request. Returns true if allowed, false if rate limited.
 */
export function consumeTriageRateLimit(identifier: string): boolean {
  const key = getKey(identifier);
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + TRIAGE_WINDOW_MS });
    return true;
  }
  if (now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + TRIAGE_WINDOW_MS });
    return true;
  }
  if (entry.count >= TRIAGE_LIMIT) {
    return false;
  }
  entry.count++;
  return true;
}

/**
 * Get client identifier from request (IP or header).
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "anonymous";
}
