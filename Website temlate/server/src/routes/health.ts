import { Hono } from 'hono';

export const healthRouter = new Hono();

healthRouter.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'roomly-api',
    aiMode: process.env.AI_MODE ?? 'hybrid',
  });
});
