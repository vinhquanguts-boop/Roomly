import { API_BASE_URL } from '@/lib/api';

export type Plan = 'free' | 'plus' | 'professional';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

export type UserSubscription = {
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  designsUsedThisMonth: number;
  designLimitThisMonth: number | null; // null = unlimited
  cancelAtPeriodEnd: boolean;
  billingEnabled: boolean;
};

export const PLAN_FEATURES: Record<
  Plan,
  {
    label: string;
    price: string;
    priceNote: string;
    designsPerMonth: number | null;
    allRetailers: boolean;
    renderImage: boolean;
    chatMessages: number | null; // null = unlimited
    canShare: boolean;
    priorityQueue: boolean;
    multiRoom: boolean;
    pdfExport: boolean;
    highlight?: string;
  }
> = {
  free: {
    label: 'Roomly',
    price: 'Free',
    priceNote: 'forever',
    designsPerMonth: 1,
    allRetailers: false,
    renderImage: false,
    chatMessages: 0,
    canShare: false,
    priorityQueue: false,
    multiRoom: false,
    pdfExport: false,
  },
  plus: {
    label: 'Roomly Plus',
    price: '$9.99',
    priceNote: 'AUD / month',
    designsPerMonth: 10,
    allRetailers: true,
    renderImage: true,
    chatMessages: 5,
    canShare: true,
    priorityQueue: false,
    multiRoom: false,
    pdfExport: false,
    highlight: 'Most popular',
  },
  professional: {
    label: 'Roomly Professional',
    price: '$29.99',
    priceNote: 'AUD / month',
    designsPerMonth: null,
    allRetailers: true,
    renderImage: true,
    chatMessages: null,
    canShare: true,
    priorityQueue: true,
    multiRoom: true,
    pdfExport: true,
    highlight: 'Best value',
  },
};

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const body = payload as { error?: string; code?: string } | null;
    throw new ApiError(body?.error ?? `Error ${res.status}`, body?.code);
  }
  return payload as T;
}

export async function getSubscription(): Promise<UserSubscription> {
  const res = await fetch(`${API_BASE_URL}/api/subscriptions/me`, {
    credentials: 'include',
  });
  return parseJson<UserSubscription>(res);
}

export async function createCheckoutSession(plan: 'plus' | 'professional'): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`${API_BASE_URL}/api/subscriptions/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  return parseJson<{ checkoutUrl: string }>(res);
}

export async function createPortalSession(): Promise<{ portalUrl: string }> {
  const res = await fetch(`${API_BASE_URL}/api/subscriptions/portal`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseJson<{ portalUrl: string }>(res);
}

export type UserStats = {
  designsThisMonth: number;
  designsRemaining: number | null;
  designsAllTime: number;
};

export async function getUserStats(): Promise<UserStats> {
  const res = await fetch(`${API_BASE_URL}/api/user/stats`, {
    credentials: 'include',
  });
  return parseJson<UserStats>(res);
}
