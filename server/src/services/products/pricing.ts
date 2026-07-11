import type { DesignPlan } from '../ai/types.js';

export type RetailPriceAnchor = {
  position: number;
  price: number;
};

function roundDown(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

function priceStep(price: number): number {
  if (price < 40) return 1;
  if (price < 120) return 5;
  return 10;
}

function approximateRetailRange(price: number): { min: number; max: number } {
  const normalizedPrice = Math.max(price, 1);
  const band = normalizedPrice < 40 ? 0.18 : 0.12;
  const step = priceStep(normalizedPrice);
  const min = Math.max(1, roundDown(normalizedPrice * (1 - band), step));
  const max = Math.max(min, roundUp(normalizedPrice * (1 + band), step));

  return { min, max };
}

function approximateTotalRange(total: number): { min: number; max: number } {
  const normalizedTotal = Math.max(total, 1);
  const step = normalizedTotal < 120 ? 5 : 10;
  const min = Math.max(1, roundDown(normalizedTotal * 0.96, step));
  const max = Math.max(min, roundUp(normalizedTotal * 1.04, step));

  return { min, max };
}

export function groundDesignPlanToRetailPrices(
  plan: DesignPlan,
  anchors: RetailPriceAnchor[]
): DesignPlan {
  const validAnchors = anchors.filter((anchor) => Number.isFinite(anchor.price) && anchor.price > 0);
  if (validAnchors.length === 0) {
    return plan;
  }

  const priceByPosition = new Map(validAnchors.map((anchor) => [anchor.position, anchor.price]));
  const heroPrice = priceByPosition.get(0);
  const matchedTotal = validAnchors.reduce((total, anchor) => total + anchor.price, 0);

  return {
    ...plan,
    hero: heroPrice
      ? {
          ...plan.hero,
          priceRange: approximateRetailRange(heroPrice),
        }
      : plan.hero,
    supporting: plan.supporting.map((item, index) => {
      const price = priceByPosition.get(index + 1);
      return price
        ? {
            ...item,
            priceRange: approximateRetailRange(price),
          }
        : item;
    }),
    totalEstimatedCost: approximateTotalRange(matchedTotal),
  };
}
