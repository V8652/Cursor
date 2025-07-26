// Utility to normalize dates to UTC midnight for consistent group keys
export const normalizeDateToUTC = (date: Date | string): string => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
};

// Storage key for expanded state
const EXPANDED_STATE_KEY = 'transaction-groups-expanded';

// Get expanded state from localStorage
export const getExpandedState = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(EXPANDED_STATE_KEY) || '{}');
  } catch {
    return {};
  }
};

// Save expanded state to localStorage
export const saveExpandedState = (state: Record<string, boolean>) => {
  localStorage.setItem(EXPANDED_STATE_KEY, JSON.stringify(state));
};

// Update expanded state while preserving existing states
export const updateExpandedState = (
  currentState: Record<string, boolean>,
  groupKeys: Set<string>
): Record<string, boolean> => {
  const updated: Record<string, boolean> = {};
  for (const key of Object.keys(currentState)) {
    if (groupKeys.has(key)) {
      updated[key] = currentState[key];
    }
  }
  return updated;
}; 