import * as Sentry from "@sentry/node";
import { TRPCError } from "@trpc/server";

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn("SENTRY_DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Error Sampling
    sampleRate: 1.0,

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive query params
      if (event.request?.query_string) {
        const params = new URLSearchParams(event.request.query_string);
        params.delete("token");
        params.delete("api_key");
        event.request.query_string = params.toString();
      }

      return event;
    },

    // Ignore expected errors
    ignoreErrors: [
      // Browser errors
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",

      // Network errors (expected in production)
      "NetworkError",
      "Failed to fetch",

      // Expected business logic errors
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
    ],

    integrations: [
      // HTTP instrumentation enabled by default in modern Sentry
      Sentry.httpIntegration({ tracing: true }),

      // Postgres integration
      Sentry.postgresIntegration(),
    ],
  });
}

/**
 * Sentry middleware for tRPC
 * Captures errors and adds context
 */
export function sentryMiddleware() {
  return async (opts: {
    ctx: any;
    path: string;
    type: string;
    next: () => Promise<unknown>;
  }) => {
    // Set user context if available
    if (opts.ctx.session?.user) {
      Sentry.setUser({
        id: opts.ctx.session.user.id,
        email: opts.ctx.session.user.email,
      });
    }

    // Add request context
    Sentry.setContext("trpc", {
      path: opts.path,
      type: opts.type,
    });

    try {
      const result = await opts.next();
      return result;
    } catch (error) {
      // Only capture unexpected errors in Sentry
      if (error instanceof TRPCError) {
        // Don't spam Sentry with expected errors (UNAUTHORIZED, NOT_FOUND, etc.)
        const expectedCodes = [
          "UNAUTHORIZED",
          "FORBIDDEN",
          "NOT_FOUND",
          "BAD_REQUEST",
        ];

        if (!expectedCodes.includes(error.code)) {
          Sentry.captureException(error, {
            contexts: {
              trpc: {
                path: opts.path,
                type: opts.type,
                code: error.code,
              },
            },
          });
        }
      } else {
        // Capture all non-tRPC errors
        Sentry.captureException(error, {
          contexts: {
            trpc: {
              path: opts.path,
              type: opts.type,
            },
          },
        });
      }

      throw error;
    } finally {
      Sentry.setUser(null); // Clear user context
    }
  };
}

/**
 * Manually capture an exception with context
 */
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Log a message to Sentry
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
}

/**
 * Create a breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}
