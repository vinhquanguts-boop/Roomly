import { zValidator } from '@hono/zod-validator';
import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { chatMessages, designItems, designs, products, rooms } from '../db/schema.js';
import { getAI } from '../services/ai/index.js';
import { composeRenderPrompt, DEFAULT_NEGATIVE_PROMPT } from '../services/ai/prompts/render.js';
import {
  designPlanSchema,
  roomAnalysisSchema,
  type ChatToolCall,
  type DesignPlan,
  type DesignPlanInput,
} from '../services/ai/types.js';
import { findProductForDesignNeed, findShoppingListForPlan } from '../services/products/index.js';
import { deriveStyleFromQuiz, quizAnswersSchema, StyleQuizError } from '../services/styleQuiz.js';

const setupSchema = z.object({
  budget: z.coerce.number().min(50).max(5000),
  currency: z.enum(['AUD', 'USD', 'NZD']),
  roomTypeOverride: z.enum([
    'bedroom',
    'living_room',
    'kitchen',
    'bathroom',
    'office',
    'dining',
    'entryway',
    'other',
  ]),
  deliveryUrgency: z.enum(['urgent', 'normal', 'flexible']),
  stylePreference: z.string().trim().min(2).max(80),
});

const createDesignSchema = z.object({
  roomId: z.uuid(),
  setup: setupSchema,
  quizAnswers: quizAnswersSchema,
});

const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(600),
});

type CreateDesignInput = z.infer<typeof createDesignSchema>;

export const designsRouter = new Hono();

const CHAT_LIMIT_WINDOW_MS = 60_000;
const CHAT_LIMIT_MAX = 3;
const chatLimiter = new Map<string, number[]>();

function isPlanOnlyRenderMode(): boolean {
  return process.env.RENDER_MODE === 'plan-only';
}

function getPlanCostMax(plan: DesignPlan): number {
  return plan.totalEstimatedCost.max;
}

async function generatePlanUnderBudget(input: DesignPlanInput): Promise<DesignPlan> {
  const ai = getAI();
  const firstPlan = await ai.generateDesignPlan(input);
  if (getPlanCostMax(firstPlan) <= input.budget) {
    return firstPlan;
  }

  const retryPlan = await ai.generateDesignPlan({
    ...input,
    styleDirection: `${input.styleDirection}. Keep total maximum estimated cost at or under ${input.budget} ${input.currency}; remove nice-to-have items before exceeding budget.`,
  });

  if (getPlanCostMax(retryPlan) > input.budget) {
    throw new Error('Generated design plan exceeded the budget after retry.');
  }

  return retryPlan;
}

async function markFailed(designId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Design generation failed.';
  const [currentDesign] = await getDb().select().from(designs).where(eq(designs.id, designId)).limit(1);
  const hasValidPlan = designPlanSchema.safeParse(currentDesign?.designPlan).success;

  await getDb()
    .update(designs)
    .set({
      status: 'failed',
      ...(hasValidPlan ? {} : { designPlan: { error: message } }),
      updatedAt: new Date(),
    })
    .where(eq(designs.id, designId));
}

async function persistShoppingList(params: {
  designId: string;
  plan: DesignPlan;
  budget: number;
  currency: string;
}): Promise<void> {
  const matches = await findShoppingListForPlan(params);
  const db = getDb();

  await db.delete(designItems).where(eq(designItems.designId, params.designId));

  if (matches.length === 0) {
    return;
  }

  await db.insert(designItems).values(
    matches.map((match) => ({
      designId: params.designId,
      category: match.category,
      productId: match.product.id,
      position: match.position,
      rationale: match.rationale,
      priceAtGeneration: Number(match.product.price).toFixed(2),
      currencyAtGeneration: match.product.currency,
    }))
  );
}

async function runDesignPipeline(params: {
  designId: string;
  roomImageUrl: string;
  roomType: CreateDesignInput['setup']['roomTypeOverride'];
  input: DesignPlanInput;
}): Promise<void> {
  try {
    const plan = designPlanSchema.parse(await generatePlanUnderBudget(params.input));

    await getDb()
      .update(designs)
      .set({
        status: 'plan_ready',
        designPlan: plan,
        updatedAt: new Date(),
      })
      .where(eq(designs.id, params.designId));

    await persistShoppingList({
      designId: params.designId,
      plan,
      budget: params.input.budget,
      currency: params.input.currency,
    });

    if (isPlanOnlyRenderMode()) {
      await getDb()
        .update(designs)
        .set({
          status: 'complete',
          updatedAt: new Date(),
        })
        .where(eq(designs.id, params.designId));
      return;
    }

    const render = await getAI().renderImage({
      originalImageUrl: params.roomImageUrl,
      prompt: composeRenderPrompt(plan, params.roomType),
      negativePrompt: DEFAULT_NEGATIVE_PROMPT,
    });

    await getDb()
      .update(designs)
      .set({
        status: 'render_ready',
        renderUrl: render.url,
        updatedAt: new Date(),
      })
      .where(eq(designs.id, params.designId));

    await getDb()
      .update(designs)
      .set({
        status: 'complete',
        updatedAt: new Date(),
      })
      .where(eq(designs.id, params.designId));
  } catch (error) {
    await markFailed(params.designId, error);
  }
}

