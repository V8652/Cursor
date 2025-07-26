
/**
 * Format a number as currency with the specified currency code
 */
export const formatCurrency = (amount: number, currencyCode: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};
