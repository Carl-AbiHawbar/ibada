import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import { getEnv } from '@/env';
import * as schema from './schema';

export type Schema = typeof schema;
/** Any Drizzle Postgres database (postgres-js in the app, PGlite in tests) or transaction. */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

/**
 * Pool settings for the Supabase pooler: no prepared statements, and idle or old sockets closed by us.
 * A warm serverless instance otherwise reuses a socket the pooler already dropped, and the query hangs
 * until the request times out. (Session mode is chosen in databaseUrlFrom.)
 */
export function poolOptions(max: number) {
  return { prepare: false, max, idle_timeout: 20, max_lifetime: 60 * 5, connect_timeout: 10, onnotice: () => {} };
}

/** Open a dedicated connection pool, e.g. for CLI scripts that must close it when done. */
export function createDb(url: string, max = 5): { db: Db; close: () => Promise<void> } {
  const client = postgres(url, poolOptions(max));
  return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 5 }) };
}

const holder = globalThis as unknown as { __ibadaDb?: Db };

/** Shared app database, created lazily on first use. */
export function getDb(): Db {
  holder.__ibadaDb ??= createDb(getEnv().DATABASE_URL).db;
  return holder.__ibadaDb;
}