async function getDesignItems(designId: string) {
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

async function getChatMessages(designId: string) {
  return getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.designId, designId))
    .orderBy(asc(chatMessages.createdAt));
}

function serializeChatMessage(message: typeof chatMessages.$inferSelect) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

function checkChatLimit(designId: string): boolean {
  const now = Date.now();
  const recent = (chatLimiter.get(designId) ?? []).filter((timestamp) => now - timestamp < CHAT_LIMIT_WINDOW_MS);
  if (recent.length >= CHAT_LIMIT_MAX) {
    chatLimiter.set(designId, recent);
    return false;
  }

  recent.push(now);
  chatLimiter.set(designId, recent);
  return true;
}

function buildDesignContext(params: {
  design: typeof designs.$inferSelect;
  plan: DesignPlan;
  items: Awaited<ReturnType<typeof getDesignItems>>;
}): string {
  const itemLines = params.items.map(({ designItem, product }) => {
    const price = designItem.priceAtGeneration ? Number(designItem.priceAtGeneration) : product ? Number(product.price) : null;
    return [
      `position ${designItem.position}`,
      `category: ${designItem.category}`,
      product ? `product: ${product.title}` : 'product: none',
      product ? `retailer: ${product.retailer}` : null,
      price !== null ? `price: ${price} ${designItem.currencyAtGeneration ?? params.design.currency}` : null,
      `rationale: ${designItem.rationale ?? 'No rationale provided.'}`,
    ].filter(Boolean).join('; ');
  });

  return [
    `Design status: ${params.design.status}`,
    `Budget: ${Number(params.design.budget)} ${params.design.currency}`,
    `Style direction: ${params.plan.styleDirection}`,
    `Estimated plan cost: ${params.plan.totalEstimatedCost.min}-${params.plan.totalEstimatedCost.max} ${params.design.currency}`,
    `Hero: ${params.plan.hero.category} - ${params.plan.hero.description}`,
    `Supporting items: ${params.plan.supporting.map((item) => `${item.category} - ${item.description}`).join(' | ')}`,
    `Current shopping items:\n${itemLines.join('\n')}`,
    'Use itemPosition exactly as listed above when swapping a product.',
  ].join('\n');
}

function inferStyleRegenerationRequest(message: string): string | null {
  const normalized = message.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/\b(why|what|how)\b/.test(normalized)) {
    return null;
  }

  const moreMatch = normalized.match(/\bmake (?:it|this|the room|the design) more ([a-z][a-z -]{2,40})/);
  if (moreMatch?.[1]) {
    return `${moreMatch[1].replace(/[?.!]+$/g, '').trim()} style`;
  }

  const styleMatch = normalized.match(/\b(?:change|switch|turn|regenerate|redo)\b.*\b(coastal|minimal|boho|scandi|industrial|modern|warm|neutral|colorful|earthy|sage|terracotta)\b/);
  if (styleMatch?.[1]) {
    return `${styleMatch[1]} style`;
  }

  return null;
}

