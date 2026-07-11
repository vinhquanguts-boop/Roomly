import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { getDb } from '../db/index.js';
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from '../db/schema.js';
import { loadEnv } from './env.js';

loadEnv();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const authSecret = process.env.BETTER_AUTH_SECRET?.trim();

if (process.env.NODE_ENV === 'production' && !authSecret) {
  throw new Error('BETTER_AUTH_SECRET is required in production.');
}

const trustedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: 'Roomly',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:8787',
  secret: authSecret || 'roomly-dev-secret-change-before-production',
  trustedOrigins,
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
});

export type AuthSession = typeof auth.$Infer.Session;
