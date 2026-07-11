const CONSENT_KEY = 'roomly.analytics-consent.v1';
const VISITOR_KEY = 'roomly.analytics-visitor.v1';

export type AnalyticsEvent =
  | 'landing_view'
  | 'upload_start'
  | 'upload_complete'
  | 'analysis_complete'
  | 'plan_generated'
  | 'render_complete'
  | 'product_click'
  | 'design_saved'
  | 'design_shared'
  | 'chat_message_sent';

export function hasAnalyticsConsent(): boolean {
  return window.localStorage.getItem(CONSENT_KEY) === 'accepted';
}

export function setAnalyticsConsent(accepted: boolean): void {
  window.localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'declined');
}

function visitorId(): string {
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_KEY, next);
  return next;
}

export function trackEvent(event: AnalyticsEvent, properties: Record<string, string | number | boolean | null> = {}): void {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  if (!apiKey || !hasAnalyticsConsent()) return;

  const host = (import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/+$/g, '');
  void fetch(`${host}/capture/`, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      event,
      properties: {
        distinct_id: visitorId(),
        $current_url: window.location.href,
        ...properties,
      },
    }),
  }).catch(() => undefined);
}
