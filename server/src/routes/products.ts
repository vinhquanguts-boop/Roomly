import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { productClicks, products } from '../db/schema.js';

export const productsRouter = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

productsRouter.get('/track-click', async (c) => {
  const productId = c.req.query('id');
  const requestedDesignId = c.req.query('design_id');
  const designId = requestedDesignId && UUID_RE.test(requestedDesignId) ? requestedDesignId : null;

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

  await getDb().insert(productClicks).values({
    productId,
    designId,
  });

  return c.redirect(product.productUrl, 302);
});
