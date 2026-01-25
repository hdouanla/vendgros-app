import { Redis } from "@upstash/redis";

// Create Redis client for caching
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export const isCacheEnabled = redis !== null;

type CacheTTL = {
  /** Time-to-live in seconds */
  ttl: number;
};

/**
 * Cache wrapper with automatic serialization
 *
 * @example
 * const data = await cache.get("my-key", async () => {
 *   return await expensiveQuery();
 * }, { ttl: 3600 });
 */
export const cache = {
  /**
   * Get cached value or fetch and cache it
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheTTL,
  ): Promise<T> {
    if (!redis) {
      return fetcher();
    }

    try {
      // Try to get from cache
      const cached = await redis.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Fetch fresh data
      const data = await fetcher();

      // Cache it (don't await, fire and forget)
      redis.set(key, data, { ex: options.ttl }).catch((err) => {
        console.error("Cache set failed:", err);
      });

      return data;
    } catch (error) {
      console.error("Cache get failed:", error);
      // Fallback to fetcher on any cache error
      return fetcher();
    }
  },

  /**
   * Invalidate a cache key
   */
  async invalidate(key: string): Promise<void> {
    if (!redis) return;

    try {
      await redis.del(key);
    } catch (error) {
      console.error("Cache invalidate failed:", error);
    }
  },

  /**
   * Invalidate multiple keys by pattern prefix
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    if (!redis) return;

    try {
      // Scan for keys with prefix and delete them
      let cursor = 0;
      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: `${prefix}*`,
          count: 100,
        });
        cursor = Number(nextCursor);

        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== 0);
    } catch (error) {
      console.error("Cache invalidate prefix failed:", error);
    }
  },
};

// Cache key builders for consistency
export const cacheKeys = {
  featuredListings: (limit: number) => `listings:featured:${limit}`,
  latestListings: (limit: number) => `listings:latest:${limit}`,
  categoryCounts: () => "listings:category-counts",
};

// TTL constants (in seconds)
export const cacheTTL = {
  /** 1 hour - for data that changes infrequently */
  LONG: 3600,
  /** 15 minutes - for data that changes moderately */
  MEDIUM: 900,
  /** 5 minutes - for data that changes frequently */
  SHORT: 300,
};
