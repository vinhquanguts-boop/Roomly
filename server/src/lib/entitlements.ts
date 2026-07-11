import { and, eq, gte } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { designs } from '../db/schema.js';
import type { RequestOwner } from './request-context.js';

export type Plan = 'free' | 'plus' | 'professional';

export const PLAN_LIMITS: Record<Plan, {
  designsPerMonth: number | null;
  chatMessagesPerDesign: number | null;
  allowedRetailers: string[];
  canShare: boolean;
  canRender: boolean;
}> = {
  free: {
    designsPerMonth: 1,
    chatMessagesPerDesign: 0,
    allowedRetailers: ['Kmart', 'AliExpress'],
    canShare: false,
    canRender: false,
  },
  plus: {
    designsPerMonth: 10,
    chatMessagesPerDesign: 5,
    allowedRetailers: ['Kmart', 'AliExpress', 'Amazon', 'IKEA', 'Taobao'],
    canShare: true,
    canRender: true,
  },
  professional: {
    designsPerMonth: null,
    chatMessagesPerDesign: null,
    allowedRetailers: ['Kmart', 'AliExpress', 'Amazon', 'IKEA', 'Taobao'],
    canShare: true,
    canRender: true,
  },
};

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function getDevelopmentPlan(): Plan {
  if (process.env.NODE_ENV === 'production') return 'free';
  const configured = process.env.ROOMLY_DEV_PLAN;
  return configured === 'plus' || configured === 'professional' ? configured : 'free';
}

function ownerFilter(owner: RequestOwner) {
  return owner.authUserId
    ? eq(designs.ownerAuthUserId, owner.authUserId)
    : eq(designs.ownerSessionId, owner.sessionId);
}

export function getEffectivePlan(owner: RequestOwner): Plan {
  // Paid subscription persistence is intentionally deferred until Stripe is configured.
  void owner;
  return getDevelopmentPlan();
}

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

export async function getDesignUsage(owner: RequestOwner) {
  const rows = await getDb()
    .select({ id: designs.id })
    .from(designs)
    .where(and(ownerFilter(owner), gte(designs.createdAt, startOfCurrentMonth())));
  return rows.length;
}

export async function getSubscriptionSnapshot(owner: RequestOwner) {
  const plan = getEffectivePlan(owner);
  const limits = getPlanLimits(plan);
  const designsUsedThisMonth = await getDesignUsage(owner);

  return {
    plan,
    status: 'active' as const,
    currentPeriodEnd: null,
    designsUsedThisMonth,
    designLimitThisMonth: limits.designsPerMonth,
    cancelAtPeriodEnd: false,
    billingEnabled: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
  };
}

export function planLimitError() {
  return {
    code: 'PLAN_LIMIT_REACHED' as const,
    requiredPlan: 'plus' as const,
    error: 'You have used your monthly design allowance. Upgrade to create another design.',
  };
}

export function planFeatureError(feature: string, requiredPlan: Plan = 'plus') {
  return {
    code: 'PLAN_FEATURE_LOCKED' as const,
    feature,
    requiredPlan,
    error: `${feature} is available on Roomly ${requiredPlan === 'plus' ? 'Plus' : 'Professional'} and above.`,
  };
}

export function isPlanLimitReached(plan: Plan, usage: number): boolean {
  const limit = PLAN_LIMITS[plan].designsPerMonth;
  return limit !== null && usage >= limit;
}

export function isAuthenticatedOwner(owner: RequestOwner): boolean {
  return Boolean(owner.authUserId);
}
