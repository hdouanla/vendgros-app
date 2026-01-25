/**
 * Middleware exports for tRPC
 *
 * This module exports all middleware functions used to enhance
 * API endpoints with logging, monitoring, rate limiting, and error tracking.
 */

export {
  strictRateLimit,
  standardRateLimit,
  generousRateLimit,
  publicRateLimit,
  isRedisConfigured,
} from "./rate-limit";

export {
  initSentry,
  sentryMiddleware,
  captureError,
  captureMessage,
  addBreadcrumb,
} from "./sentry";

export {
  loggerMiddleware,
  performanceMonitor,
  createDatabaseLogger,
  logRequest,
  logError,
  logWarning,
} from "./logger";
