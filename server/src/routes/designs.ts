import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { chatMessages, designItems, designs, publicDesigns, rooms } from '../db/schema.js';
import {
  buildStyleTags,
  getDesignItemsWithProducts,
  serializeDesign,
  serializePublicDesign,
} from '../lib/design-serialization.js';
import { getRequestOwner, type RequestOwner } from '../lib/request-context.js';
import { getAI } from '../services/ai/index.js';
import { composeRenderPrompt, DEFAULT_NEGATIVE_PROMPT } from '../services/ai/prompts/render.js';
import {
  designPlanSchema,
  roomAnalysisSchema,
  type ChatToolCall,
  type DesignPlan,
  type DesignPlanInput,
} from '../services/ai/types.js';
import {
  findProductForDesignNeed,
  findShoppingListForPlan,
  groundDesignPlanToRetailPrices,
  type MatchedDesignItem,
} from '../services/products/index.js';
import { deriveStyleFromQuiz, quizAnswersSchema, StyleQuizError } from '../services/styleQuiz.js';
import {
  getDesignUsage,
  getEffectivePlan,
  getPlanLimits,
  isAuthenticatedOwner,
  isPlanLimitReached,
  planFeatureError,
  planLimitError,
  type Plan,
} from '../lib/entitlements.js';
import { takeRateLimit } from '../lib/rate-limit.js';
import { runTrackedAiOperation } from '../lib/ai-usage.js';

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

const FRONTEND_BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

function publicDesignUrl(slug: string): string {
  return `${FRONTEND_BASE_URL.replace(/\/+$/g, '')}/explore/${slug}`;
}

function canManageDesign(design: typeof designs.$inferSelect, owner: RequestOwner): boolean {
  if (design.ownerAuthUserId) {
    return owner.authUserId === design.ownerAuthUserId;
  }

  if (design.ownerSessionId) {
    return owner.sessionId === design.ownerSessionId;
  }

  return false;
}

function ownerColumns(owner: RequestOwner) {
  return {
    ownerSessionId: owner.sessionId,
    ownerAuthUserId: owner.authUserId,
  };
}

function isSaveableDesign(design: typeof designs.$inferSelect): boolean {
  return design.status === 'complete' || design.status === 'render_ready' || design.status === 'plan_ready';
}

async function ensureSharedSlug(design: typeof designs.$inferSelect): Promise<string> {
  if (design.sharedSlug) {
    return design.sharedSlug;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `room-${nanoid(10)}`;
    const [existing] = await getDb().select().from(designs).where(eq(designs.sharedSlug, candidate)).limit(1);
    if (existing) continue;

    await getDb()
      .update(designs)
      .set({
        sharedSlug: candidate,
        updatedAt: new Date(),
      })
      .where(eq(designs.id, design.id));
    return candidate;
  }

  throw new Error('Could not create a public share slug.');
}

async function upsertPublicDesign(design: typeof designs.$inferSelect, slug: string) {
  const parsedPlan = designPlanSchema.safeParse(design.designPlan);
  const styleTags = buildStyleTags(parsedPlan.success ? parsedPlan.data : null, design.styleDirection);
  const [existing] = await getDb()
    .select()
    .from(publicDesigns)
    .where(eq(publicDesigns.designId, design.id))
    .limit(1);

  if (existing) {
    const [updated] = await getDb()
      .update(publicDesigns)
      .set({ styleTags })
      .where(eq(publicDesigns.designId, design.id))
      .returning();
    return updated;
  }

  const [created] = await getDb()
    .insert(publicDesigns)
    .values({
      designId: design.id,
      styleTags,
    })
    .returning();

  if (!slug) {
    throw new Error('A public slug is required.');
  }

  return created;
}

function isPlanOnlyRenderMode(): boolean {
  return process.env.RENDER_MODE === 'plan-only';
}

function getPlanCostMax(plan: DesignPlan): number {
  return plan.totalEstimatedCost.max;
}

