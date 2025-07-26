// Merchant extraction utility for SMS parser rules

/**
 * Extract merchant name from text using start/end markers and index.
 * @param text SMS content
 * @param startText Start marker (case-insensitive)
 * @param endText End marker (case-insensitive)
 * @param startIndex 1-based index of which occurrence of startText to use
 * @returns Extracted merchant name or empty string
 */
export function extractMerchantName(
  text: string,
  startText?: string,
  endText?: string,
  startIndex: number = 1
): string {
  if (!text) return '';
  const lowerText = text.toLowerCase();
  let startIdx = 0;
  let endIdx = text.length;

  if (startText) {
    let idx = -1;
    let count = 0;
    let searchFrom = 0;
    const lowerStart = startText.toLowerCase();
    while (count < startIndex) {
      idx = lowerText.indexOf(lowerStart, searchFrom);
      if (idx === -1) break;
      count++;
      searchFrom = idx + lowerStart.length;
    }
    if (idx === -1) return '';
    startIdx = idx + lowerStart.length;
  }

  if (endText) {
    const lowerEnd = endText.toLowerCase();
    const afterStart = lowerText.indexOf(lowerEnd, startIdx);
    if (afterStart !== -1) {
      endIdx = afterStart;
    }
  }

  if (startIdx >= endIdx) return '';
  return text.substring(startIdx, endIdx).trim();
}

/**
 * Try multiple merchant extraction patterns and return the first successful match.
 * @param text SMS content
 * @param extractions Array of merchant extraction patterns to try
 * @returns First successful merchant name extraction or empty string
 */
export function tryMerchantExtractions(
  text: string,
  extractions: { startText?: string; endText?: string; startIndex?: number }[]
): string {
  if (!text || !extractions || extractions.length === 0) return '';
  
  for (const extraction of extractions) {
    const merchantName = extractMerchantName(
      text,
      extraction.startText,
      extraction.endText,
      extraction.startIndex || 1
    );
    
    if (merchantName) {
      return merchantName;
    }
  }
  
  return '';
}

/**
 * Advanced merchant extraction engine.
 * @param text SMS content
 * @param userConfirmedMerchants Optional: Array of past confirmed merchant names for pattern learning
 * @returns { merchant: string, startText?: string, endText?: string, startIndex?: number, candidates?: string[] }
 */
export function extractMerchantAdvanced(
  text: string,
  userConfirmedMerchants?: string[]
): {
  merchant: string;
  startText?: string;
  endText?: string;
  startIndex?: number;
  candidates?: string[];
} {
  if (!text) return { merchant: 'Unknown Merchant' };

  // 1. Define patterns and learn from user history
  const defaultMarkers = [
    'on', 'at', 'from', 'towards', 'to', 'via', 'merchant:', 'spent at'
  ];
  let learnedMarkers: string[] = [];
  if (userConfirmedMerchants && userConfirmedMerchants.length > 0) {
    // Learn common patterns before merchant names
    const beforePatterns = userConfirmedMerchants
      .map(m => {
        const idx = text.toLowerCase().indexOf(m.toLowerCase());
        if (idx > 0) {
          // Get up to 10 chars before merchant name
          return text.substring(Math.max(0, idx - 10), idx).trim().split(/\s/).pop();
        }
        return undefined;
      })
      .filter(Boolean) as string[];
    learnedMarkers = Array.from(new Set(beforePatterns));
  }
  const allMarkers = Array.from(new Set([...learnedMarkers, ...defaultMarkers])).filter(Boolean);

  // 2. Multi-pattern detection
  const candidates: {
    merchant: string;
    startText: string;
    endText: string;
    startIndex: number;
    startIdx: number;
    endIdx: number;
  }[] = [];

  const lowerText = text.toLowerCase();

  for (const marker of allMarkers) {
    let searchFrom = 0;
    let startIndex = 1;
    while (true) {
      const markerIdx = lowerText.indexOf(marker.toLowerCase(), searchFrom);
      if (markerIdx === -1) break;
      // Find the start of merchant name (after marker)
      let startIdx = markerIdx + marker.length;
      // Skip whitespace and colons
      while (text[startIdx] === ' ' || text[startIdx] === ':') startIdx++;
      // Find end: next punctuation or EOL
      const endMatch = /[.,:\n]/g;
      endMatch.lastIndex = startIdx;
      const endResult = endMatch.exec(text);
      let endIdx = endResult ? endResult.index : text.length;
      let merchantCandidate = text.substring(startIdx, endIdx).trim();

      // Clean candidate
      const cleaned = cleanMerchantName(merchantCandidate);

      // Only consider if not empty or generic
      if (
        cleaned &&
        !isDate(cleaned) &&
        !isAmount(cleaned) &&
        !isCardNumber(cleaned) &&
        cleaned.length > 2
      ) {
        candidates.push({
          merchant: cleaned,
          startText: marker,
          endText: text[endIdx] || '',
          startIndex,
          startIdx,
          endIdx,
        });
      }
      searchFrom = markerIdx + marker.length;
      startIndex++;
    }
  }

  // 3. Prioritize last valid candidate
  let best = candidates.length > 0 ? candidates[candidates.length - 1] : undefined;

  // 4. Fallback: try to extract before fallback keywords
  if (!best) {
    const fallbackKeywords = ['Limit:', 'Balance:', 'Avl'];
    for (const keyword of fallbackKeywords) {
      const idx = text.indexOf(keyword);
      if (idx > 0) {
        let candidate = text.substring(0, idx).trim();
        candidate = cleanMerchantName(candidate);
        if (candidate && !isDate(candidate) && !isAmount(candidate) && !isCardNumber(candidate)) {
          best = {
            merchant: candidate,
            startText: '',
            endText: keyword,
            startIndex: 1,
            startIdx: 0,
            endIdx: idx,
          };
          break;
        }
      }
    }
  }

  // 5. Final fallback
  if (!best) {
    return { merchant: 'Unknown Merchant', candidates: [] };
  }

  return {
    merchant: best.merchant,
    startText: best.startText,
    endText: best.endText,
    startIndex: best.startIndex,
    candidates: candidates.map(c => c.merchant),
  };
}

// --- Helper functions ---

function cleanMerchantName(merchant: string): string {
  let m = merchant.trim();
  // Remove trailing dates
  m = m.replace(/\s+(\d{1,2}-\d{1,2}-\d{2,4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/, '');
  // Remove currency values
  m = m.replace(/\s+\d+\s*(INR|USD|EUR)?$/, '');
  // Remove card numbers (XX0000)
  m = m.replace(/\s+XX\d{4}$/, '');
  // Remove known keywords
  const keywords = ['Avl', 'Limit:', 'Balance:'];
  for (const keyword of keywords) {
    const idx = m.indexOf(keyword);
    if (idx !== -1) {
      m = m.substring(0, idx).trim();
    }
  }
  // Remove leading/trailing punctuation
  m = m.replace(/^[\s:.,-]+|[\s:.,-]+$/g, '');
  return m;
}

function isDate(str: string): boolean {
  return /\b(\d{1,2}-[A-Za-z]{3}-\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/.test(str);
}

function isAmount(str: string): boolean {
  return /\b(INR|USD|EUR)?\s*\d+[,.]?\d*\b/.test(str);
}

function isCardNumber(str: string): boolean {
  return /XX\d{4}/.test(str);
}
