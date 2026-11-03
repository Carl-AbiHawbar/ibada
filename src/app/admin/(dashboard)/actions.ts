'use server';

import { z } from 'zod';
import { adminSearch, type AdminSearchResult } from '@/server/admin/search';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';

const searchSchema = z.string().max(80);

/** Command palette search (Ctrl/Cmd+K). */
export async function searchAction(input: unknown): Promise<AdminSearchResult> {
  const { user } = await requireAdmin('home');
  const q = searchSchema.safeParse(input);
  return adminSearch(getDb(), q.success ? q.data : '', user.role);
}
