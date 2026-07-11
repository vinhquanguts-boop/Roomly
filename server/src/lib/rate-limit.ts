type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

const buckets = new Map<string, number[]>();

/** Local fallback for launch-prep limits. Replace with Upstash by setting credentials at deployment. */
export function takeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const active = (buckets.get(key) ?? []).filter((timestamp) => timestamp > now - windowMs);
  if (active.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((active[0] + windowMs - now) / 1000));
    buckets.set(key, active);
    return { allowed: false, retryAfterSeconds };
  }
  active.push(now);
  buckets.set(key, active);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function requestIp(forwardedFor: string | undefined, fallback = 'local'): string {
  return forwardedFor?.split(',')[0]?.trim() || fallback;
}
