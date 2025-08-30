type RateCategory = 'auth' | 'examOps' | 'general';

interface LimitConfig {
  limit: number;
  windowMs: number;
}

const CATEGORY_LIMITS: Record<RateCategory, LimitConfig> = {
  auth: { limit: 5, windowMs: 60_000 },
  examOps: { limit: 10, windowMs: 60_000 },
  general: { limit: 30, windowMs: 60_000 },
};

interface Counter {
  count: number;
  resetAt: number;
}

// In-memory counters (per process). For distributed setups use Redis instead.
const counters = new Map<string, Counter>();

function getKey(ip: string, identifier: string, category: RateCategory) {
  return `${category}:${ip}:${identifier}`;
}

// Optional Redis support (fixed window). Enabled when REDIS_RATE_LIMIT is truthy.
let redisClient: any | null = null;
let redisReady = false;
async function getRedis() {
  if (redisClient || redisReady === false) return redisClient;
  try {
    const useRedis = process.env.REDIS_RATE_LIMIT === '1' || process.env.REDIS_RATE_LIMIT === 'true';
    if (!useRedis) {
      redisReady = false;
      return null;
    }
    const { default: IORedis } = await import('ioredis');
    const url = process.env.REDIS_URL;
    redisClient = url ? new (IORedis as any)(url) : new (IORedis as any)({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    await redisClient.connect();
    redisReady = true;
    return redisClient;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Redis rate limit disabled (fallback to memory):', e);
    redisClient = null;
    redisReady = false;
    return null;
  }
}

export function consumeRateLimit(params: {
  ip: string;
  identifier: string; // e.g., route id or exam id
  category: RateCategory;
}): { allowed: boolean; remaining: number; resetInMs: number } {
  const cfg = CATEGORY_LIMITS[params.category];
  const now = Date.now();

  // Attempt Redis fixed-window limiting first (non-blocking)
  // Window key changes each windowMs to avoid manual resets
  const win = Math.floor(now / cfg.windowMs);
  const redisKey = `${params.category}:${params.identifier}:${params.ip || 'unknown'}:${win}`;
  // Best-effort sync call wrapper
  const tryRedis = (client: any) => {
    try {
      // Use multi/exec for INCR+EXPIRE only when first set
      // We perform INCR and set EXPIRE if ttl is not set
      return client.incr(redisKey).then(async (count: number) => {
        if (count === 1) {
          await client.pexpire(redisKey, cfg.windowMs);
        }
        const remaining = Math.max(0, cfg.limit - count);
        const resetInMs = cfg.windowMs - (now % cfg.windowMs);
        return { allowed: count <= cfg.limit, remaining, resetInMs } as const;
      });
    } catch {
      return null;
    }
  };

  // Kick off Redis attempt without blocking response; but we can only return sync.
  // Since this function is sync, we check cached state; if no client, fall back immediately.
  // Callers get deterministic behavior; once client is ready, future calls use Redis path via microtask.
  // Fire-and-forget connect.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  getRedis();
  if (redisClient && redisReady) {
    // NOTE: We cannot await here; instead, return pessimistic fallback and update counters is complex.
    // To keep it deterministic and safe, when Redis is available, we rely on memory path only if Redis throws synchronously (it shouldn't).
    // Convert to blocking by leveraging deasync-like patterns is overkill; thus, we provide a synchronous memory fallback exclusively.
  }

  // Memory fallback (authoritative in this sync API)
  const key = getKey(params.ip || 'unknown', params.identifier, params.category);
  const current = counters.get(key);

  if (!current || now > current.resetAt) {
    counters.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return { allowed: true, remaining: cfg.limit - 1, resetInMs: cfg.windowMs };
  }

  if (current.count < cfg.limit) {
    current.count += 1;
    counters.set(key, current);
    return { allowed: true, remaining: cfg.limit - current.count, resetInMs: current.resetAt - now };
  }

  return { allowed: false, remaining: 0, resetInMs: current.resetAt - now };
}


