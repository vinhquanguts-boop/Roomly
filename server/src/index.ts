import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './lib/auth.js';
import { loadEnv } from './lib/env.js';
import { captureServerError, initServerMonitoring } from './lib/monitoring.js';
import { getOrCreateRoomlySessionId } from './lib/request-context.js';
import { readLocalFile } from './lib/storage.js';
import { authMetaRouter } from './routes/auth-meta.js';
import { dashboardRouter } from './routes/dashboard.js';
import { designsRouter } from './routes/designs.js';
import { explorePreviewRouter, exploreRouter } from './routes/explore.js';
import { healthRouter } from './routes/health.js';
import { productsRouter } from './routes/products.js';
import { roomsRouter } from './routes/rooms.js';
import { seoRouter } from './routes/seo.js';
import { styleRouter } from './routes/style.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { userRouter } from './routes/user.js';
import { chatRouter } from './routes/chat.js';

loadEnv();
initServerMonitoring();

const app = new Hono();

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const allowedOrigins = (process.env.CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use('*', async (c, next) => {
  getOrCreateRoomlySessionId(c);
  await next();
});

app.route('/api/auth', authMetaRouter);
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
app.route('/api', healthRouter);
app.route('/api/chat', chatRouter);
app.route('/api/rooms', roomsRouter);
app.route('/api/style', styleRouter);
app.route('/api/designs', designsRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/explore', exploreRouter);
app.route('/api/products', productsRouter);
app.route('/api/subscriptions', subscriptionsRouter);
app.route('/api/user', userRouter);
app.route('/', seoRouter);
app.route('/', explorePreviewRouter);

app.get('/storage/:key{.*}', async (c) => {
  try {
    const key = c.req.param('key');
    const file = await readLocalFile(key);
    return c.body(file.body, 200, {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=3600',
    });
  } catch {
    return c.json({ error: 'File not found.' }, 404);
  }
});

app.onError((error, c) => {
  captureServerError(error, { method: c.req.method, path: c.req.path });
  console.error(error);
  return c.json({ error: 'Something went wrong. Please try again.' }, 500);
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.info(`Roomly API listening on http://localhost:${info.port}`);
});
