# API Middleware

This directory contains middleware modules for the Vendgros tRPC API, providing production-grade features like rate limiting, error tracking, logging, and performance monitoring.

## Modules

### Rate Limiting (`rate-limit.ts`)

Protects API endpoints from abuse using Redis-based sliding window rate limiting.

**Features:**
- User-based rate limiting (by session)
- IP-based rate limiting (for unauthenticated requests)
- Sliding window algorithm for accurate limits
- Configurable thresholds per endpoint
- Graceful degradation if Redis is unavailable

**Usage:**
```typescript
import { strictRateLimit, standardRateLimit } from "./middleware/rate-limit";

// Apply strict limits to sensitive operations
export const updatePassword = protectedProcedure
  .use(strictRateLimit) // 10 requests/minute
  .mutation(async ({ ctx, input }) => {
    // ...
  });

// Standard limits for normal operations
export const getListings = protectedProcedure
  .use(standardRateLimit) // 60 requests/minute
  .query(async ({ ctx }) => {
    // ...
  });
```

**Rate Limit Tiers:**
- `strictRateLimit`: 10 req/min (for password changes, account modifications)
- `standardRateLimit`: 60 req/min (default for authenticated endpoints)
- `generousRateLimit`: 300 req/min (for read-heavy operations)
- `publicRateLimit`: 100 req/min per IP (for unauthenticated endpoints)

**Environment Variables:**
- `REDIS_URL` - Redis connection string (required)

---

### Error Tracking (`sentry.ts`)

Integrates Sentry for error monitoring and performance tracking in production.

**Features:**
- Automatic error capturing with context
- Performance transaction tracking
- User context enrichment
- Sensitive data filtering
- Expected error filtering (doesn't spam Sentry with 404s, etc.)

**Usage:**
```typescript
import { initSentry, captureError } from "./middleware/sentry";

// Initialize once at app startup
initSentry();

// Manually capture errors with context
try {
  await riskyOperation();
} catch (error) {
  captureError(error, {
    operation: "riskyOperation",
    userId: ctx.session.user.id,
  });
  throw error;
}
```

**Environment Variables:**
- `SENTRY_DSN` - Sentry project DSN (required for error tracking)
- `NODE_ENV` - Environment (production/development/staging)
- `npm_package_version` - App version for release tracking

**Ignored Errors:**
- `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND` (expected business logic errors)
- Browser errors (ResizeObserver, network failures)

---

### Logging (`logger.ts`)

Structured JSON logging for API requests, errors, and performance.

**Features:**
- Structured JSON logs (easy to parse with log aggregators)
- Request/response timing
- Slow query detection
- Error context tracking
- Database query logging

**Log Format:**
```json
{
  "level": "info",
  "message": "tRPC query: listing.getById",
  "path": "listing.getById",
  "type": "query",
  "userId": "clx123...",
  "duration": 45,
  "status": "success",
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

**Usage:**
```typescript
import { logError, logWarning } from "./middleware/logger";

// Log errors with context
logError(new Error("Database connection failed"), {
  database: "vendgros-prod",
  attempt: 3,
});

// Log warnings
logWarning("Approaching rate limit", {
  userId: ctx.session.user.id,
  requests: 55,
  limit: 60,
});
```

**Performance Thresholds:**
- Queries > 1000ms: Warning logged
- Queries > 100ms (database): Warning logged

---

## Integration

The middleware is automatically applied to all tRPC procedures via `trpc.ts`:

```typescript
import { loggerMiddleware, performanceMonitor } from "./middleware/logger";
import { sentryMiddleware } from "./middleware/sentry";
import { standardRateLimit, publicRateLimit } from "./middleware/rate-limit";

// Public procedures
export const publicProcedure = t.procedure
  .use(loggingMiddleware)
  .use(sentryMiddleware)
  .use(performanceMiddleware)
  .use(publicRateLimit);

// Protected procedures
export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(sentryMiddleware)
  .use(performanceMiddleware)
  .use(standardRateLimit)
  .use(authMiddleware);
```

## Monitoring

### Rate Limit Monitoring

Check Redis for rate limit keys:
```bash
redis-cli --pattern "rate-limit:*"
```

### Sentry Dashboard

View errors and performance: https://sentry.io/organizations/vendgros/

### Log Analysis

Parse JSON logs with jq:
```bash
# Find slow queries
cat api.log | jq 'select(.duration > 1000)'

# Error rate by endpoint
cat api.log | jq -r 'select(.status == "error") | .path' | sort | uniq -c

# Average response time
cat api.log | jq '.duration' | awk '{sum+=$1; count++} END {print sum/count}'
```

## Performance

### Redis Connection Pooling

The rate limiter uses ioredis with default connection pooling. Monitor connections:
```bash
redis-cli INFO clients
```

### Middleware Order

Middleware is executed in order. Current stack:
1. **Logging** - Start timer, log request
2. **Sentry** - Start transaction
3. **Performance** - Warn on slow queries
4. **Rate Limit** - Check limits (fails fast if exceeded)
5. **Auth** - Verify session
6. **Business Logic** - Your procedure code

This order ensures:
- Rate limiting happens early (prevents wasted processing)
- Logging captures all requests (even rate limited ones)
- Sentry captures all errors (including rate limit errors)

## Configuration

### Environment Variables

```bash
# Redis (required for rate limiting)
REDIS_URL="redis://localhost:6379"

# Sentry (optional but recommended for production)
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
NODE_ENV="production"

# Performance
SLOW_QUERY_THRESHOLD_MS=1000  # Warn on queries > 1s
```

### Customizing Rate Limits

Create custom rate limiters:
```typescript
import { createRateLimiter } from "./middleware/rate-limit";

export const customRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  message: "Custom rate limit exceeded",
});
```

## Testing

### Disable Middleware in Tests

```typescript
// In test setup
process.env.REDIS_URL = ""; // Disable rate limiting
process.env.SENTRY_DSN = ""; // Disable Sentry
```

### Mock Redis

```typescript
import RedisMock from "ioredis-mock";

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => new RedisMock());
});
```

## Troubleshooting

### Rate Limit Not Working

- Check Redis connection: `redis-cli PING`
- Verify `REDIS_URL` environment variable
- Check Redis memory: `redis-cli INFO memory`

### Sentry Not Capturing Errors

- Verify `SENTRY_DSN` is set
- Check Sentry project settings
- Look for console warning: "SENTRY_DSN not configured"

### Slow Performance

- Check middleware order (rate limit should be early)
- Monitor slow queries in logs
- Review database indexes
- Consider caching frequently accessed data

## Best Practices

1. **Rate Limiting**
   - Apply strictest limits to sensitive operations
   - Use generous limits for read operations
   - Monitor rate limit hits (indicates abuse or need for adjustment)

2. **Error Tracking**
   - Don't capture expected errors (404, 401, etc.)
   - Add context to manual error captures
   - Set up Sentry alerts for critical errors

3. **Logging**
   - Use structured logging (JSON format)
   - Include user IDs for debugging
   - Log timestamps in ISO format
   - Don't log sensitive data (passwords, tokens, etc.)

4. **Performance**
   - Monitor slow query logs
   - Add database indexes for common queries
   - Cache expensive operations with Redis
   - Use connection pooling

## Security

- Rate limiting prevents brute force attacks
- Sentry filters sensitive data (auth headers, cookies)
- Logs should be stored securely
- Redis should require authentication in production

## Further Reading

- [tRPC Middleware Documentation](https://trpc.io/docs/server/middlewares)
- [Sentry Node.js SDK](https://docs.sentry.io/platforms/node/)
- [Redis Rate Limiting](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)
