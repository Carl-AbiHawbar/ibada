/** Pests shoppers can tick on the free-delivery form (order = display order). */
export const PEST_KEYS = [
  'cockroaches',
  'mosquitoes',
  'ants',
  'rodents',
  'flies',
  'bedBugs',
  'spiders',
  'flyingInsects',
  'crawlingBugs',
  'general',
] as const;

export type PestKey = (typeof PEST_KEYS)[number];

/** English labels for the admin and CSV exports. */
export const PEST_LABELS: Record<PestKey, string> = {
  cockroaches: 'Cockroaches',
  mosquitoes: 'Mosquitoes',
  ants: 'Ants',
  rodents: 'Mice / rats',
  flies: 'Flies',
  bedBugs: 'Bed bugs',
  spiders: 'Spiders',
  flyingInsects: 'Flying insects',
  crawlingBugs: 'Crawling bugs',
  general: 'General protection',
};