async function generatePlanUnderBudget(params: {
  input: DesignPlanInput;
  owner: RequestOwner;
  designId: string;
}): Promise<DesignPlan> {
  const firstPlan = await runTrackedAiOperation(
    { owner: params.owner, operation: 'design_plan', designId: params.designId },
    () => getAI().generateDesignPlan(params.input)
  );
  if (getPlanCostMax(firstPlan) <= params.input.budget) {
    return firstPlan;
  }

  const retryPlan = await runTrackedAiOperation(
    { owner: params.owner, operation: 'design_plan', designId: params.designId },
    () => getAI().generateDesignPlan({
      ...params.input,
      styleDirection: `${params.input.styleDirection}. Keep total maximum estimated cost at or under ${params.input.budget} ${params.input.currency}; remove nice-to-have items before exceeding budget.`,
    })
  );

  if (getPlanCostMax(retryPlan) > params.input.budget) {
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
  allowedRetailers?: string[];
}): Promise<MatchedDesignItem[]> {
  const matches = await findShoppingListForPlan(params);
  const db = getDb();

  await db.delete(designItems).where(eq(designItems.designId, params.designId));

  if (matches.length === 0) {
    return matches;
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

  return matches;
}

async function runDesignPipeline(params: {
  designId: string;
  roomImageUrl: string;
  roomType: CreateDesignInput['setup']['roomTypeOverride'];
  input: DesignPlanInput;
  plan: Plan;
  owner: RequestOwner;
}): Promise<void> {
  try {
    const generatedPlan = designPlanSchema.parse(await generatePlanUnderBudget({
      input: params.input,
      owner: params.owner,
      designId: params.designId,
    }));
    const matches = await persistShoppingList({
      designId: params.designId,
      plan: generatedPlan,
      budget: params.input.budget,
      currency: params.input.currency,
      allowedRetailers: getPlanLimits(params.plan).allowedRetailers,
    });
    const plan = groundDesignPlanToRetailPrices(
      generatedPlan,
      matches.map((match) => ({
        position: match.position,
        price: Number(match.product.price),
      }))
    );

    await getDb()
      .update(designs)
      .set({
        status: 'plan_ready',
        designPlan: plan,
        updatedAt: new Date(),
      })
      .where(eq(designs.id, params.designId));

    if (isPlanOnlyRenderMode() || !getPlanLimits(params.plan).canRender) {
      await getDb()
        .update(designs)
        .set({
          status: 'complete',
          updatedAt: new Date(),
        })
        .where(eq(designs.id, params.designId));
      return;
    }

    const render = await runTrackedAiOperation(
      { owner: params.owner, operation: 'render', designId: params.designId },
      () => getAI().renderImage({
        originalImageUrl: params.roomImageUrl,
        prompt: composeRenderPrompt(plan, params.roomType),
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
      })
    );

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

async function getChatMessages(designId: string) {
  return getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.designId, designId))
    .orderBy(chatMessages.createdAt);
}

function serializeChatMessage(message: typeof chatMessages.$inferSelect) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

async function checkChatLimit(designId: string): Promise<boolean> {
  return (await takeRateLimit(`chat:${designId}`, 3, 60_000)).allowed;
}

function buildDesignContext(params: {
  design: typeof designs.$inferSelect;
  plan: DesignPlan;
  items: Awaited<ReturnType<typeof getDesignItemsWithProducts>>;
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
  items: Awaited<ReturnType<typeof getDesignItemsWithProducts>>;
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
    allowedRetailers: getPlanLimits(getEffectivePlan({
      sessionId: params.design.ownerSessionId ?? '',
      authUserId: params.design.ownerAuthUserId,
      authUserEmail: null,
    })).allowedRetailers,
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

  const parsedPlan = designPlanSchema.safeParse(params.design.designPlan);
  if (parsedPlan.success) {
    const updatedItems = await getDesignItemsWithProducts(params.design.id);
    const groundedPlan = groundDesignPlanToRetailPrices(
      parsedPlan.data,
      updatedItems
        .filter(({ product }) => product)
        .map(({ designItem, product }) => ({
          position: designItem.position,
          price: Number(product?.price),
        }))
    );

    await getDb()
      .update(designs)
      .set({
        designPlan: groundedPlan,
        updatedAt: new Date(),
      })
      .where(eq(designs.id, params.design.id));
  }

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
  owner: RequestOwner;
}): Promise<string> {
  const roomAnalysis = roomAnalysisSchema.parse(params.room.vlmAnalysis);
  const budget = params.toolCall.newBudget ?? Number(params.design.budget);
  const styleDirection = params.toolCall.newStyleDirection ?? params.design.styleDirection ?? params.plan.styleDirection;
  const generatedPlan = designPlanSchema.parse(await generatePlanUnderBudget({
    owner: params.owner,
    designId: params.design.id,
    input: {
      roomAnalysis,
      budget,
      currency: params.design.currency,
      styleDirection,
      deliveryUrgency: 'normal',
      existingItemsToKeep: roomAnalysis.detectedItems.filter((item) => item.keepRecommended).map((item) => item.name),
    },
  }));

  const matches = await persistShoppingList({
    designId: params.design.id,
    plan: generatedPlan,
    budget,
    currency: params.design.currency,
    allowedRetailers: getPlanLimits(getEffectivePlan({
      sessionId: params.design.ownerSessionId ?? '',
      authUserId: params.design.ownerAuthUserId,
      authUserEmail: null,
    })).allowedRetailers,
  });
  const nextPlan = groundDesignPlanToRetailPrices(
    generatedPlan,
    matches.map((match) => ({
      position: match.position,
      price: Number(match.product.price),
    }))
  );

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

  await getDb()
    .update(publicDesigns)
    .set({ styleTags: buildStyleTags(nextPlan, styleDirection) })
    .where(eq(publicDesigns.designId, params.design.id));

  return `I regenerated the room around ${nextPlan.styleDirection} and rebuilt the shopping list within your ${budget.toFixed(0)} ${params.design.currency} budget.`;
}

designsRouter.post('/', zValidator('json', createDesignSchema), async (c) => {
  const payload = c.req.valid('json');
  const owner = await getRequestOwner(c);
  if (!isAuthenticatedOwner(owner)) {
  const limit = await takeRateLimit(`anonymous-design:${owner.sessionId}`, 5, 24 * 60 * 60 * 1000);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfterSeconds));
      return c.json({ code: 'ANONYMOUS_DAILY_LIMIT_REACHED', error: 'You have reached today\'s anonymous design limit. Sign in or try again tomorrow.' }, 429);
    }
  }
  if (isAuthenticatedOwner(owner)) {
    const plan = getEffectivePlan(owner);
    const usage = await getDesignUsage(owner);
    if (isPlanLimitReached(plan, usage)) {
      return c.json(planLimitError(), 403);
    }
  }
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
      ...ownerColumns(owner),
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
    plan: getEffectivePlan(owner),
    owner,
  });

  return c.json({ designId: design.id });
});

