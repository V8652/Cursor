
/**
 * Format a number as a currency with the specified currency code
 * If isExpense is true, it will add a negative sign to display the value
 * Otherwise it will be shown as positive regardless of the sign of the amount
 */
export function formatCurrency(amount: number, currency: string = 'INR', isExpense: boolean = false): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency, // Use the provided currency
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  // Format value as positive, and apply negative sign only for expenses in display
  const formattedValue = formatter.format(Math.abs(amount));
  return isExpense ? `-${formattedValue}` : formattedValue;
}

/**
 * Get category color from the category colors map
 * If not found, return a default color
 */
export function getCategoryColor(category: string | undefined, categoryColors: Record<string, string> = {}): string {
  if (!category) return '#8E9196'; // Default gray
  return categoryColors[category] || '#8E9196';
}
