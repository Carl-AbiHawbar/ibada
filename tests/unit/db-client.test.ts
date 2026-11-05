import { expect, test } from 'vitest';
import { poolOptions } from '@/server/db/client';

test('pooled connections are recycled so a long-lived server never reuses a dead socket', () => {
  // Serverless instances stay warm between requests; the pooler or NAT silently drops idle sockets,
  // and a query on such a socket hangs until the platform kills the request (seen as 300 s /admin timeouts).
  expect(poolOptions(5)).toMatchObject({ prepare: false, max: 5, idle_timeout: 20, max_lifetime: 300, connect_timeout: 10 });
});

test('one query at a time per connection, as the Supabase transaction pooler needs', () => {
  // postgres-js pipelines up to 100 queries on a busy connection; through the transaction pooler that
  // stalled the admin home page (a dozen parallel queries) and then every request waiting for the pool.
  expect(poolOptions(5).max_pipeline).toBe(1);
});
