import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { designs, publicDesigns } from '../db/schema.js';
import {
  serializeDashboardDesign,
  serializePublicDesign,
} from '../lib/design-serialization.js';
import { designPlanSchema } from '../services/ai/types.js';

export const exploreRouter = new Hono();
export const explorePreviewRouter = new Hono();

function frontendBaseUrl(): string {
  return (process.env.VITE_APP_URL || 'http://localhost:5173').replace(/\/+$/g, '');
}

function backendBaseUrl(): string {
  return (process.env.BETTER_AUTH_URL || 'http://localhost:8787').replace(/\/+$/g, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function findPublicDesign(slug: string) {
  const [row] = await getDb()
    .select({
      design: designs,
      publicDesign: publicDesigns,
    })
    .from(publicDesigns)
    .innerJoin(designs, eq(publicDesigns.designId, designs.id))
    .where(eq(designs.sharedSlug, slug))
    .limit(1);

  return row ?? null;
}

exploreRouter.get('/', async (c) => {
  const rows = await getDb()
    .select({
      design: designs,
      publicDesign: publicDesigns,
    })
    .from(publicDesigns)
    .innerJoin(designs, eq(publicDesigns.designId, designs.id))
    .orderBy(desc(publicDesigns.publishedAt))
    .limit(60);

  const feed = await Promise.all(
    rows.map(async ({ design, publicDesign }) => ({
      ...(await serializeDashboardDesign(design)),
      sharedSlug: design.sharedSlug,
      publishedAt: publicDesign.publishedAt.toISOString(),
      styleTags: publicDesign.styleTags ?? [],
    }))
  );

  return c.json({ designs: feed });
});

explorePreviewRouter.get('/explore/:slug', async (c) => {
  const slug = c.req.param('slug');
  const row = await findPublicDesign(slug);

  if (!row) {
    return c.html(
      '<!doctype html><html><head><title>Roomly design not found</title></head><body><h1>Roomly design not found</h1></body></html>',
      404
    );
  }

  const plan = designPlanSchema.safeParse(row.design.designPlan);
  const title = plan.success
    ? `${plan.data.styleDirection} by Roomly`
    : `${row.design.styleDirection ?? 'Roomly design'} by Roomly`;
  const description = plan.success
    ? `A ${row.design.currency} ${Number(row.design.budget).toFixed(0)} room design with ${plan.data.hero.category}.`
    : 'A saved Roomly room design with a shoppable plan.';
  const image = row.design.renderUrl ?? `${frontendBaseUrl()}/roomly-og.png`;
  const canonical = `${frontendBaseUrl()}/explore/${slug}`;
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: title,
    description,
    image,
    url: canonical,
    datePublished: row.publicDesign.publishedAt.toISOString(),
    creator: { '@type': 'Organization', name: 'Roomly' },
    keywords: row.publicDesign.styleTags ?? [],
  }).replace(/</g, '\\u003c');

  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:url" content="${escapeHtml(`${backendBaseUrl()}/explore/${slug}`)}">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">${structuredData}</script>
    <meta http-equiv="refresh" content="0; url=${escapeHtml(canonical)}">
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <p><a href="${escapeHtml(canonical)}">Open this Roomly design</a></p>
    </main>
  </body>
</html>`);
});

export async function getPublicDesignPayload(slug: string) {
  const row = await findPublicDesign(slug);
  if (!row) {
    return null;
  }

  return serializePublicDesign(row.design, row.publicDesign);
}
