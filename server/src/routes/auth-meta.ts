import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { designs } from '../db/schema.js';
import { getRequestOwner } from '../lib/request-context.js';

export const authMetaRouter = new Hono();

authMetaRouter.get('/config', (c) =>
  c.json({
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  })
);

authMetaRouter.post('/migrate-anonymous', async (c) => {
  const owner = await getRequestOwner(c);

  if (!owner.authUserId) {
    return c.json({ error: 'Sign in before migrating saved designs.' }, 401);
  }

  const migrated = await getDb()
    .update(designs)
    .set({
      ownerAuthUserId: owner.authUserId,
      ownerSessionId: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(designs.ownerSessionId, owner.sessionId),
        isNotNull(designs.savedAt),
        isNull(designs.ownerAuthUserId)
      )
    )
    .returning({ id: designs.id });

  return c.json({ migrated: migrated.length });
});