async function applySwapItem(params: {
  design: typeof designs.$inferSelect;
  items: Awaited<ReturnType<typeof getDesignItems>>;
  toolCall: Extract<ChatToolCall, { action: 'swap_item' }>;
  userMessage: string;
}): Promise<{ changedPosition: number | null; text: string; action: 'answer' | 'swap_item' }> {
  const target = params.items.find(({ designItem }) => designItem.position === params.toolCall.itemPosition);
  if (!target) {
    return {
      changedPosition: null,
      action: 'answer',
      text: "I couldn't find that item in the current shopping list, so I left the design unchanged.",
    };
  }

  const currentProductIds = params.items
    .map(({ product }) => product?.id)
    .filter((id): id is string => Boolean(id));
  const usedRetailers = params.items
    .filter(({ designItem }) => designItem.position !== target.designItem.position)
    .map(({ product }) => product?.retailer)
    .filter((retailer): retailer is string => Boolean(retailer));
  const otherTotal = params.items
    .filter(({ designItem }) => designItem.position !== target.designItem.position)
    .reduce((total, { designItem, product }) => total + Number(designItem.priceAtGeneration ?? product?.price ?? 0), 0);
  const budgetRemaining = Math.max(Number(params.design.budget) - otherTotal, 0);
  const currentPrice = Number(target.designItem.priceAtGeneration ?? target.product?.price ?? params.toolCall.newPriceMax);
  const wantsCheaper = /\b(cheap|cheaper|less expensive|lower price|save money|budget)\b/i.test(params.userMessage);
  const requestedMax = wantsCheaper
    ? Math.min(params.toolCall.newPriceMax, Math.max(Math.floor(currentPrice) - 1, 1))
    : params.toolCall.newPriceMax;
  const priceMax = Math.min(requestedMax, budgetRemaining);

  const match = await findProductForDesignNeed({
    category: target.designItem.category,
    descriptor: params.toolCall.newDescriptor,
    rationale: `Swapped after chat request: ${params.toolCall.newDescriptor}`,
    priceMax,
    position: target.designItem.position,
    budgetRemaining,
    currency: params.design.currency,
    excludeProductIds: currentProductIds,
    usedRetailers,
  });

  if (!match) {
    return {
      changedPosition: null,
      action: 'answer',
      text:
        budgetRemaining <= 0
          ? `This design is already at or over your ${params.design.currency} ${Number(params.design.budget).toFixed(0)} budget without the ${target.designItem.category}, so I couldn't add a replacement without going further over. Try removing a nice-to-have item first.`
          : `I couldn't find a good ${target.designItem.category} swap under ${priceMax} ${params.design.currency}, so I left the shopping list unchanged.`,
    };
  }

  await getDb()
    .update(designItems)
    .set({
      productId: match.product.id,
      rationale: match.rationale,
      priceAtGeneration: Number(match.product.price).toFixed(2),
      currencyAtGeneration: match.product.currency,
    })
    .where(eq(designItems.id, target.designItem.id));

  return {
    changedPosition: target.designItem.position,
    action: 'swap_item',
    text: `I swapped the ${target.designItem.category} for ${match.product.title} at ${Number(match.product.price).toFixed(0)} ${match.product.currency}.`,
  };
}

async function applyRegenerateAll(params: {
  design: typeof designs.$inferSelect;
  room: typeof rooms.$inferSelect;
  plan: DesignPlan;
  toolCall: Extract<ChatToolCall, { action: 'regenerate_all' }>;
}): Promise<string> {
  const roomAnalysis = roomAnalysisSchema.parse(params.room.vlmAnalysis);
  const budget = params.toolCall.newBudget ?? Number(params.design.budget);
  const styleDirection = params.toolCall.newStyleDirection ?? params.design.styleDirection ?? params.plan.styleDirection;
  const nextPlan = designPlanSchema.parse(await generatePlanUnderBudget({
    roomAnalysis,
    budget,
    currency: params.design.currency,
    styleDirection,
    deliveryUrgency: 'normal',
    existingItemsToKeep: roomAnalysis.detectedItems.filter((item) => item.keepRecommended).map((item) => item.name),
  }));

  await getDb()
    .update(designs)
    .set({
      status: 'complete',
      budget: budget.toFixed(2),
      styleDirection,
      designPlan: nextPlan,
      renderUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(designs.id, params.design.id));

  await persistShoppingList({
    designId: params.design.id,
    plan: nextPlan,
    budget,
    currency: params.design.currency,
  });

  return `I regenerated the room around ${nextPlan.styleDirection} and rebuilt the shopping list within your ${budget.toFixed(0)} ${params.design.currency} budget.`;
}

async function serializeDesign(design: typeof designs.$inferSelect) {
  const parsedPlan = designPlanSchema.safeParse(design.designPlan);
  const failedPlan = design.designPlan as { error?: unknown } | null;
  const items = await getDesignItems(design.id);
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
    designPlan: parsedPlan.success ? parsedPlan.data : null,
    renderUrl: design.renderUrl,
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
            qualityRiskScore: product.qualityRiskScore ? Number(product.qualityRiskScore) : null,
          }
        : null,
    })),
    createdAt: design.createdAt.toISOString(),
    updatedAt: design.updatedAt.toISOString(),
  };
}

