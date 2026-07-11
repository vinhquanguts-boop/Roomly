import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { designs, publicDesigns } from '../db/schema.js';

export const seoRouter = new Hono();

function frontendBaseUrl(): string {
  return (process.env.VITE_APP_URL || 'http://localhost:5173').replace(/\/+$/g, '');
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

seoRouter.get('/robots.txt', (c) => c.text(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/\nDisallow: /account\nDisallow: /dashboard\nDisallow: /design/\nSitemap: ${frontendBaseUrl()}/sitemap.xml\n`));

seoRouter.get('/sitemap.xml', async (c) => {
  const rows = await getDb()
    .select({ slug: designs.sharedSlug, updatedAt: designs.updatedAt })
    .from(publicDesigns)
    .innerJoin(designs, eq(publicDesigns.designId, designs.id))
    .orderBy(desc(publicDesigns.publishedAt));
  const base = frontendBaseUrl();
  const urls = ['/', '/explore', '/pricing', '/privacy', '/terms']
    .map((path) => `<url><loc>${xmlEscape(`${base}${path}`)}</loc></url>`)
    .concat(rows.flatMap((row) => row.slug ? [`<url><loc>${xmlEscape(`${base}/explore/${row.slug}`)}</loc><lastmod>${row.updatedAt.toISOString()}</lastmod></url>`] : []));
  c.header('Content-Type', 'application/xml; charset=utf-8');
  return c.body(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
});
