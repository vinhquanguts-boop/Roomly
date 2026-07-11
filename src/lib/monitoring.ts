import * as Sentry from '@sentry/react';

export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
  });
}

export function reportClientError(error: unknown, context?: Record<string, string>): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context) scope.setContext('roomly', context);
    Sentry.captureException(error);
  });
}
