import { TRPCError } from "@trpc/server";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
}

/**
 * Rate limiting middleware using Redis sliding window
 *
 * @param config - Rate limit configuration
 * @returns Middleware function that enforces rate limits
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (opts: { ctx: { session?: { user?: { id: string } } }; next: () => Promise<unknown> }) => {
    const userId = opts.ctx.session?.user?.id;

    // Skip rate limiting for unauthenticated requests (handled separately)
    if (!userId) {
      return opts.next();
    }

    const key = `rate-limit:${userId}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis sorted set with timestamps as scores
      await redis
        .multi()
        // Remove old entries outside the window
        .zremrangebyscore(key, 0, windowStart)
        // Add current request
        .zadd(key, now, `${now}`)
        // Count requests in current window
        .zcard(key)
        // Set expiry on the key
        .expire(key, Math.ceil(config.windowMs / 1000))
        .exec();

      // Get count from the multi results
      const multi = await redis
        .multi()
        .zcard(key)
        .exec();

      const count = multi?.[0]?.[1] as number || 0;

      if (count > config.maxRequests) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: config.message || `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
        });
      }

      return opts.next();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      // If Redis fails, log error but allow request (fail open)
      console.error("Rate limit check failed:", error);
      return opts.next();
    }
  };
}

/**
 * Stricter rate limit for sensitive operations
 */
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: "Too many requests. Please try again in a minute.",
});

/**
 * Standard rate limit for normal operations
 */
export const standardRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: "Rate limit exceeded. Please slow down.",
});

/**
 * Generous rate limit for read operations
 */
export const generousRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 300,
});

/**
 * IP-based rate limiting for unauthenticated endpoints
 */
export function createIpRateLimiter(config: RateLimitConfig) {
  return async (opts: {
    ctx: { req?: { headers?: { "x-forwarded-for"?: string }; ip?: string } };
    next: () => Promise<unknown>;
  }) => {
    // Get IP from headers (behind proxy) or direct connection
    const ip =
      opts.ctx.req?.headers?.["x-forwarded-for"]?.split(",")[0] ||
      opts.ctx.req?.ip ||
      "unknown";

    if (ip === "unknown") {
      return opts.next();
    }

    const key = `rate-limit:ip:${ip}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      await redis
        .multi()
        .zremrangebyscore(key, 0, windowStart)
        .zadd(key, now, `${now}`)
        .zcard(key)
        .expire(key, Math.ceil(config.windowMs / 1000))
        .exec();

      const multi = await redis.multi().zcard(key).exec();
      const count = (multi?.[0]?.[1] as number) || 0;

      if (count > config.maxRequests) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            config.message ||
            `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
        });
      }

      return opts.next();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      // Fail open if Redis is unavailable
      console.error("IP rate limit check failed:", error);
      return opts.next();
    }
  };
}

/**
 * Aggressive rate limit for public/unauthenticated endpoints
 */
export const publicRateLimit = createIpRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: "Too many requests from your IP. Please try again later.",
});
