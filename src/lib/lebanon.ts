export type Locale = 'en' | 'ar';

export const GOVERNORATES = [
  { id: 'beirut', en: 'Beirut', ar: 'بيروت', districts: [{ id: 'beirut', en: 'Beirut', ar: 'بيروت' }] },
  {
    id: 'mount-lebanon',
    en: 'Mount Lebanon',
    ar: 'جبل لبنان',
    districts: [
      { id: 'baabda', en: 'Baabda', ar: 'بعبدا' },
      { id: 'aley', en: 'Aley', ar: 'عاليه' },
      { id: 'chouf', en: 'Chouf', ar: 'الشوف' },
      { id: 'metn', en: 'Metn', ar: 'المتن' },
      { id: 'keserwan', en: 'Keserwan', ar: 'كسروان' },
      { id: 'jbeil', en: 'Jbeil', ar: 'جبيل' },
    ],
  },
  {
    id: 'north',
    en: 'North',
    ar: 'الشمال',
    districts: [
      { id: 'tripoli', en: 'Tripoli', ar: 'طرابلس' },
      { id: 'zgharta', en: 'Zgharta', ar: 'زغرتا' },
      { id: 'koura', en: 'Koura', ar: 'الكورة' },
      { id: 'bsharri', en: 'Bsharri', ar: 'بشري' },
      { id: 'batroun', en: 'Batroun', ar: 'البترون' },
      { id: 'minieh-danniyeh', en: 'Minieh-Danniyeh', ar: 'المنية-الضنية' },
    ],
  },
  { id: 'akkar', en: 'Akkar', ar: 'عكار', districts: [{ id: 'akkar', en: 'Akkar', ar: 'عكار' }] },
  {
    id: 'bekaa',
    en: 'Bekaa',
    ar: 'البقاع',
    districts: [
      { id: 'zahle', en: 'Zahle', ar: 'زحلة' },
      { id: 'west-bekaa', en: 'West Bekaa', ar: 'البقاع الغربي' },
      { id: 'rashaya', en: 'Rashaya', ar: 'راشيا' },
    ],
  },
  {
    id: 'baalbek-hermel',
    en: 'Baalbek-Hermel',
    ar: 'بعلبك-الهرمل',
    districts: [
      { id: 'baalbek', en: 'Baalbek', ar: 'بعلبك' },
      { id: 'hermel', en: 'Hermel', ar: 'الهرمل' },
    ],
  },
  {
    id: 'south',
    en: 'South',
    ar: 'الجنوب',
    districts: [
      { id: 'saida', en: 'Saida', ar: 'صيدا' },
      { id: 'tyre', en: 'Tyre', ar: 'صور' },
      { id: 'jezzine', en: 'Jezzine', ar: 'جزين' },
    ],
  },
  {
    id: 'nabatieh',
    en: 'Nabatieh',
    ar: 'النبطية',
    districts: [
      { id: 'nabatieh', en: 'Nabatieh', ar: 'النبطية' },
      { id: 'marjeyoun', en: 'Marjeyoun', ar: 'مرجعيون' },
      { id: 'hasbaya', en: 'Hasbaya', ar: 'حاصبيا' },
      { id: 'bint-jbeil', en: 'Bint Jbeil', ar: 'بنت جبيل' },
    ],
  },
] as const;

export type GovernorateId = (typeof GOVERNORATES)[number]['id'];
export type DistrictId = (typeof GOVERNORATES)[number]['districts'][number]['id'];

export const GOVERNORATE_IDS = GOVERNORATES.map((g) => g.id) as [GovernorateId, ...GovernorateId[]];

export function isValidDistrict(governorate: string, district: string): boolean {
  const g = GOVERNORATES.find((x) => x.id === governorate);
  return !!g && g.districts.some((d) => d.id === district);
}

export function governorateName(id: GovernorateId, locale: Locale): string {
  return GOVERNORATES.find((g) => g.id === id)?.[locale] ?? id;
}

export function districtName(id: DistrictId, locale: Locale): string {
  for (const g of GOVERNORATES) {
    const d = g.districts.find((x) => x.id === id);
    if (d) return d[locale];
  }
  return id;
}
