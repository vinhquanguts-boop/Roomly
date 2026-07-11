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

export const authUser = pgTable('auth_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authSession = pgTable(
  'auth_session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
  },
  (table) => [index('auth_session_user_idx').on(table.userId)]
);

export const authAccount = pgTable(
  'auth_account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('auth_account_user_idx').on(table.userId)]
);

export const authVerification = pgTable(
  'auth_verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('auth_verification_identifier_idx').on(table.identifier)]
);

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
    productUrl: text('product_url'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    deliveryEstimate: text('delivery_estimate'),
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
    ownerSessionId: text('owner_session_id'),
    ownerAuthUserId: text('owner_auth_user_id').references(() => authUser.id, { onDelete: 'set null' }),
    savedAt: timestamp('saved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('designs_room_idx').on(table.roomId),
    index('designs_owner_session_idx').on(table.ownerSessionId),
    index('designs_owner_auth_user_idx').on(table.ownerAuthUserId),
    index('designs_saved_at_idx').on(table.savedAt),
  ]
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
  productClickId: uuid('product_click_id')
    .unique()
    .references(() => productClicks.id, { onDelete: 'cascade' }),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }),
  ownerSessionId: text('owner_session_id'),
  ownerAuthUserId: text('owner_auth_user_id').references(() => authUser.id, { onDelete: 'set null' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  purchased: boolean('purchased'),
  satisfied: boolean('satisfied'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('purchase_outcomes_design_idx').on(table.designId),
  index('purchase_outcomes_owner_session_idx').on(table.ownerSessionId),
  index('purchase_outcomes_owner_auth_user_idx').on(table.ownerAuthUserId),
]);
