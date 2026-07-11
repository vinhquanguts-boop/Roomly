import * as Sentry from '@sentry/node';

export function initServerMonitoring(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VITE_APP_ENV || process.env.NODE_ENV || 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
  });
}

export function captureServerError(error: unknown, context: Record<string, string> = {}): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    scope.setContext('roomly', context);
    Sentry.captureException(error);
  });
}
