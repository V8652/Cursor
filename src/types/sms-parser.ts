export interface SmsParserRule {
  id?: string;
  name: string;
  enabled: boolean;
  paymentBank: string;
  priority: number;
  transactionType: 'expense' | 'income';
  senderMatch: string | string[];
  amountRegex: string | string[];
  merchantStartText?: string;
  merchantEndText?: string;
  merchantStartIndex?: number;
  merchantExtractions?: {
    startText?: string;
    endText?: string;
    startIndex?: number;
  }[];
  merchantCommonPatterns?: string | string[];
  skipCondition?: string | string[];
  lastModified?: string;
  updatedAt?: number;
  createdAt?: number;
  merchantCondition?: string | string[];
  successCount?: number;
  lastError?: string;
}

export interface SmsTransaction {
  id: string;
  amount: number;
  merchantName: string;
  date: string;
  type: 'expense' | 'income';
  bank: string;
  smsText: string;
  smsSender: string;
  createdAt: number;
  updatedAt: number;
} 