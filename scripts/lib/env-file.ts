import { existsSync } from 'node:fs';
import path from 'node:path';

/** Load .env.local into process.env for CLI scripts (variables already set win). */
export function loadLocalEnv(): void {
  const file = path.resolve(process.cwd(), '.env.local');
  if (existsSync(file)) process.loadEnvFile(file);
}
