import { SmsParserRule } from '@/types/sms-parser';

// Types for SMS scan history
export interface SmsDateRange {
  from: Date;
  to?: Date;
}

export interface ScanHistoryEntry {
  id: string;
  date: Date;
  range: SmsDateRange;
  transactions: any[];
  error?: string;
  source?: 'dashboard' | 'scanner'; // Track where the scan was initiated from
}

export interface ScanResult {
  id: string;
  date: string;
  amount: number;
  category: string;
  smsSnippet: string;
  ruleMatched?: string;
}

// LocalStorage keys
const SMS_SCAN_HISTORY_KEY = 'smsScanHistory';
const SMS_SCAN_RESULTS_KEY = 'smsScanResults';

// Load scan history from localStorage
export function loadScanHistory(): ScanHistoryEntry[] {
  try {
    const storedHistory = localStorage.getItem(SMS_SCAN_HISTORY_KEY);
    if (storedHistory) {
      // Convert date strings back to Date objects
      const parsed = JSON.parse(storedHistory).map((entry: any) => ({
        ...entry,
        date: new Date(entry.date),
        range: {
          from: new Date(entry.range.from),
          to: new Date(entry.range.to)
        }
      }));
      return parsed;
    }
  } catch (error) {
    console.error('Error loading scan history:', error);
  }
  return [];
}

// Save scan history to localStorage
export function saveScanHistory(history: ScanHistoryEntry[]): void {
  try {
    localStorage.setItem(SMS_SCAN_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving scan history:', error);
  }
}

// Add a new scan entry to history
export function addScanHistoryEntry(
  transactions: any[],
  dateRange: SmsDateRange,
  error?: string,
  source: 'dashboard' | 'scanner' = 'dashboard'
): void {
  const history = loadScanHistory();
  const newEntry: ScanHistoryEntry = {
    id: Date.now().toString(),
    date: new Date(),
    range: { ...dateRange },
    transactions,
    error,
    source
  };
  
  // Add to beginning of history
  history.unshift(newEntry);
  
  // Keep only last 50 entries to prevent localStorage from getting too large
  const trimmedHistory = history.slice(0, 50);
  
  saveScanHistory(trimmedHistory);
}

// Load scan results from localStorage
export function loadScanResults(): ScanResult[] {
  try {
    const stored = localStorage.getItem(SMS_SCAN_RESULTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading scan results:', error);
  }
  return [];
}

// Save scan results to localStorage
export function saveScanResults(results: ScanResult[]): void {
  try {
    localStorage.setItem(SMS_SCAN_RESULTS_KEY, JSON.stringify(results));
  } catch (error) {
    console.error('Error saving scan results:', error);
  }
}

// Clear scan history
export function clearScanHistory(): void {
  try {
    localStorage.removeItem(SMS_SCAN_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing scan history:', error);
  }
}

// Clear scan results
export function clearScanResults(): void {
  try {
    localStorage.removeItem(SMS_SCAN_RESULTS_KEY);
  } catch (error) {
    console.error('Error clearing scan results:', error);
  }
} 