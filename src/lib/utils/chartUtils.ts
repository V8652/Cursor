// Chart utility functions for color, icon, and label helpers
import { categoryIconMap, getCategoryIcon, CategoryIconName } from '@/lib/category-icons';

// Default and colorblind-friendly palettes
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  groceries: '#4ade80',
  utilities: '#60a5fa',
  entertainment: '#c084fc',
  transportation: '#fbbf24',
  dining: '#f87171',
  shopping: '#818cf8',
  health: '#f472b6',
  travel: '#22d3ee',
  housing: '#34d399',
  education: '#fb923c',
  subscriptions: '#a78bfa',
  other: '#94a3b8',
  snacks: '#9b5de5',
  'home-expenses': '#fd7e14',
  personal: '#6366f1',
  'health/medical': '#ec4899',
  loan: '#fee440',
  'utilities/hardware': '#8b5cf6',
  'dmart/glossary': '#10b981',
};

export const COLORBLIND_PALETTE: string[] = [
  '#377eb8', '#e41a1c', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'
];

export function getCategoryColor(
  category: string,
  customColors: Record<string, string> = {},
  index: number = 0
): string {
  return customColors[category] || DEFAULT_CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLORS.other;
}

export function getCategoryIconName(category: string, customIcons: Record<string, CategoryIconName> = {}): CategoryIconName {
  if (customIcons[category]) return customIcons[category];
  // getCategoryIcon returns a LucideIcon, so we fallback to 'DollarSign' if not found
  // Try to infer from categoryIconMap keys
  const lower = category.toLowerCase();
  for (const key in categoryIconMap) {
    if (key.toLowerCase() === lower) return key as CategoryIconName;
  }
  return 'DollarSign';
}

export function getCategoryLabel(category: string): string {
  return category.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
];

export function formatChartCurrency(amount: number, currency: string = 'INR'): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

export function exportChartDataAsCSV(data: Array<{[key: string]: any}>, columns: string[]): string {
  const header = columns.join(',');
  const rows = data.map(row => columns.map(col => row[col]).join(','));
  return [header, ...rows].join('\n');
} 