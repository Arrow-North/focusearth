import {
  Infinity,
  Building2,
  Lamp,
  Lightbulb,
  BatteryCharging,
  Hourglass,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export interface CatalogueCategory {
  id: number;
  icon: LucideIcon;
  title: string;
  slug: string;
}

export const CATALOGUE_CATEGORIES: CatalogueCategory[] = [
  { id: 1, icon: Infinity, title: 'All Products', slug: 'all-products' },
  { id: 2, icon: Building2, title: 'Companies', slug: 'companies' },
  { id: 3, icon: Lamp, title: 'Fixtures', slug: 'fixtures' },
  { id: 4, icon: Lightbulb, title: 'Lamp', slug: 'lamp' },
  { id: 5, icon: BatteryCharging, title: 'Power Supply', slug: 'power-supply' },
  { id: 6, icon: Hourglass, title: 'Control', slug: 'control' },
  { id: 7, icon: HelpCircle, title: 'Accessories', slug: 'accessories' },
];

export const CATALOGUE_NAMES: Record<string, string> = Object.fromEntries(
  CATALOGUE_CATEGORIES.map((c) => [c.slug, c.title]),
);

export function getCatalogueName(slug: string | undefined): string {
  if (!slug) return 'Unknown';
  return CATALOGUE_NAMES[slug] ?? slug;
}
