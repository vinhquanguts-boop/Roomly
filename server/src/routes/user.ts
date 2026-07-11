import { and, eq, gte } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { designs } from '../db/schema.js';
import { getRequestOwner } from '../lib/request-context.js';
import { getPlanLimits, getEffectivePlan, isAuthenticatedOwner } from '../lib/entitlements.js';

export const userRouter = new Hono();

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

userRouter.get('/stats', async (c) => {
  const owner = await getRequestOwner(c);
  if (!isAuthenticatedOwner(owner)) {
    return c.json({ code: 'AUTH_REQUIRED', error: 'Please sign in to view account statistics.' }, 401);
  }
  const ownerFilter = owner.authUserId
    ? eq(designs.ownerAuthUserId, owner.authUserId)
    : eq(designs.ownerSessionId, owner.sessionId);

  const allTime = await getDb().select({ id: designs.id }).from(designs).where(ownerFilter);
  const thisMonth = await getDb()
    .select({ id: designs.id })
    .from(designs)
    .where(and(ownerFilter, gte(designs.createdAt, startOfCurrentMonth())));

  const limit = getPlanLimits(getEffectivePlan(owner)).designsPerMonth;
  return c.json({
    designsThisMonth: thisMonth.length,
    designsRemaining: limit === null ? null : Math.max(limit - thisMonth.length, 0),
    designsAllTime: allTime.length,
  });
});
