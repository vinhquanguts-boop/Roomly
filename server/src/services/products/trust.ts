import { eq, inArray } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { productReviews, products, purchaseOutcomes } from '../../db/schema.js';

export type TrustLabel = 'safe_pick' | 'good_bet' | 'roll_the_dice' | 'limited_signals';

export type ProductTrust = {
  label: TrustLabel;
  score: number | null;
  source: 'curated_catalog';
  reviewCount: number | null;
  positivePct: number | null;
  negativeFlags: string[];
  feedbackCount: number;
  updatedAt: string | null;
};

type TrustInput = {
  category: string | null;
  soldCount: number;
  reviewCount: number | null;
  positivePct: number | null;
  feedbackCount?: number;
  satisfiedFeedbackCount?: number;
};

const CATEGORY_BASELINE_RISK: Record<string, number> = {
  bedding: 0.18,
  chair: 0.28,
  curtains: 0.2,
  cushions: 0.14,
  decor: 0.16,
  desk: 0.3,
  lamp: 0.24,
  mirror: 0.22,
  plant: 0.2,
  planter: 0.16,
  rug: 0.25,
  shelf: 0.27,
  side_table: 0.24,
  storage: 0.18,
  throw: 0.15,
  wall_art: 0.17,
};

function confidenceRisk(value: number, scale: number): number {
  return 1 - Math.min(Math.log10(Math.max(value, 0) + 1) / scale, 1);
}

function roundScore(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

export function calculateTrustRisk(input: TrustInput): number | null {
  if (input.reviewCount === null || input.positivePct === null) {
    return null;
  }

  const reviewRisk = confidenceRisk(input.reviewCount, 3.5);
  const salesRisk = confidenceRisk(input.soldCount, 3.6);
  const sentimentRisk = 1 - Math.max(0, Math.min(input.positivePct, 100)) / 100;
  const categoryRisk = CATEGORY_BASELINE_RISK[input.category ?? ''] ?? 0.25;
  const feedbackCount = input.feedbackCount ?? 0;
  const feedbackRisk = feedbackCount >= 3
    ? 1 - (input.satisfiedFeedbackCount ?? 0) / feedbackCount
    : 0;

  const score = feedbackCount >= 3
    ? reviewRisk * 0.25 + salesRisk * 0.15 + sentimentRisk * 0.35 + categoryRisk * 0.15 + feedbackRisk * 0.1
    : reviewRisk * 0.3 + salesRisk * 0.2 + sentimentRisk * 0.35 + categoryRisk * 0.15;

  return roundScore(score);
}

export function trustLabelForScore(score: number | null): TrustLabel {
  if (score === null) return 'limited_signals';
  if (score < 0.3) return 'safe_pick';
  if (score < 0.55) return 'good_bet';
  return 'roll_the_dice';
}

export async function getProductTrustSnapshots(productIds: string[]): Promise<Map<string, ProductTrust>> {
  if (productIds.length === 0) return new Map();

  const uniqueIds = [...new Set(productIds)];
  const db = getDb();
  const [productRows, reviewRows, outcomeRows] = await Promise.all([
    db.select().from(products).where(inArray(products.id, uniqueIds)),
    db.select().from(productReviews).where(inArray(productReviews.productId, uniqueIds)),
    db.select({ productId: purchaseOutcomes.productId, satisfied: purchaseOutcomes.satisfied, purchased: purchaseOutcomes.purchased })
      .from(purchaseOutcomes)
      .where(inArray(purchaseOutcomes.productId, uniqueIds)),
  ]);

  const reviewsByProduct = new Map(reviewRows.map((review) => [review.productId, review]));
  const feedbackByProduct = new Map<string, { count: number; satisfied: number }>();
  for (const outcome of outcomeRows) {
    if (!outcome.purchased || outcome.satisfied === null) continue;
    const current = feedbackByProduct.get(outcome.productId) ?? { count: 0, satisfied: 0 };
    current.count += 1;
    if (outcome.satisfied) current.satisfied += 1;
    feedbackByProduct.set(outcome.productId, current);
  }

  return new Map(productRows.map((product) => {
    const review = reviewsByProduct.get(product.id);
    const feedback = feedbackByProduct.get(product.id) ?? { count: 0, satisfied: 0 };
    const score = calculateTrustRisk({
      category: product.category,
      soldCount: product.soldCount,
      reviewCount: review?.reviewCount ?? null,
      positivePct: review?.positivePct === null || review?.positivePct === undefined ? null : Number(review.positivePct),
      feedbackCount: feedback.count,
      satisfiedFeedbackCount: feedback.satisfied,
    });
    return [product.id, {
      label: trustLabelForScore(score),
      score,
      source: 'curated_catalog' as const,
      reviewCount: review?.reviewCount ?? null,
      positivePct: review?.positivePct === null || review?.positivePct === undefined ? null : Number(review.positivePct),
      negativeFlags: review?.negativeFlags ?? [],
      feedbackCount: feedback.count,
      updatedAt: review?.updatedAt?.toISOString() ?? null,
    }];
  }));
}

export async function refreshProductQualityRisk(productId: string): Promise<ProductTrust | null> {
  const snapshots = await getProductTrustSnapshots([productId]);
  const trust = snapshots.get(productId);
  if (!trust) return null;

  await getDb()
    .update(products)
    .set({ qualityRiskScore: trust.score?.toFixed(3) ?? null, updatedAt: new Date() })
    .where(eq(products.id, productId));

  return trust;
}