designsRouter.post('/', zValidator('json', createDesignSchema), async (c) => {
  const payload = c.req.valid('json');
  const [room] = await getDb().select().from(rooms).where(eq(rooms.id, payload.roomId)).limit(1);

  if (!room) {
    return c.json({ error: 'Room not found.' }, 404);
  }

  const roomAnalysis = roomAnalysisSchema.safeParse(room.vlmAnalysis);
  if (!roomAnalysis.success) {
    return c.json({ error: 'Room analysis is required before design generation.' }, 400);
  }

  let style;
  try {
    style = deriveStyleFromQuiz(payload.quizAnswers);
  } catch (error) {
    if (error instanceof StyleQuizError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }

  const styleDirection = `${payload.setup.stylePreference}; ${style.styleDirection}`;
  const existingItemsToKeep = roomAnalysis.data.detectedItems
    .filter((item) => item.keepRecommended)
    .map((item) => item.name);

  const [design] = await getDb()
    .insert(designs)
    .values({
      roomId: payload.roomId,
      status: 'pending',
      budget: payload.setup.budget.toFixed(2),
      currency: payload.setup.currency,
      styleDirection,
    })
    .returning();

  void runDesignPipeline({
    designId: design.id,
    roomImageUrl: room.storageUrl,
    roomType: payload.setup.roomTypeOverride,
    input: {
      roomAnalysis: roomAnalysis.data,
      budget: payload.setup.budget,
      currency: payload.setup.currency,
      styleDirection,
      deliveryUrgency: payload.setup.deliveryUrgency,
      existingItemsToKeep,
    },
  });

  return c.json({ designId: design.id });
});

designsRouter.get('/:id/chat', async (c) => {
  const designId = c.req.param('id');
  const [design] = await getDb().select().from(designs).where(eq(designs.id, designId)).limit(1);

  if (!design) {
    return c.json({ error: 'Design not found.' }, 404);
  }

  const messages = await getChatMessages(designId);
  return c.json({ messages: messages.map(serializeChatMessage) });
});

designsRouter.post('/:id/chat', zValidator('json', chatMessageSchema), async (c) => {
  const designId = c.req.param('id');
  const payload = c.req.valid('json');
  const db = getDb();
  const [design] = await db.select().from(designs).where(eq(designs.id, designId)).limit(1);

  if (!design) {
    return c.json({ error: 'Design not found.' }, 404);
  }

  const parsedPlan = designPlanSchema.safeParse(design.designPlan);
  if (!parsedPlan.success || design.status === 'pending') {
    return c.json({ error: 'Design must be ready before chat refinement.' }, 400);
  }

  if (!checkChatLimit(designId)) {
    return c.json({ error: 'Too many refinements. Please wait a minute and try again.' }, 429);
  }

  const [room] = await db.select().from(rooms).where(eq(rooms.id, design.roomId)).limit(1);
  if (!room) {
    return c.json({ error: 'Room not found.' }, 404);
  }

  const existingMessages = await getChatMessages(designId);
  const items = await getDesignItems(designId);
  const designContext = buildDesignContext({
    design,
    plan: parsedPlan.data,
    items,
  });

  await db.insert(chatMessages).values({
    designId,
    role: 'user',
    content: payload.message,
  });

  let toolCall = await getAI().chatRefine({
    designContext,
    history: existingMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    userMessage: payload.message,
  });
  const forcedStyleDirection = inferStyleRegenerationRequest(payload.message);
  if (forcedStyleDirection) {
    toolCall = {
      action: 'regenerate_all',
      newStyleDirection: forcedStyleDirection,
    };
  }

  let assistantText: string;
  let action: ChatToolCall['action'] = toolCall.action;
  let changedPosition: number | null = null;

  if (toolCall.action === 'answer') {
    assistantText = toolCall.text;
  } else if (toolCall.action === 'swap_item') {
    const result = await applySwapItem({
      design,
      items,
      toolCall,
      userMessage: payload.message,
    });
    assistantText = result.text;
    action = result.action;
    changedPosition = result.changedPosition;
  } else {
    assistantText = await applyRegenerateAll({
      design,
      room,
      plan: parsedPlan.data,
      toolCall,
    });
  }

  const [assistantMessage] = await db
    .insert(chatMessages)
    .values({
      designId,
      role: 'assistant',
      content: assistantText,
      toolCalls: {
        requested: toolCall,
        appliedAction: action,
        changedPosition,
      },
    })
    .returning();

  const [updatedDesign] = await db.select().from(designs).where(eq(designs.id, designId)).limit(1);

  return c.json({
    message: serializeChatMessage(assistantMessage),
    action,
    changedPosition,
    design: await serializeDesign(updatedDesign),
  });
});

designsRouter.get('/:id', async (c) => {
  const [design] = await getDb().select().from(designs).where(eq(designs.id, c.req.param('id'))).limit(1);

  if (!design) {
    return c.json({ error: 'Design not found.' }, 404);
  }

  return c.json({ design: await serializeDesign(design) });
});
