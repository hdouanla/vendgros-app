import { TRPCError } from "@trpc/server";

interface LogContext {
  path: string;
  type: string;
  userId?: string;
  duration: number;
  status: "success" | "error";
  errorCode?: string;
  timestamp: string;
}

/**
 * Structured logging for API requests
 */
export function loggerMiddleware() {
  return async (opts: {
    ctx: { session?: { user?: { id: string } } };
    path: string;
    type: string;
    next: () => Promise<unknown>;
  }) => {
    const startTime = Date.now();
    const context: LogContext = {
      path: opts.path,
      type: opts.type,
      userId: opts.ctx.session?.user?.id,
      duration: 0,
      status: "success",
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await opts.next();

      context.duration = Date.now() - startTime;
      context.status = "success";

      // Log successful requests (only in development or for slow queries)
      if (process.env.NODE_ENV === "development" || context.duration > 1000) {
        console.log(JSON.stringify({
          level: context.duration > 1000 ? "warn" : "info",
          message: `tRPC ${opts.type}: ${opts.path}`,
          ...context,
        }));
      }

      return result;
    } catch (error) {
      context.duration = Date.now() - startTime;
      context.status = "error";

      if (error instanceof TRPCError) {
        context.errorCode = error.code;

        // Only log unexpected errors
        const expectedCodes = ["UNAUTHORIZED", "NOT_FOUND", "BAD_REQUEST"];
        if (!expectedCodes.includes(error.code)) {
          console.error(JSON.stringify({
            level: "error",
            message: `tRPC ${opts.type}: ${opts.path}`,
            error: {
              code: error.code,
              message: error.message,
            },
            ...context,
          }));
        }
      } else {
        // Log all non-tRPC errors
        console.error(JSON.stringify({
          level: "error",
          message: `tRPC ${opts.type}: ${opts.path}`,
          error: {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          ...context,
        }));
      }

      throw error;
    }
  };
}

/**
 * Performance monitoring for slow queries
 */
export function performanceMonitor(thresholdMs: number = 1000) {
  return async (opts: {
    path: string;
    type: string;
    next: () => Promise<unknown>;
  }) => {
    const startTime = Date.now();

    const result = await opts.next();

    const duration = Date.now() - startTime;

    if (duration > thresholdMs) {
      console.warn(JSON.stringify({
        level: "warn",
        message: "Slow query detected",
        path: opts.path,
        type: opts.type,
        duration,
        threshold: thresholdMs,
        timestamp: new Date().toISOString(),
      }));
    }

    return result;
  };
}

/**
 * Database query logger (for Prisma middleware)
 */
export function createDatabaseLogger() {
  return async (params: any, next: (params: any) => Promise<any>) => {
    const startTime = Date.now();

    try {
      const result = await next(params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > 100) {
        console.warn(JSON.stringify({
          level: "warn",
          message: "Slow database query",
          model: params.model,
          action: params.action,
          duration,
          timestamp: new Date().toISOString(),
        }));
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(JSON.stringify({
        level: "error",
        message: "Database query failed",
        model: params.model,
        action: params.action,
        duration,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }));

      throw error;
    }
  };
}

/**
 * Request context logger
 */
export function logRequest(context: Record<string, any>) {
  console.log(JSON.stringify({
    level: "info",
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Error logger
 */
export function logError(error: Error, context?: Record<string, any>) {
  console.error(JSON.stringify({
    level: "error",
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Warning logger
 */
export function logWarning(message: string, context?: Record<string, any>) {
  console.warn(JSON.stringify({
    level: "warn",
    message,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}
