import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadEnv } from './lib/env.js';
import { healthRouter } from './routes/health.js';

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

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.info(`Roomly API listening on http://localhost:${info.port}`);
});
