import postgres from 'postgres';
import { loadEnv } from '../lib/env.js';

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing.');
}

const sql = postgres(connectionString, { max: 1, connect_timeout: 5 });

async function main() {
  await sql`select 1`;
  console.info('Postgres connection ok.');

  await sql`create extension if not exists vector`;
  const [{ installed }] = await sql<[{ installed: boolean }]>`
    select exists (
      select 1 from pg_extension where extname = 'vector'
    ) as installed
  `;

  if (!installed) {
    throw new Error('pgvector extension could not be enabled.');
  }

  console.info('pgvector extension enabled.');
}

function describeError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code) return String(code);
  }
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

try {
  await main();
} catch (error) {
  console.error(`Database health check failed: ${describeError(error)}`);
  console.error('Is Postgres running? Try: docker compose up -d');
  process.exitCode = 1;
} finally {
  await sql.end();
}
