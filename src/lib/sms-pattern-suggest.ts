// Suggest regex patterns for amount, merchant, and cleaning based on SMS content
// This is a utility for auto-generating parser rule patterns

export interface PatternSuggestions {
  amountPatterns: string[];
  merchantPatterns: string[];
  merchantCleaningPatterns: string[];
}

/**
 * Generate regex pattern suggestions for a given SMS message
 * @param smsText The SMS message body
 * @returns PatternSuggestions
 */
export function suggestPatternsFromSms(smsText: string): PatternSuggestions {
  const amountPatterns: string[] = [];
  const merchantPatterns: string[] = [];
  const merchantCleaningPatterns: string[] = [];

  // Amount: Look for currency and number patterns
  // INR, Rs, ₹, etc. followed by numbers
  if (/\b(Rs|INR|₹)\.?\s*[\d,.]+/i.test(smsText)) {
    amountPatterns.push('(?:Rs|INR|₹)\\.?\\s*([\\d,.]+)');
  }
  // Generic number pattern fallback
  amountPatterns.push('([\\d,.]+)');

  // Merchant: Look for 'at <merchant>', 'to <merchant>', 'in <merchant>', etc.
  const merchantRegexes = [
    /at ([A-Za-z0-9 &.'-]+)/i,
    /to ([A-Za-z0-9 &.'-]+)/i,
    /in ([A-Za-z0-9 &.'-]+)/i,
    /at ([^.,\n]+?)(?: on|\.|,|$)/i,
    /to ([^.,\n]+?)(?: on|\.|,|$)/i,
    /in ([^.,\n]+?)(?: on|\.|,|$)/i
  ];
  for (const regex of merchantRegexes) {
    const match = smsText.match(regex);
    if (match && match[1]) {
      // Escape special regex chars in merchant name
      const merchantPattern = regex.source.replace('[A-Za-z0-9 &.\'-]+', '(.+?)').replace('[^.,\n]+?', '(.+?)');
      merchantPatterns.push(merchantPattern);
    }
  }
  // Fallback: try to extract after 'at', 'to', 'in'
  if (/\b(at|to|in)\b/i.test(smsText)) {
    merchantPatterns.push('(at|to|in)\\s+(.+?)\\b');
  }

  // Merchant cleaning: Remove trailing date, numbers, or extra words
  // e.g., "at XYZ Store on 12-05-2025" => cleaning pattern: ^(.+?)\\s+on\\s+\d+
  if (/on \d{1,2}[-\/][A-Za-z0-9]{1,9}/i.test(smsText)) {
    merchantCleaningPatterns.push('^(.+?)\\s+on\\s+\\d+');
  }
  // Remove after 'on', 'dated', etc.
  if (/on [\w\s]+/i.test(smsText)) {
    merchantCleaningPatterns.push('^(.+?)\\s+on\\s+.+');
  }

  return {
    amountPatterns: Array.from(new Set(amountPatterns)),
    merchantPatterns: Array.from(new Set(merchantPatterns)),
    merchantCleaningPatterns: Array.from(new Set(merchantCleaningPatterns)),
  };
}
