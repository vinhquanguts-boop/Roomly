import { createClient, type RedisClientType } from 'redis';
import { logInfo, logWarning } from './logging.js';

type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

const buckets = new Map<string, number[]>();
let redisClient: RedisClientType | null = null;
let redisDisabled = false;

const RATE_LIMIT_SCRIPT = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
local count = redis.call('ZCARD', KEYS[1])
if count >= limit then
  local earliest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  return {0, tonumber(earliest[2])}
end
redis.call('ZADD', KEYS[1], now, member)
redis.call('PEXPIRE', KEYS[1], window)
return {1, now}
`;

async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || redisDisabled) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 1_000,
        reconnectStrategy: false,
      },
    });
    redisClient.on('error', () => undefined);
    try {
      await redisClient.connect();
      logInfo('redis_connected');
    } catch {
      redisDisabled = true;
      redisClient = null;
      logWarning('redis_unavailable_using_memory_fallback');
      return null;
    }
  }

  return redisClient;
}

function takeMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

export async function takeRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const redis = await getRedisClient();
  if (!redis) {
    return takeMemoryRateLimit(key, limit, windowMs);
  }

  const now = Date.now();
  try {
    const response = (await redis.eval(RATE_LIMIT_SCRIPT, {
      keys: [`roomly:rate-limit:${key}`],
      arguments: [String(now), String(windowMs), String(limit), crypto.randomUUID()],
    })) as [number, number];
    const allowed = response[0] === 1;
    const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((response[1] + windowMs - now) / 1000));

    if (!allowed) {
      logInfo('rate_limit_blocked', { scope: key.split(':')[0], retry_after_seconds: retryAfterSeconds });
    }
    return { allowed, retryAfterSeconds };
  } catch {
    redisDisabled = true;
    redisClient = null;
    logWarning('redis_rate_limit_failed_using_memory_fallback');
    return takeMemoryRateLimit(key, limit, windowMs);
  }
}

export function requestIp(forwardedFor: string | undefined, fallback = 'local'): string {
  return forwardedFor?.split(',')[0]?.trim() || fallback;
}
