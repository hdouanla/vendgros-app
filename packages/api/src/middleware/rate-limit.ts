import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create Redis client - uses HTTP, no connection overhead
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Check if Redis is configured
const isRedisConfigured = redis !== null;

/**
 * Create an Upstash rate limiter with sliding window algorithm
 */
function createUpstashRateLimiter(config: {
  requests: number;
  window: `${number} s` | `${number} m` | `${number} h`;
  prefix: string;
}) {
  if (!redis) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `ratelimit:${config.prefix}`,
    analytics: true,
  });
}

// Pre-configured rate limiters
const strictLimiter = createUpstashRateLimiter({
  requests: 10,
  window: "1 m",
  prefix: "strict",
});

const standardLimiter = createUpstashRateLimiter({
  requests: 60,
  window: "1 m",
  prefix: "standard",
});

const generousLimiter = createUpstashRateLimiter({
  requests: 300,
  window: "1 m",
  prefix: "generous",
});

const publicLimiter = createUpstashRateLimiter({
  requests: 100,
  window: "1 m",
  prefix: "public",
});

interface RateLimitMiddlewareOpts {
  ctx: { session?: { user?: { id?: string } }; req?: { headers?: Record<string, string>; ip?: string } };
  next: () => Promise<unknown>;
}

/**
 * Create rate limit middleware using Upstash Ratelimit
 */
function createRateLimitMiddleware(
  limiter: Ratelimit | null,
  getMessage: (limit: number) => string,
) {
  return async (opts: RateLimitMiddlewareOpts) => {
    const userId = opts.ctx.session?.user?.id;

    // Skip if no user or Redis not configured
    if (!userId || !limiter) {
      return opts.next();
    }

    try {
      const { success, limit, remaining, reset } = await limiter.limit(userId);

      if (!success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: getMessage(limit),
        });
      }

      return opts.next();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      // Fail open if Redis errors
      console.error("Rate limit check failed:", error);
      return opts.next();
    }
  };
}

/**
 * Stricter rate limit for sensitive operations (10 req/min)
 */
export const strictRateLimit = createRateLimitMiddleware(
  strictLimiter,
  (limit) => `Too many requests. Maximum ${limit} requests per minute.`,
);

/**
 * Standard rate limit for normal operations (60 req/min)
 */
export const standardRateLimit = createRateLimitMiddleware(
  standardLimiter,
  (limit) => `Rate limit exceeded. Maximum ${limit} requests per minute.`,
);

/**
 * Generous rate limit for read operations (300 req/min)
 */
export const generousRateLimit = createRateLimitMiddleware(
  generousLimiter,
  (limit) => `Rate limit exceeded. Maximum ${limit} requests per minute.`,
);

/**
 * IP-based rate limiting for unauthenticated endpoints
 */
export const publicRateLimit = async (opts: RateLimitMiddlewareOpts) => {
  if (!publicLimiter) {
    return opts.next();
  }

  // Get IP from headers (behind proxy) or direct connection
  const ip =
    opts.ctx.req?.headers?.["x-forwarded-for"]?.split(",")[0] ||
    opts.ctx.req?.ip ||
    "unknown";

  if (ip === "unknown") {
    return opts.next();
  }

  try {
    const { success, limit } = await publicLimiter.limit(ip);

    if (!success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many requests from your IP. Maximum ${limit} requests per minute.`,
      });
    }

    return opts.next();
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    // Fail open if Redis errors
    console.error("IP rate limit check failed:", error);
    return opts.next();
  }
};

// Export for checking if rate limiting is active
export { isRedisConfigured };
