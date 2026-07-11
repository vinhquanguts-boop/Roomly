import { and, eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { products } from '../../db/schema.js';
import type { DesignPlan } from '../ai/types.js';

type ProductRow = typeof products.$inferSelect;

export type MatchedDesignItem = {
  category: string;
  descriptor: string;
  rationale: string;
  position: number;
  product: ProductRow;
};

type PlanProductNeed = {
  category: string;
  descriptor: string;
  rationale: string;
  priceMin: number;
  priceMax: number;
  position: number;
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  bedding: ['bedding', 'duvet', 'quilt', 'bedspread', 'bed linen', 'linen'],
  chair: ['chair', 'armchair', 'seat', 'stool'],
  curtains: ['curtain', 'drape', 'window covering'],
  cushions: ['cushion', 'pillow', 'cover'],
  decor: ['decor', 'vase', 'tray', 'object', 'sculpture', 'ceramic'],
  desk: ['desk', 'workstation', 'table'],
  lamp: ['lamp', 'lighting', 'pendant', 'light'],
  mirror: ['mirror'],
  plant: ['plant', 'greenery', 'foliage'],
  planter: ['planter', 'pot'],
  rug: ['rug', 'runner', 'mat'],
  shelf: ['shelf', 'shelving', 'bookcase', 'bookshelf'],
  side_table: ['side table', 'bedside', 'nightstand', 'coffee table', 'table'],
  storage: ['storage', 'basket', 'box', 'organiser', 'cabinet'],
  throw: ['throw', 'blanket'],
  wall_art: ['wall art', 'art', 'print', 'poster', 'frame'],
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function inferCatalogCategory(category: string, descriptor: string): string {
  const categoryText = normalize(category);
  for (const [catalogCategory, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => categoryText.includes(alias))) {
      return catalogCategory;
    }
  }

  const haystack = normalize(`${category} ${descriptor}`);
  for (const [catalogCategory, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => haystack.includes(alias))) {
      return catalogCategory;
    }
  }
  return normalize(category).replace(/\s+/g, '_');
}

function planNeeds(plan: DesignPlan): PlanProductNeed[] {
  const hero: PlanProductNeed = {
    category: plan.hero.category,
    descriptor: `${plan.hero.description} ${plan.hero.rationale}`,
    rationale: plan.hero.rationale,
    priceMin: plan.hero.priceRange.min,
    priceMax: plan.hero.priceRange.max,
    position: 0,
  };

  return [
    hero,
    ...plan.supporting.map((item, index) => ({
      category: item.category,
      descriptor: `${item.description} ${item.rationale}`,
      rationale: item.rationale,
      priceMin: item.priceRange.min,
      priceMax: item.priceRange.max,
      position: index + 1,
    })),
  ];
}

function scoreProduct(input: {
  product: ProductRow;
  need: PlanProductNeed;
  catalogCategory: string;
  usedRetailers: Set<string>;
  remainingBudget: number;
}): number {
  const price = Number(input.product.price);
  const productText = `${input.product.title} ${input.product.description ?? ''}`;
  const productTokens = new Set(tokens(productText));
  const descriptorTokens = tokens(`${input.need.category} ${input.need.descriptor}`);
  const tokenMatches = descriptorTokens.filter((token) => productTokens.has(token)).length;

  let score = 0;
  if (input.product.category === input.catalogCategory) score += 80;
  if (price >= input.need.priceMin && price <= input.need.priceMax) score += 45;
  if (price <= input.need.priceMax) score += 20;
  if (price <= input.remainingBudget) score += 24;
  if (!input.usedRetailers.has(input.product.retailer)) score += 8;
  score += Math.min(tokenMatches * 8, 32);
  score += Math.min(Number(input.product.rating ?? 0) * 2, 10);
  score += Math.min(input.product.soldCount / 250, 8);
  // Trust only breaks close ties. It never excludes a product that is the best fit or price.
  score -= Math.min(Number(input.product.qualityRiskScore ?? 0) * 8, 8);

  const targetMidpoint = (input.need.priceMin + input.need.priceMax) / 2;
  score -= Math.abs(price - targetMidpoint) / Math.max(targetMidpoint, 1);

  return score;
}

export async function findProductForDesignNeed(input: {
  category: string;
  descriptor: string;
  rationale: string;
  priceMax: number;
  position: number;
  budgetRemaining: number;
  currency: string;
  excludeProductIds?: string[];
  usedRetailers?: string[];
  allowedRetailers?: string[];
}): Promise<MatchedDesignItem | null> {
  const catalogCategory = inferCatalogCategory(input.category, input.descriptor);
  const excluded = new Set(input.excludeProductIds ?? []);
  const usedRetailers = new Set(input.usedRetailers ?? []);
  const need: PlanProductNeed = {
    category: input.category,
    descriptor: input.descriptor,
    rationale: input.rationale,
    priceMin: 0,
    priceMax: input.priceMax,
    position: input.position,
  };

  const catalog = await getDb()
    .select()
    .from(products)
    .where(and(eq(products.currency, input.currency), eq(products.inStock, true)));

  const match = catalog
    .filter((product) => !excluded.has(product.id))
    .filter((product) => !input.allowedRetailers || input.allowedRetailers.includes(product.retailer))
    .filter((product) => product.category === catalogCategory)
    .filter((product) => Number(product.price) <= input.priceMax)
    .map((product) => ({
      product,
      score: scoreProduct({
        product,
        need,
        catalogCategory,
        usedRetailers,
        remainingBudget: input.budgetRemaining,
      }),
    }))
    .sort((a, b) => b.score - a.score)[0]?.product;

  if (!match) {
    return null;
  }

  return {
    category: input.category,
    descriptor: input.descriptor,
    rationale: input.rationale,
    position: input.position,
    product: match,
  };
}

export async function findShoppingListForPlan(input: {
  plan: DesignPlan;
  budget: number;
  currency: string;
  allowedRetailers?: string[];
}): Promise<MatchedDesignItem[]> {
  const db = getDb();
  const catalog = await db
    .select()
    .from(products)
    .where(and(eq(products.currency, input.currency), eq(products.inStock, true)));

  const usedProductIds = new Set<string>();
  const usedRetailers = new Set<string>();
  let remainingBudget = input.budget;
  const matches: MatchedDesignItem[] = [];

  for (const need of planNeeds(input.plan)) {
    const catalogCategory = inferCatalogCategory(need.category, need.descriptor);
    const candidates = catalog
      .filter((product) => !usedProductIds.has(product.id))
      .filter((product) => !input.allowedRetailers || input.allowedRetailers.includes(product.retailer))
      .filter((product) => product.category === catalogCategory)
      .map((product) => ({
        product,
        score: scoreProduct({ product, need, catalogCategory, usedRetailers, remainingBudget }),
      }))
      .sort((a, b) => b.score - a.score);

    const match = candidates[0]?.product;
    if (!match) {
      continue;
    }

    usedProductIds.add(match.id);
    usedRetailers.add(match.retailer);
    remainingBudget -= Number(match.price);

    matches.push({
      category: need.category,
      descriptor: need.descriptor,
      rationale: need.rationale,
      position: need.position,
      product: match,
    });
  }

  return matches;
}
