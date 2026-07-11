import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { designItems, designs, productClicks, products, purchaseOutcomes } from '../db/schema.js';
import { getRequestOwner } from '../lib/request-context.js';
import { refreshProductQualityRisk } from '../services/products/trust.js';

export const productsRouter = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const feedbackSchema = z.object({
  clickId: z.string().uuid(),
  purchased: z.boolean(),
  satisfied: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
}).superRefine((value, ctx) => {
  if (value.purchased && value.satisfied === undefined) {
    ctx.addIssue({ code: 'custom', path: ['satisfied'], message: 'Tell us whether you were happy with the purchase.' });
  }
});

function ownerCanAccessDesign(owner: Awaited<ReturnType<typeof getRequestOwner>>, design: typeof designs.$inferSelect): boolean {
  if (owner.authUserId) {
    return design.ownerAuthUserId === owner.authUserId || (!design.ownerAuthUserId && design.ownerSessionId === owner.sessionId);
  }
  return !design.ownerAuthUserId && design.ownerSessionId === owner.sessionId;
}

productsRouter.get('/track-click', async (c) => {
  const productId = c.req.query('id');
  const requestedDesignId = c.req.query('design_id');
  const requestedId = requestedDesignId && UUID_RE.test(requestedDesignId) ? requestedDesignId : null;

  if (!productId || !UUID_RE.test(productId)) {
    return c.text('missing product id', 400);
  }

  const [product] = await getDb().select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) {
    return c.text('not found', 404);
  }

  if (!product.productUrl) {
    return c.text('product link unavailable', 404);
  }

  let designId: string | null = null;
  if (requestedId) {
    const [matchedItem] = await getDb()
      .select({ id: designItems.id })
      .from(designItems)
      .where(and(eq(designItems.designId, requestedId), eq(designItems.productId, productId)))
      .limit(1);
    if (matchedItem) designId = requestedId;
  }

  await getDb().insert(productClicks).values({
    productId,
    designId,
  });

  return c.redirect(product.productUrl, 302);
});

productsRouter.post('/feedback', zValidator('json', feedbackSchema), async (c) => {
  const owner = await getRequestOwner(c);
  const payload = c.req.valid('json');
  const [click] = await getDb()
    .select({ click: productClicks, design: designs })
    .from(productClicks)
    .innerJoin(designs, eq(productClicks.designId, designs.id))
    .where(eq(productClicks.id, payload.clickId))
    .limit(1);

  if (!click) return c.json({ error: 'Tracked product click not found.' }, 404);
  if (!ownerCanAccessDesign(owner, click.design)) return c.json({ error: 'You do not have access to this feedback request.' }, 403);

  const [outcome] = await getDb()
    .insert(purchaseOutcomes)
    .values({
      productClickId: click.click.id,
      designId: click.design.id,
      ownerSessionId: owner.sessionId,
      ownerAuthUserId: owner.authUserId,
      productId: click.click.productId,
      purchased: payload.purchased,
      satisfied: payload.purchased ? payload.satisfied : null,
      notes: payload.notes || null,
    })
    .onConflictDoUpdate({
      target: purchaseOutcomes.productClickId,
      set: {
        purchased: payload.purchased,
        satisfied: payload.purchased ? payload.satisfied : null,
        notes: payload.notes || null,
        ownerSessionId: owner.sessionId,
        ownerAuthUserId: owner.authUserId,
      },
    })
    .returning();

  const trust = await refreshProductQualityRisk(click.click.productId);
  return c.json({
    feedback: {
      id: outcome.id,
      purchased: outcome.purchased,
      satisfied: outcome.satisfied,
      notes: outcome.notes,
      createdAt: outcome.createdAt.toISOString(),
    },
    trust,
  });
});
