import { z } from 'zod';

export const roomAnalysisSchema = z.object({
  roomType: z.enum([
    'bedroom',
    'living_room',
    'kitchen',
    'bathroom',
    'office',
    'dining',
    'entryway',
    'other',
  ]),
  estimatedDimensions: z.object({
    widthMeters: z.number().nullable(),
    depthMeters: z.number().nullable(),
    confidence: z.enum(['low', 'medium', 'high']),
  }),
  detectedItems: z.array(
    z.object({
      name: z.string(),
      condition: z.enum(['good', 'ok', 'poor']).optional(),
      keepRecommended: z.boolean().default(false),
    })
  ),
  palette: z.object({
    dominantColors: z.array(z.string()).max(5),
    temperature: z.enum(['warm', 'neutral', 'cool']),
    description: z.string(),
  }),
  lightSources: z.array(
    z.object({
      type: z.enum(['window', 'overhead', 'lamp', 'natural_only']),
      intensity: z.enum(['low', 'medium', 'high']),
      direction: z.string().optional(),
    })
  ),
  detectedStyle: z.string(),
  notes: z.string(),
});
export type RoomAnalysis = z.infer<typeof roomAnalysisSchema>;

export const designPlanSchema = z.object({
  styleDirection: z.string(),
  palette: z.object({
    hexColors: z.array(z.string()).min(3).max(5),
    rationale: z.string(),
  }),
  hero: z.object({
    category: z.string(),
    priceRange: z.object({ min: z.number(), max: z.number() }),
    description: z.string(),
    rationale: z.string(),
  }),
  supporting: z
    .array(
      z.object({
        category: z.string(),
        priceRange: z.object({ min: z.number(), max: z.number() }),
        description: z.string(),
        rationale: z.string(),
        priority: z.enum(['essential', 'important', 'nice-to-have']),
      })
    )
    .min(3)
    .max(8),
  designPrinciples: z.array(z.string()).min(2).max(5),
  totalEstimatedCost: z.object({ min: z.number(), max: z.number() }),
});
export type DesignPlan = z.infer<typeof designPlanSchema>;

export function normalizeDesignPlanPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const draft = payload as {
    palette?: { hexColors?: unknown };
    supporting?: unknown;
    designPrinciples?: unknown;
  };

  if (draft.palette && Array.isArray(draft.palette.hexColors)) {
    draft.palette.hexColors = draft.palette.hexColors.slice(0, 5);
  }

  if (Array.isArray(draft.supporting)) {
    draft.supporting = draft.supporting.slice(0, 8).map((item) => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      const supportingItem = item as { priority?: unknown };
      if (supportingItem.priority === 'high') {
        supportingItem.priority = 'essential';
      } else if (supportingItem.priority === 'medium') {
        supportingItem.priority = 'important';
      } else if (
        supportingItem.priority === 'low' ||
        supportingItem.priority === 'nice to have' ||
        supportingItem.priority === 'nice_to_have'
      ) {
        supportingItem.priority = 'nice-to-have';
      } else if (
        supportingItem.priority !== 'essential' &&
        supportingItem.priority !== 'important' &&
        supportingItem.priority !== 'nice-to-have'
      ) {
        supportingItem.priority = 'important';
      }

      return supportingItem;
    });
  }

  if (Array.isArray(draft.designPrinciples)) {
    draft.designPrinciples = draft.designPrinciples.slice(0, 5);
  }

  return draft;
}

export type DesignPlanInput = {
  roomAnalysis: RoomAnalysis;
  budget: number;
  currency: string;
  styleDirection: string;
  deliveryUrgency: 'urgent' | 'normal' | 'flexible';
  existingItemsToKeep: string[];
};

export const chatToolCallSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('swap_item'),
    itemPosition: z.number(),
    newDescriptor: z.string(),
    newPriceMax: z.number(),
  }),
  z.object({
    action: z.literal('regenerate_all'),
    newStyleDirection: z.string().optional(),
    newBudget: z.number().optional(),
  }),
  z.object({
    action: z.literal('answer'),
    text: z.string(),
  }),
]);
export type ChatToolCall = z.infer<typeof chatToolCallSchema>;

export type ChatInput = {
  designContext: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
};

export type RenderInput = {
  originalImageUrl: string;
  prompt: string;
  negativePrompt?: string;
};

export type SegmentInput = {
  imageUrl: string;
  targetLabel: string;
};

export interface AIProvider {
  analyzeRoom(imageUrl: string): Promise<RoomAnalysis>;
  generateDesignPlan(input: DesignPlanInput): Promise<DesignPlan>;
  chatRefine(input: ChatInput): Promise<ChatToolCall>;
  renderImage(input: RenderInput): Promise<{ url: string }>;
  segmentRegion(input: SegmentInput): Promise<{ maskUrl: string }>;
  embedImage(imageUrl: string): Promise<number[]>;
  embedText(text: string): Promise<number[]>;
}
