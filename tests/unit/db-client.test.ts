import { expect, test } from 'vitest';
import { poolOptions } from '@/server/db/client';

test('pooled connections are recycled so a long-lived server never reuses a dead socket', () => {
  // Serverless instances stay warm between requests; the pooler or NAT silently drops idle sockets,
  // and a query on such a socket hangs until the platform kills the request (seen as 300 s /admin timeouts).
  expect(poolOptions(5)).toMatchObject({ prepare: false, max: 5, idle_timeout: 20, max_lifetime: 300, connect_timeout: 10 });
});
