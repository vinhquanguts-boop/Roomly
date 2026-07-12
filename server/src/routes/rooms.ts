import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { rooms } from '../db/schema.js';
import {
  createUploadTarget,
  EmptyUploadBodyError,
  getExpectedContentTypeForKey,
  getLocalPublicUrlForKey,
  isAllowedImageContentType,
  isLocalStorageMode,
  MAX_LOCAL_UPLOAD_BYTES,
  PayloadTooLargeError,
  readLimitedBody,
  storeLocalFile,
} from '../lib/storage.js';
import { getAI } from '../services/ai/index.js';
import { roomAnalysisSchema } from '../services/ai/types.js';
import {
  getDesignUsage,
  getEffectivePlan,
  isAuthenticatedOwner,
  isPlanLimitReached,
  planLimitError,
} from '../lib/entitlements.js';
import { getRequestOwner } from '../lib/request-context.js';
import { requestIp, takeRateLimit } from '../lib/rate-limit.js';
import { runTrackedAiOperation } from '../lib/ai-usage.js';

const uploadRequestSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export const roomsRouter = new Hono();

roomsRouter.post('/upload', zValidator('json', uploadRequestSchema), async (c) => {
  const { contentType } = c.req.valid('json');
  const owner = await getRequestOwner(c);
  const ipLimit = await takeRateLimit(`upload:${requestIp(c.req.header('x-forwarded-for'))}`, 20, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    c.header('Retry-After', String(ipLimit.retryAfterSeconds));
    return c.json({ code: 'UPLOAD_RATE_LIMITED', error: 'Too many uploads. Please try again later.' }, 429);
  }
  if (isAuthenticatedOwner(owner)) {
    const plan = getEffectivePlan(owner);
    const usage = await getDesignUsage(owner);
    if (isPlanLimitReached(plan, usage)) {
      return c.json(planLimitError(), 403);
    }
  }
  const target = await createUploadTarget(contentType);

  const [room] = await getDb()
    .insert(rooms)
    .values({ storageUrl: target.publicUrl })
    .returning({ id: rooms.id });

  return c.json({
    roomId: room.id,
    ...target,
  });
});

roomsRouter.post('/storage-upload/:key{.*}', async (c) => {
  if (!isLocalStorageMode()) {
    return c.json({ error: 'Local storage uploads are disabled.' }, 404);
  }

  const key = c.req.param('key');
  const contentType = c.req.header('content-type')?.split(';')[0]?.trim() ?? '';

  if (!isAllowedImageContentType(contentType)) {
    return c.json({ error: 'Unsupported image content type.' }, 415);
  }

  const expectedContentType = getExpectedContentTypeForKey(key);
  if (contentType !== expectedContentType) {
    return c.json({ error: 'Upload content type does not match the issued target.' }, 400);
  }

  const publicUrl = getLocalPublicUrlForKey(key);
  const [room] = await getDb().select().from(rooms).where(eq(rooms.storageUrl, publicUrl)).limit(1);
  if (!room) {
    return c.json({ error: 'Upload target not found.' }, 404);
  }
  if (room.vlmAnalysis) {
    return c.json({ error: 'Room image has already been analyzed.' }, 409);
  }

  let buffer: Buffer;
  try {
    buffer = await readLimitedBody(c.req.raw, MAX_LOCAL_UPLOAD_BYTES);
  } catch (readError) {
    if (readError instanceof PayloadTooLargeError) {
      return c.json({ error: 'Image upload must be 10 MB or smaller.' }, 413);
    }
    if (readError instanceof EmptyUploadBodyError) {
      return c.json({ error: 'Upload body is required.' }, 400);
    }
    throw readError;
  }

  await storeLocalFile(key, buffer);

  return c.json({ ok: true });
});

roomsRouter.post('/:id/analyze', async (c) => {
  const id = c.req.param('id');
  const owner = await getRequestOwner(c);
  const [room] = await getDb().select().from(rooms).where(eq(rooms.id, id)).limit(1);

  if (!room) {
    return c.json({ error: 'Room not found.' }, 404);
  }

  const cachedAnalysis = roomAnalysisSchema.safeParse(room.vlmAnalysis);
  if (cachedAnalysis.success) {
    return c.json({ analysis: cachedAnalysis.data, cached: true });
  }

  const analysis = await runTrackedAiOperation(
    { owner, operation: 'room_analysis', roomId: id },
    () => getAI().analyzeRoom(room.storageUrl)
  );
  await getDb().update(rooms).set({ vlmAnalysis: analysis }).where(eq(rooms.id, id));

  return c.json({ analysis, cached: false });
});
