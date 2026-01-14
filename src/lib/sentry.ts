import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error monitoring
 * Configure VITE_SENTRY_DSN in your .env file to enable
 */
export function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (!dsn) {
        console.log("[Sentry] DSN not configured, error monitoring disabled");
        return;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE,

        // Performance Monitoring
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

        // Session Replay (optional)
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Only send errors in production
        enabled: import.meta.env.PROD,

        // Filter out common non-actionable errors
        ignoreErrors: [
            "ResizeObserver loop limit exceeded",
            "ResizeObserver loop completed with undelivered notifications",
            "Non-Error promise rejection captured",
            "Network request failed",
            "Load failed",
        ],

        // Add user context
        beforeSend(event) {
            // Remove sensitive data if needed
            if (event.request?.headers) {
                delete event.request.headers["Authorization"];
            }
            return event;
        },
    });

    console.log("[Sentry] Error monitoring initialized");
}

/**
 * Capture custom error with context
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
    Sentry.captureException(error, {
        extra: context,
    });
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, email?: string) {
    Sentry.setUser({
        id: userId,
        email,
    });
}

/**
 * Clear user context on logout
 */
export function clearSentryUser() {
    Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: "info",
    });
}

export { Sentry };
