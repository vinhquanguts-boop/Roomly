import { and, asc, desc, eq, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { designs, productClicks, products, purchaseOutcomes } from '../db/schema.js';
import { serializeDashboardDesign } from '../lib/design-serialization.js';
import { getRequestOwner } from '../lib/request-context.js';

export const dashboardRouter = new Hono();

function ownershipFilter(owner: Awaited<ReturnType<typeof getRequestOwner>>) {
  return owner.authUserId
    ? or(
        eq(designs.ownerAuthUserId, owner.authUserId),
        and(isNull(designs.ownerAuthUserId), eq(designs.ownerSessionId, owner.sessionId))
      )
    : and(isNull(designs.ownerAuthUserId), eq(designs.ownerSessionId, owner.sessionId));
}

dashboardRouter.get('/designs', async (c) => {
  const owner = await getRequestOwner(c);
  const savedDesigns = await getDb()
    .select()
    .from(designs)
    .where(and(isNotNull(designs.savedAt), ownershipFilter(owner)))
    .orderBy(desc(designs.savedAt), desc(designs.updatedAt));

  return c.json({
    designs: await Promise.all(savedDesigns.map(serializeDashboardDesign)),
  });
});

dashboardRouter.get('/follow-ups', async (c) => {
  const owner = await getRequestOwner(c);
  const dueAt = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const [followUp] = await getDb()
    .select({
      clickId: productClicks.id,
      designId: designs.id,
      clickedAt: productClicks.clickedAt,
      product: {
        id: products.id,
        title: products.title,
        retailer: products.retailer,
        imageUrl: products.imageUrl,
      },
    })
    .from(productClicks)
    .innerJoin(designs, eq(productClicks.designId, designs.id))
    .innerJoin(products, eq(productClicks.productId, products.id))
    .leftJoin(purchaseOutcomes, eq(purchaseOutcomes.productClickId, productClicks.id))
    .where(
      and(
        lte(productClicks.clickedAt, dueAt),
        isNull(purchaseOutcomes.id),
        ownershipFilter(owner)
      )
    )
    .orderBy(asc(productClicks.clickedAt))
    .limit(1);

  return c.json({
    followUps: followUp
      ? [{
          ...followUp,
          clickedAt: followUp.clickedAt.toISOString(),
          dueAt: new Date(followUp.clickedAt.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        }]
      : [],
  });
});
