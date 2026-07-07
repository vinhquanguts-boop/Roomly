import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';

export const designStatusEnum = pgEnum('design_status', [
  'pending',
  'plan_ready',
  'render_ready',
  'complete',
  'failed',
]);

export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  country: varchar('country', { length: 2 }),
  currency: varchar('currency', { length: 3 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const styleProfiles = pgTable('style_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  embedding: vector('embedding', { dimensions: 768 }),
  preferences: jsonb('preferences').$type<Record<string, unknown>>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  storageUrl: text('storage_url').notNull(),
  vlmAnalysis: jsonb('vlm_analysis').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    retailer: text('retailer').notNull(),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    inStock: boolean('in_stock').notNull().default(true),
    soldCount: integer('sold_count').notNull().default(0),
    rating: numeric('rating', { precision: 3, scale: 2 }),
    imageEmbedding: vector('image_embedding', { dimensions: 768 }),
    textEmbedding: vector('text_embedding', { dimensions: 768 }),
    category: text('category'),
    dimensionsCm: jsonb('dimensions_cm').$type<{
      width?: number;
      depth?: number;
      height?: number;
    }>(),
    qualityRiskScore: numeric('quality_risk_score', { precision: 4, scale: 3 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('products_retailer_external_idx').on(table.retailer, table.externalId),
    index('products_category_idx').on(table.category),
  ]
);

export const productReviews = pgTable('product_reviews', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  reviewCount: integer('review_count').notNull().default(0),
  positivePct: numeric('positive_pct', { precision: 5, scale: 2 }),
  negativeFlags: jsonb('negative_flags').$type<string[]>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const designs = pgTable(
  'designs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    status: designStatusEnum('status').notNull().default('pending'),
    budget: numeric('budget', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    styleDirection: text('style_direction'),
    designPlan: jsonb('design_plan').$type<Record<string, unknown>>(),
    renderUrl: text('render_url'),
    sharedSlug: varchar('shared_slug', { length: 32 }).unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('designs_room_idx').on(table.roomId)]
);

export const designItems = pgTable(
  'design_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    designId: uuid('design_id')
      .notNull()
      .references(() => designs.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    position: integer('position').notNull(),
    rationale: text('rationale'),
    priceAtGeneration: numeric('price_at_generation', { precision: 10, scale: 2 }),
    currencyAtGeneration: varchar('currency_at_generation', { length: 3 }),
  },
  (table) => [index('design_items_design_idx').on(table.designId)]
);

export const publicDesigns = pgTable('public_designs', {
  designId: uuid('design_id')
    .primaryKey()
    .references(() => designs.id, { onDelete: 'cascade' }),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  likesCount: integer('likes_count').notNull().default(0),
  styleTags: jsonb('style_tags').$type<string[]>(),
});

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    designId: uuid('design_id')
      .notNull()
      .references(() => designs.id, { onDelete: 'cascade' }),
    role: chatRoleEnum('role').notNull(),
    content: text('content').notNull(),
    toolCalls: jsonb('tool_calls').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('chat_messages_design_idx').on(table.designId)]
);

export const productClicks = pgTable('product_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'set null' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOutcomes = pgTable('purchase_outcomes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  satisfied: boolean('satisfied'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
