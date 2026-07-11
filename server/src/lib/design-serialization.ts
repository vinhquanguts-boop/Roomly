import { asc, eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { designItems, designs, products, publicDesigns } from '../db/schema.js';
import { designPlanSchema, type DesignPlan } from '../services/ai/types.js';
import { groundDesignPlanToRetailPrices } from '../services/products/index.js';
import { getProductTrustSnapshots } from '../services/products/trust.js';

type DesignRow = typeof designs.$inferSelect;
type PublicDesignRow = typeof publicDesigns.$inferSelect;

export async function getDesignItemsWithProducts(designId: string) {
  return getDb()
    .select({
      designItem: designItems,
      product: products,
    })
    .from(designItems)
    .leftJoin(products, eq(designItems.productId, products.id))
    .where(eq(designItems.designId, designId))
    .orderBy(asc(designItems.position));
}

export async function getDesignThumbnailUrl(design: DesignRow): Promise<string | null> {
  if (design.renderUrl) {
    return design.renderUrl;
  }

  const [firstItem] = await getDesignItemsWithProducts(design.id);
  return firstItem?.product?.imageUrl ?? null;
}

export function buildStyleTags(plan: DesignPlan | null, fallbackStyle: string | null): string[] {
  const rawTags = [
    fallbackStyle,
    plan?.styleDirection,
    plan?.hero.category,
    ...(plan?.supporting.map((item) => item.category) ?? []),
  ];

  const tags = new Set<string>();
  for (const rawTag of rawTags) {
    if (!rawTag) continue;
    const normalized = rawTag
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4 && token.length <= 24)
      .slice(0, 8);
    normalized.forEach((tag) => tags.add(tag));
  }

  return Array.from(tags).slice(0, 12);
}

export async function serializeDesign(design: DesignRow) {
  const parsedPlan = designPlanSchema.safeParse(design.designPlan);
  const failedPlan = design.designPlan as { error?: unknown } | null;
  const items = await getDesignItemsWithProducts(design.id);
  const trustByProductId = await getProductTrustSnapshots(
    items.flatMap(({ product }) => (product ? [product.id] : []))
  );
  const retailGroundedPlan = parsedPlan.success
    ? groundDesignPlanToRetailPrices(
        parsedPlan.data,
        items
          .filter(({ product }) => product)
          .map(({ designItem, product }) => ({
            position: designItem.position,
            price: Number(product?.price),
          }))
      )
    : null;
  const [publicRow] = await getDb()
    .select()
    .from(publicDesigns)
    .where(eq(publicDesigns.designId, design.id))
    .limit(1);
  const errorMessage =
    design.status === 'failed' && typeof failedPlan?.error === 'string'
      ? failedPlan.error
      : design.status === 'failed' && parsedPlan.success && !design.renderUrl
        ? 'Render failed after design plan generation.'
        : null;

  return {
    id: design.id,
    roomId: design.roomId,
    status: design.status,
    budget: Number(design.budget),
    currency: design.currency,
    styleDirection: design.styleDirection,
    designPlan: retailGroundedPlan,
    renderUrl: design.renderUrl,
    sharedSlug: design.sharedSlug,
    savedAt: design.savedAt?.toISOString() ?? null,
    publishedAt: publicRow?.publishedAt.toISOString() ?? null,
    errorMessage,
    items: items.map(({ designItem, product }) => ({
      designItemId: designItem.id,
      position: designItem.position,
      category: designItem.category,
      rationale: designItem.rationale,
      priceAtGeneration: designItem.priceAtGeneration ? Number(designItem.priceAtGeneration) : null,
      currencyAtGeneration: designItem.currencyAtGeneration,
      product: product
        ? {
            id: product.id,
            retailer: product.retailer,
            title: product.title,
            description: product.description,
            imageUrl: product.imageUrl,
            productUrl: product.productUrl,
            price: Number(product.price),
            currency: product.currency,
            deliveryEstimate: product.deliveryEstimate,
            rating: product.rating ? Number(product.rating) : null,
            soldCount: product.soldCount,
            qualityRiskScore: product.qualityRiskScore ? Number(product.qualityRiskScore) : null,
            trust: trustByProductId.get(product.id) ?? null,
          }
        : null,
    })),
    createdAt: design.createdAt.toISOString(),
    updatedAt: design.updatedAt.toISOString(),
  };
}

export async function serializeDashboardDesign(design: DesignRow) {
  const [publicRow] = await getDb()
    .select({ designId: publicDesigns.designId })
    .from(publicDesigns)
    .where(eq(publicDesigns.designId, design.id))
    .limit(1);

  return {
    id: design.id,
    sharedSlug: publicRow ? design.sharedSlug : null,
    savedAt: design.savedAt?.toISOString() ?? null,
    updatedAt: design.updatedAt.toISOString(),
    status: design.status,
    budget: Number(design.budget),
    currency: design.currency,
    styleDirection: design.styleDirection,
    thumbnailUrl: await getDesignThumbnailUrl(design),
  };
}

export async function serializePublicDesign(design: DesignRow, publicRow: PublicDesignRow) {
  const serialized = await serializeDesign(design);
  const plan = designPlanSchema.safeParse(design.designPlan);

  return {
    ...serialized,
    sharedSlug: design.sharedSlug ?? '',
    publishedAt: publicRow.publishedAt.toISOString(),
    styleTags: publicRow.styleTags ?? buildStyleTags(plan.success ? plan.data : null, design.styleDirection),
  };
}
