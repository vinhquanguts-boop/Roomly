import postgres from 'postgres';
import { loadEnv } from '../lib/env.js';

loadEnv();

type Retailer = 'Kmart' | 'IKEA' | 'Amazon' | 'AliExpress' | 'Taobao';

type CategorySeed = {
  category: string;
  names: string[];
  descriptors: string[];
  priceRange: [number, number];
  imageQuery: string;
};

type ProductSeed = {
  retailer: Retailer;
  externalId: string;
  title: string;
  description: string;
  imageUrl: string;
  productUrl: string;
  price: string;
  currency: 'AUD';
  inStock: boolean;
  soldCount: number;
  rating: string;
  category: string;
  qualityRiskScore: string;
  deliveryEstimate: string;
};

const RETAILERS: Retailer[] = ['Kmart', 'IKEA', 'Amazon', 'AliExpress', 'Taobao'];

const DELIVERY_BY_RETAILER: Record<Retailer, string> = {
  Kmart: '2-5 days',
  IKEA: '3-7 days',
  Amazon: '1-4 days',
  AliExpress: '10-21 days',
  Taobao: '14-28 days',
};

const SEARCH_URLS: Record<Retailer, string> = {
  Kmart: 'https://www.kmart.com.au/search/?searchTerm=',
  IKEA: 'https://www.ikea.com/au/en/search/?q=',
  Amazon: 'https://www.amazon.com.au/s?k=',
  AliExpress: 'https://www.aliexpress.com/wholesale?SearchText=',
  Taobao: 'https://world.taobao.com/search/search.htm?q=',
};

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    category: 'rug',
    names: ['woven area rug', 'jute-look rug', 'terracotta runner', 'neutral flatweave rug'],
    descriptors: ['anchors the room', 'softens timber floors', 'adds warm texture', 'defines the seating zone'],
    priceRange: [55, 145],
    imageQuery: 'neutral woven rug home decor',
  },
  {
    category: 'lamp',
    names: ['ceramic table lamp', 'warm floor lamp', 'rattan pendant shade', 'linen bedside lamp'],
    descriptors: ['adds warm evening light', 'creates a cozy corner', 'softens overhead lighting', 'brings rental-friendly ambience'],
    priceRange: [24, 92],
    imageQuery: 'warm ceramic table lamp home',
  },
  {
    category: 'cushions',
    names: ['sage cushion pair', 'terracotta cushion cover set', 'linen neutral cushion', 'textured cushion bundle'],
    descriptors: ['adds color without commitment', 'updates the sofa quickly', 'layers texture cheaply', 'ties the palette together'],
    priceRange: [12, 42],
    imageQuery: 'linen cushions sofa sage terracotta',
  },
  {
    category: 'throw',
    names: ['sage knit throw', 'cream waffle throw', 'rust cotton blanket', 'soft boucle throw'],
    descriptors: ['adds softness', 'makes the bed feel styled', 'warms the seating area', 'layers renter-friendly texture'],
    priceRange: [18, 58],
    imageQuery: 'soft throw blanket home decor',
  },
  {
    category: 'wall_art',
    names: ['abstract art print', 'botanical framed print', 'warm geometric wall art', 'neutral gallery print'],
    descriptors: ['adds personality', 'fills a blank wall', 'echoes the palette', 'creates a focal point'],
    priceRange: [16, 68],
    imageQuery: 'abstract wall art neutral home',
  },
  {
    category: 'storage',
    names: ['woven storage basket', 'fabric storage box', 'under-bed organiser', 'timber-look storage cube'],
    descriptors: ['hides clutter', 'keeps small rooms calm', 'adds texture with function', 'supports everyday organization'],
    priceRange: [10, 74],
    imageQuery: 'woven storage basket home',
  },
  {
    category: 'shelf',
    names: ['slim open shelf', 'timber-look bookcase', 'ladder shelf', 'compact display shelf'],
    descriptors: ['adds vertical storage', 'shows plants and books', 'uses wall height', 'organizes decor'],
    priceRange: [45, 155],
    imageQuery: 'small timber shelf home',
  },
  {
    category: 'side_table',
    names: ['round side table', 'oak-look bedside table', 'small coffee table', 'nesting table set'],
    descriptors: ['adds a landing spot', 'balances the sofa', 'keeps the room practical', 'works in tight corners'],
    priceRange: [28, 120],
    imageQuery: 'small oak side table living room',
  },
  {
    category: 'plant',
    names: ['faux fiddle leaf plant', 'potted monstera', 'small trailing plant', 'olive tree stem'],
    descriptors: ['adds natural shape', 'freshens the corner', 'softens hard lines', 'brings height cheaply'],
    priceRange: [14, 88],
    imageQuery: 'indoor potted plant living room',
  },
  {
    category: 'planter',
    names: ['terracotta planter', 'woven plant basket', 'ceramic pot', 'ribbed indoor planter'],
    descriptors: ['makes plants feel intentional', 'adds clay warmth', 'hides plastic nursery pots', 'repeats the palette'],
    priceRange: [8, 42],
    imageQuery: 'terracotta indoor planter',
  },
  {
    category: 'curtains',
    names: ['sheer curtain pair', 'linen-look curtain set', 'warm white drapes', 'blockout curtain panels'],
    descriptors: ['softens windows', 'adds height', 'makes the room feel finished', 'improves rental privacy'],
    priceRange: [22, 95],
    imageQuery: 'linen curtains warm white room',
  },
  {
    category: 'desk',
    names: ['compact study desk', 'oak-look writing desk', 'small laptop desk', 'minimal work table'],
    descriptors: ['creates a work zone', 'fits small apartments', 'keeps work tidy', 'supports study days'],
    priceRange: [59, 180],
    imageQuery: 'compact oak desk home office',
  },
  {
    category: 'chair',
    names: ['boucle accent chair', 'dining chair pair', 'compact desk chair', 'rattan occasional chair'],
    descriptors: ['adds extra seating', 'creates a reading corner', 'supports a desk setup', 'adds texture'],
    priceRange: [35, 170],
    imageQuery: 'accent chair warm neutral room',
  },
  {
    category: 'bedding',
    names: ['linen-look quilt cover', 'cream bedding set', 'sage duvet cover', 'warm neutral sheet set'],
    descriptors: ['updates the bed quickly', 'keeps the palette calm', 'makes the bedroom feel finished', 'layers softness'],
    priceRange: [32, 125],
    imageQuery: 'neutral bedding set bedroom',
  },
  {
    category: 'mirror',
    names: ['arched wall mirror', 'round timber mirror', 'full-length mirror', 'small entry mirror'],
    descriptors: ['bounces light', 'makes the room feel larger', 'adds a useful focal point', 'softens the wall'],
    priceRange: [28, 140],
    imageQuery: 'arched mirror home decor',
  },
  {
    category: 'decor',
    names: ['ceramic vase set', 'timber tray', 'small candle holder', 'neutral decor bundle'],
    descriptors: ['finishes the shelf', 'adds a styled detail', 'ties colors together', 'keeps the refresh affordable'],
    priceRange: [8, 48],
    imageQuery: 'ceramic vase neutral decor',
  },
];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function priceFor(seed: CategorySeed, categoryIndex: number, itemIndex: number, retailerIndex: number): number {
  const [min, max] = seed.priceRange;
  const span = max - min;
  const offset = (categoryIndex * 17 + itemIndex * 11 + retailerIndex * 7) % (span + 1);
  return min + offset;
}

