
import { format } from 'date-fns';

/**
 * Format a date to a readable string
 */
export const formatDate = (date: Date): string => {
  return format(date, 'MMM d, yyyy');
};
