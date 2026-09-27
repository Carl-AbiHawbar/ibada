import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      'server-only': path.resolve(import.meta.dirname, 'tests/helpers/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      APP_ENV: 'test',
      DATABASE_URL: 'postgres://unused',
      BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret!!',
      SITE_URL: 'http://localhost:3000',
    },
  },
});