function ratingFor(index: number): string {
  return (3.8 + (index % 12) / 10).toFixed(2);
}

function riskFor(retailer: Retailer, index: number): string {
  const base = retailer === 'AliExpress' || retailer === 'Taobao' ? 0.32 : 0.12;
  return Math.min(base + (index % 6) * 0.025, 0.62).toFixed(3);
}

function productUrl(retailer: Retailer, title: string): string {
  return `${SEARCH_URLS[retailer]}${encodeURIComponent(title)}`;
}

function imageUrl(seed: CategorySeed, itemIndex: number): string {
  const tone = itemIndex % 2 === 0 ? 'f7f3ed' : 'e8d5cd';
  return `https://placehold.co/900x900/${tone}/1a1614.png?text=${encodeURIComponent(seed.category.replace('_', ' '))}`;
}

function buildSeedProducts(): ProductSeed[] {
  const seeds: ProductSeed[] = [];

  CATEGORY_SEEDS.forEach((categorySeed, categoryIndex) => {
    categorySeed.names.forEach((name, nameIndex) => {
      RETAILERS.forEach((retailer, retailerIndex) => {
        const title = `${name} - ${retailer}`;
        const sequence = categoryIndex * 100 + nameIndex * 10 + retailerIndex;
        seeds.push({
          retailer,
          externalId: `seed-${categorySeed.category}-${slug(name)}-${slug(retailer)}`,
          title,
          description: `${categorySeed.descriptors[nameIndex % categorySeed.descriptors.length]} for a budget-friendly Roomly refresh.`,
          imageUrl: imageUrl(categorySeed, sequence),
          productUrl: productUrl(retailer, name),
          price: priceFor(categorySeed, categoryIndex, nameIndex, retailerIndex).toFixed(2),
          currency: 'AUD',
          inStock: true,
          soldCount: 80 + ((sequence * 37) % 2400),
          rating: ratingFor(sequence),
          category: categorySeed.category,
          qualityRiskScore: riskFor(retailer, sequence),
          deliveryEstimate: DELIVERY_BY_RETAILER[retailer],
        });
      });
    });
  });

  return seeds;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing.');
}

const sql = postgres(connectionString, { max: 1, connect_timeout: 5 });

try {
  const seedProducts = buildSeedProducts();

  await sql.begin(async (tx) => {
    for (const product of seedProducts) {
      await tx`
        insert into products (
          retailer,
          external_id,
          title,
          description,
          image_url,
          product_url,
          price,
          currency,
          in_stock,
          sold_count,
          rating,
          category,
          quality_risk_score,
          delivery_estimate,
          updated_at
        )
        values (
          ${product.retailer},
          ${product.externalId},
          ${product.title},
          ${product.description},
          ${product.imageUrl},
          ${product.productUrl},
          ${product.price},
          ${product.currency},
          ${product.inStock},
          ${product.soldCount},
          ${product.rating},
          ${product.category},
          ${product.qualityRiskScore},
          ${product.deliveryEstimate},
          now()
        )
        on conflict (retailer, external_id)
        do update set
          title = excluded.title,
          description = excluded.description,
          image_url = excluded.image_url,
          product_url = excluded.product_url,
          price = excluded.price,
          currency = excluded.currency,
          in_stock = excluded.in_stock,
          sold_count = excluded.sold_count,
          rating = excluded.rating,
          category = excluded.category,
          quality_risk_score = excluded.quality_risk_score,
          delivery_estimate = excluded.delivery_estimate,
          updated_at = now()
      `;
    }
  });

  const [{ count }] = await sql<[{ count: string }]>`select count(*)::text as count from products`;
  console.info(`Seeded ${seedProducts.length} products. Catalog now has ${count} products.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Product seed failed: ${message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