designsRouter.post('/:id/save', async (c) => {
  const owner = await getRequestOwner(c);
  const [design] = await getDb().select().from(designs).where(eq(designs.id, c.req.param('id'))).limit(1);

  if (!design) {
    return c.json({ error: 'Design not found.' }, 404);
  }

  if (!isSaveableDesign(design)) {
    return c.json({ error: 'Only ready designs can be saved.' }, 400);
  }

  if (!canManageDesign(design, owner)) {
    return c.json({ error: 'You do not have access to save this design.' }, 403);
  }

  const [savedDesign] = await getDb()
    .update(designs)
    .set({
      ...ownerColumns(owner),
      savedAt: design.savedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(designs.id, design.id))
    .returning();

  return c.json({ design: await serializeDesign(savedDesign) });
});

designsRouter.post('/:id/publish', async (c) => {
  const owner = await getRequestOwner(c);
  const [design] = await getDb().select().from(designs).where(eq(designs.id, c.req.param('id'))).limit(1);

  if (!design) {
    return c.json({ error: 'Design not found.' }, 404);
  }

  if (!isSaveableDesign(design)) {
    return c.json({ error: 'Only ready designs can be shared.' }, 400);
  }

  if (!canManageDesign(design, owner)) {
    return c.json({ error: 'You do not have access to share this design.' }, 403);
  }

  if (!getPlanLimits(getEffectivePlan(owner)).canShare) {
    return c.json(planFeatureError('Sharing', 'plus'), 403);
  }

  const slug = await ensureSharedSlug(design);
  const [currentDesign] = await getDb().select().from(designs).where(eq(designs.id, design.id)).limit(1);
  const [ownedDesign] = await getDb()
    .update(designs)
    .set({
      ...ownerColumns(owner),
      savedAt: currentDesign.savedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(designs.id, design.id))
    .returning();
  const publicDesign = await upsertPublicDesign(ownedDesign, slug);

  return c.json({
    publicUrl: publicDesignUrl(slug),
    previewUrl: `${(process.env.BETTER_AUTH_URL || 'http://localhost:8787').replace(/\/+$/g, '')}/explore/${slug}`,
    design: await serializePublicDesign(ownedDesign, publicDesign),
  });
});

designsRouter.post('/:id/unpublish', async (c) => {
  const owner = await getRequestOwner(c);
  const [design] = await getDb().select().from(designs).where(eq(designs.id, c.req.param('id'))).limit(1);

  if (!design) {
    return c.json({ error: 'Design not found.' }, 404);
  }

  if (!canManageDesign(design, owner)) {
    return c.json({ error: 'You do not have access to unpublish this design.' }, 403);
  }

  await getDb().delete(publicDesigns).where(eq(publicDesigns.designId, design.id));
  const [updatedDesign] = await getDb().select().from(designs).where(eq(designs.id, design.id)).limit(1);

  return c.json({ design: await serializeDesign(updatedDesign) });
});

designsRouter.get('/public/:slug', async (c) => {
  const slug = c.req.param('slug');
  const [row] = await getDb()
    .select({
      design: designs,
      publicDesign: publicDesigns,
    })
    .from(publicDesigns)
    .innerJoin(designs, eq(publicDesigns.designId, designs.id))
    .where(eq(designs.sharedSlug, slug))
    .limit(1);

  if (!row) {
    return c.json({ error: 'Public design not found.' }, 404);
  }

  return c.json({ design: await serializePublicDesign(row.design, row.publicDesign) });
});

designsRouter.get('/:id/chat', async (c) => {
  const designId = c.req.param('id');
  const owner = await getRequestOwner(c);
  const [design] = await getDb().select().from(designs).where(eq(designs.id, designId)).limit(1);

  if (!design) {
    return c.json({ error: 'Design not found.' }, 404);
  }

  if (!canManageDesign(design, owner)) {
    return c.json({ error: 'You do not have access to this design.' }, 403);
  }

  const messages = await getChatMessages(designId);
  return c.json({ messages: messages.map(serializeChatMessage) });
});

designsRouter.post('/:id/chat', zValidator('json', chatMessageSchema), async (c) => {
  const designId = c.req.param('id');
  const payload = c.req.valid('json');
  const owner = await getRequestOwner(c);
  const db = getDb();
  const [design] = await db.select().from(designs).where(eq(designs.id, designId)).limit(1);

  if (!design) {
    return c.json({ error: 'Design not found.' }, 404);
  }

  if (!canManageDesign(design, owner)) {
    return c.json({ error: 'You do not have access to this design.' }, 403);
  }

  const planLimits = getPlanLimits(getEffectivePlan(owner));
  if (planLimits.chatMessagesPerDesign === 0) {
    return c.json(planFeatureError('Chat refinement', 'plus'), 403);
  }

  const parsedPlan = designPlanSchema.safeParse(design.designPlan);
  if (!parsedPlan.success || design.status === 'pending') {
    return c.json({ error: 'Design must be ready before chat refinement.' }, 400);
  }

  if (!(await checkChatLimit(designId))) {
    return c.json({ error: 'Too many refinements. Please wait a minute and try again.' }, 429);
  }

  const [room] = await db.select().from(rooms).where(eq(rooms.id, design.roomId)).limit(1);
  if (!room) {
    return c.json({ error: 'Room not found.' }, 404);
  }

  const existingMessages = await getChatMessages(designId);
  const userMessageCount = existingMessages.filter((message) => message.role === 'user').length;
  if (planLimits.chatMessagesPerDesign !== null && userMessageCount >= planLimits.chatMessagesPerDesign) {
    return c.json({
      code: 'PLAN_CHAT_LIMIT_REACHED',
      requiredPlan: 'professional',
      error: 'You have used all five Plus refinements for this design. Upgrade to Professional for unlimited chat.',
    }, 403);
  }
  const items = await getDesignItemsWithProducts(designId);
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

  let toolCall = await runTrackedAiOperation(
    { owner, operation: 'design_refinement', designId },
    () => getAI().chatRefine({
      designContext,
      history: existingMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      userMessage: payload.message,
    })
  );
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
      owner,
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
  const owner = await getRequestOwner(c);
  const [design] = await getDb().select().from(designs).where(eq(designs.id, c.req.param('id'))).limit(1);

  if (!design) {
    return c.json({ error: 'Design not found.' }, 404);
  }

  if (!canManageDesign(design, owner)) {
    return c.json({ error: 'You do not have access to this design.' }, 403);
  }

  return c.json({ design: await serializeDesign(design) });
});
