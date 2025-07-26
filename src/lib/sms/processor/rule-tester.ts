import { SmsParserRule } from '@/types/sms-parser';
import { getSmsParserRules } from '../../sms-parser-rules';
import { extractMerchantName } from '../../merchant-extract';
import { ProcessedSmsMessage, RuleTestResult } from './types';
import { createTransactionFromSms } from './transaction-creator';

/**
 * Tests an SMS message against the parser rules and returns the result
 * @param smsText The SMS text content to test
 * @param sender The SMS sender
 * @param fromDate Optional start date for the date range
 * @param toDate Optional end date for the date range
 * @param customRules Optional array of rules to test with instead of loading from storage
 * @returns Object containing the processed expense and rule details
 */
export const testSmsWithRules = async (
  smsText: string,
  sender: string,
  fromDate?: Date,
  toDate?: Date,
  customRules?: SmsParserRule[]
): Promise<RuleTestResult | null> => {
  try {
    // Use custom rules if provided, otherwise load from storage
    const rules = customRules || await getSmsParserRules();
    
    // Group rules by transaction type
    const expenseRules = rules.filter(rule => rule.transactionType === 'expense');
    const incomeRules = rules.filter(rule => rule.transactionType === 'income');
    
    // Sort rules by priority (highest first)
    const sortedExpenseRules = [...expenseRules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const sortedIncomeRules = [...incomeRules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Try expense rules first
    const expenseResult = await tryRules(smsText, sender, sortedExpenseRules, fromDate, toDate, 'expense');
    if (expenseResult) {
      return expenseResult;
    }
    
    // If no expense match, try income rules
    const incomeResult = await tryRules(smsText, sender, sortedIncomeRules, fromDate, toDate, 'income');
    if (incomeResult) {
      return incomeResult;
    }
    
    return null;
  } catch (error) {
    console.error('Error testing SMS with rules:', error);
    return null;
  }
};

async function tryRules(
  smsText: string,
  sender: string,
  rules: SmsParserRule[],
  fromDate?: Date,
  toDate?: Date,
  type: 'expense' | 'income' = 'expense'
): Promise<RuleTestResult | null> {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    
    try {
      // Check if sender matches
      const senderPatterns = Array.isArray(rule.senderMatch) ? rule.senderMatch : [rule.senderMatch];
      const senderMatches = senderPatterns.some(pattern => {
        if (!pattern || pattern.trim() === '') return false;
        try {
          return sender.toLowerCase().includes(pattern.toLowerCase()) || 
                 new RegExp(pattern, 'i').test(sender);
        } catch (error) {
          console.error(`Invalid sender pattern: ${pattern}`, error);
          return false;
        }
      });
      
      if (!senderMatches) continue;
      
      // Check skip conditions
      if (rule.skipCondition) {
        const skipConditions = Array.isArray(rule.skipCondition) ? rule.skipCondition : [rule.skipCondition];
        const shouldSkip = skipConditions.some(condition => {
          if (!condition || condition.trim() === '') return false;
          try {
            return smsText.toLowerCase().includes(condition.toLowerCase()) ||
                   (condition.startsWith('/') && condition.lastIndexOf('/') > 1 &&
                    new RegExp(condition.slice(1, condition.lastIndexOf('/')), 
                             condition.slice(condition.lastIndexOf('/') + 1) || 'i')
                    .test(smsText));
          } catch (error) {
            console.error(`Invalid skip condition: ${condition}`, error);
            return false;
          }
        });
        
        if (shouldSkip) continue;
      }
      
      // Try to extract amount
      let amount: number | null = null;
      const amountPatterns = Array.isArray(rule.amountRegex) ? rule.amountRegex : [rule.amountRegex];
      
      for (const pattern of amountPatterns) {
        try {
          const amountRegex = new RegExp(pattern, 'i');
          const match = smsText.match(amountRegex);
          if (match && match[1]) {
            amount = Math.abs(parseFloat(match[1].replace(/,/g, '')));
            if (!isNaN(amount)) break;
          }
        } catch (error) {
          console.error(`Invalid amount pattern: ${pattern}`, error);
        }
      }
      
      if (!amount) continue;
      
      // Extract merchant name
      let merchantName = "Unknown Merchant";
      
      // Try merchant name extraction methods in order
      if (rule.merchantStartText || rule.merchantEndText) {
        merchantName = extractMerchantName(
          smsText,
          rule.merchantStartText,
          rule.merchantEndText,
          rule.merchantStartIndex || 1
        ) || "Unknown Merchant";
      }
      
      if (!merchantName || merchantName === "Unknown Merchant") {
        if (rule.merchantCondition) {
          const merchantPatterns = Array.isArray(rule.merchantCondition) ? 
            rule.merchantCondition : [rule.merchantCondition];
          
          for (const pattern of merchantPatterns) {
            try {
              const merchantRegex = new RegExp(pattern, 'i');
              const match = smsText.match(merchantRegex);
              if (match && match[1]) {
                merchantName = match[1].trim();
                break;
              }
            } catch (error) {
              console.error(`Invalid merchant pattern: ${pattern}`, error);
            }
          }
        }
      }
      
      // Apply merchant name cleaning patterns
      if (merchantName && rule.merchantCommonPatterns) {
        const commonPatterns = Array.isArray(rule.merchantCommonPatterns) ?
          rule.merchantCommonPatterns : [rule.merchantCommonPatterns];
          
        for (const pattern of commonPatterns) {
          try {
            const cleaningRegex = new RegExp(pattern, 'i');
            const match = merchantName.match(cleaningRegex);
            if (match && match[1]) {
              merchantName = match[1].trim();
              break;
            }
          } catch (error) {
            console.error(`Invalid merchant cleaning pattern: ${pattern}`, error);
          }
        }
      }
      
      // Create transaction date
      let transactionDate = new Date();
      if (fromDate && toDate) {
        const midDate = new Date((fromDate.getTime() + toDate.getTime()) / 2);
        transactionDate = midDate;
      }
      
      // Create transaction object
      const smsData: ProcessedSmsMessage = {
        body: smsText,
        date: transactionDate.toISOString(),
        amount: amount,
        merchantName: merchantName,
        sender: sender
      };
      
      // Create transaction with the appropriate type
      const transaction = await createTransactionFromSms(smsData, rule.paymentBank, type);
      
      return {
        expense: transaction,
        matchedRule: rule,
        transactionType: type
      };
    } catch (error) {
      console.error(`Error processing ${type} rule ${rule.name}:`, error);
    }
  }
  
  return null;
} 