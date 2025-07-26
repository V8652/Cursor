import { Transaction } from '@/types';
import { SmsParserRule } from '@/types/sms-parser';

/**
 * Interface for the processed SMS message structure
 */
export interface ProcessedSmsMessage {
  body: string;
  date: string;
  amount: number;
  merchantName: string;
  sender?: string;
}

export interface RuleTestResult {
  expense: Transaction;
  matchedRule: SmsParserRule;
  transactionType: 'expense' | 'income';
} 