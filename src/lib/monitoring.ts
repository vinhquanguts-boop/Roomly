type SentryModule = typeof import('@sentry/react');

let sentryLoader: Promise<SentryModule | null> | null = null;

function loadSentry(): Promise<SentryModule | null> {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return Promise.resolve(null);
  }

  if (!sentryLoader) {
    sentryLoader = import('@sentry/react').catch(() => null);
  }

  return sentryLoader;
}

export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  void loadSentry().then((Sentry) => {
    Sentry?.init({
      dsn,
      environment: import.meta.env.VITE_APP_ENV || 'development',
      sendDefaultPii: false,
      tracesSampleRate: 0.05,
    });
  });
}

export function reportClientError(error: unknown, context?: Record<string, string>): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  void loadSentry().then((Sentry) => {
    Sentry?.withScope((scope) => {
      if (context) scope.setContext('roomly', context);
      Sentry.captureException(error);
    });
  });
}
