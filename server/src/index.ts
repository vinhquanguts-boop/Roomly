import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadEnv } from './lib/env.js';
import { readLocalFile } from './lib/storage.js';
import { designsRouter } from './routes/designs.js';
import { healthRouter } from './routes/health.js';
import { productsRouter } from './routes/products.js';
import { roomsRouter } from './routes/rooms.js';
import { styleRouter } from './routes/style.js';

loadEnv();

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
  })
);

app.route('/api', healthRouter);
app.route('/api/rooms', roomsRouter);
app.route('/api/style', styleRouter);
app.route('/api/designs', designsRouter);
app.route('/api/products', productsRouter);

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

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.info(`Roomly API listening on http://localhost:${info.port}`);
});
