import type { DesignPlan } from '../types.js';

export function composeRenderPrompt(plan: DesignPlan, roomType: string): string {
  const paletteStr = plan.palette.hexColors.join(', ');
  const itemsStr = [plan.hero, ...plan.supporting]
    .map((item) => `${item.category} (${item.description})`)
    .join(', ');

  return `Photograph of a ${roomType}, ${plan.styleDirection} style, palette of ${paletteStr}, featuring ${itemsStr}, natural window light, photorealistic, magazine editorial interior photography, 8k, professional lighting`;
}

export const DEFAULT_NEGATIVE_PROMPT =
  'blurry, low quality, distorted architecture, warped walls, extra windows, deformed, cartoonish, oversaturated';
