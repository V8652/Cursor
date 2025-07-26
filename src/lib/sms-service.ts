import { addTransaction, addExpense, addIncome } from '@/lib/db';
import { Expense, Income, Transaction } from '@/types';
import { getSmsParserRules, updateSmsParserRule } from './sms-parser-rules';
import { SmsParserRule } from '@/types/sms-parser';
import { toast } from 'sonner';
import { isTransactionDuplicate, createTransactionFromSms } from './sms-transaction-processor';
import { dbEvents, DatabaseEvent } from './db-event';
import { extractMerchantName, tryMerchantExtractions } from './merchant-extract';

export class SmsService {
  static async extractExpenseFromText(text: string, sender: string, rules: SmsParserRule[]): Promise<{ 
    amount: number | null; 
    merchantName: string; 
    usedRule?: SmsParserRule;
    transactionType?: 'expense' | 'income';
  }> {
    console.log('Extracting expense from text:', text, 'sender:', sender, 'Using rules:', rules);
    
    // Group rules by transaction type
    const expenseRules = rules.filter(rule => rule.transactionType === 'expense');
    const incomeRules = rules.filter(rule => rule.transactionType === 'income');
    
    // Try expense rules first
    const expenseResult = await this.tryRules(text, sender, expenseRules);
    if (expenseResult.amount) {
      return { ...expenseResult, transactionType: 'expense' };
    }
    
    // If no expense match, try income rules
    const incomeResult = await this.tryRules(text, sender, incomeRules);
    if (incomeResult.amount) {
      return { ...incomeResult, transactionType: 'income' };
    }
    
    console.log('No rules matched the message');
    return { amount: null, merchantName: "Unknown Merchant" };
  }

  private static async tryRules(text: string, sender: string, rules: SmsParserRule[]): Promise<{ 
    amount: number | null; 
    merchantName: string; 
    usedRule?: SmsParserRule;
  }> {
    // Check global skip conditions first - check across all rules
    for (const rule of rules) {
      if (rule.skipCondition) {
        const skipPatterns = Array.isArray(rule.skipCondition) ? rule.skipCondition : [rule.skipCondition];
        
        for (const pattern of skipPatterns) {
          if (!pattern || pattern.trim() === '') continue;
          
          try {
            // Try simple text match first
            if (pattern && text.toLowerCase().includes(pattern.toLowerCase())) {
              console.log(`Message skipped due to global skip condition: ${pattern}`);
              return { amount: null, merchantName: "Unknown Merchant" };
            }
            
            // Try regex match if it looks like a regex pattern
            if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 1) {
              const regexStr = pattern.slice(1, pattern.lastIndexOf('/'));
              const flags = pattern.slice(pattern.lastIndexOf('/') + 1);
              try {
                const regex = new RegExp(regexStr, flags || 'i');
                if (regex.test(text)) {
                  console.log(`Message skipped due to global regex skip condition: ${pattern}`);
                  return { amount: null, merchantName: "Unknown Merchant" };
                }
              } catch (e) {
                console.error(`Invalid regex pattern: ${pattern}`, e);
              }
            }
          } catch (error) {
            console.error(`Error applying skip condition pattern: ${pattern}`, error);
          }
        }
      }
    }
    
    for (const rule of rules) {
      if (!rule.enabled) {
        console.log(`Skipping disabled rule: ${rule.name}`);
        continue;
      }

      // Check if sender matches the rule's sender patterns
      const senderPatterns = Array.isArray(rule.senderMatch) ? rule.senderMatch : [rule.senderMatch];
      const senderMatches = senderPatterns.some(pattern => {
        if (!pattern || pattern.trim() === '') return false;
        try {
          // Try exact match first
          if (sender.toLowerCase().includes(pattern.toLowerCase())) {
            return true;
          }
          // Try regex match if exact match fails
          const regex = new RegExp(pattern, 'i');
          return regex.test(sender);
        } catch (error) {
          console.error(`Invalid sender match pattern: ${pattern}`, error);
          return false;
        }
      });

      if (!senderMatches) {
        console.log(`Sender "${sender}" does not match patterns for rule: ${rule.name}`);
        continue;
      }
      
      // Check rule-specific skip conditions before continuing with this rule
      if (rule.skipCondition) {
        const skipConditions = Array.isArray(rule.skipCondition) 
          ? rule.skipCondition 
          : [rule.skipCondition];
        
        let shouldSkipRule = false;
        for (const condition of skipConditions) {
          if (!condition || condition.trim() === '') continue;
          
          try {
            // Simple text match
            if (text.toLowerCase().includes(condition.toLowerCase())) {
              console.log(`Rule "${rule.name}" skipped due to skip condition match: ${condition}`);
              shouldSkipRule = true;
              break;
            }
            
            // Try regex match if it looks like a regex pattern
            if (condition.startsWith('/') && condition.lastIndexOf('/') > 1) {
              const regexStr = condition.slice(1, condition.lastIndexOf('/'));
              const flags = condition.slice(condition.lastIndexOf('/') + 1);
              try {
                const regex = new RegExp(regexStr, flags || 'i');
                if (regex.test(text)) {
                  console.log(`Rule "${rule.name}" skipped due to regex skip condition: ${condition}`);
                  shouldSkipRule = true;
                  break;
                }
              } catch (e) {
                console.error(`Invalid regex skip condition: ${condition}`, e);
              }
            }
          } catch (error) {
            console.error(`Error applying rule skip condition: ${condition}`, error);
          }
        }
        
        if (shouldSkipRule) {
          console.log(`Skipping rule "${rule.name}" due to skip condition match`);
          continue;
        }
      }
      
      try {
        console.log(`Trying rule: ${rule.name}`);
        
        // Try to extract amount using rule's patterns
        let amount: number | null = null;
        const amountPatterns = Array.isArray(rule.amountRegex) ? rule.amountRegex : [rule.amountRegex];
        
        for (const pattern of amountPatterns) {
          try {
            console.log(`Trying amount pattern: ${pattern}`);
            const amountRegex = new RegExp(pattern, 'i');
            const match = text.match(amountRegex);
            if (match && match[1]) {
              // Always store positive amount regardless of sign in message
              amount = Math.abs(parseFloat(match[1].replace(/,/g, '')));
              if (!isNaN(amount)) {
                console.log(`Successfully extracted amount: ${amount}`);
                break;
              }
            }
          } catch (error) {
            console.error(`Invalid amount regex pattern: ${pattern}`, error);
          }
        }

        if (!amount) {
          console.log('No amount found with this rule, trying next rule');
          continue;
        }

        // Extract merchant name using rule's patterns
        let merchantName = "Unknown Merchant";
        if (rule.merchantExtractions && rule.merchantExtractions.length > 0) {
          merchantName = tryMerchantExtractions(text, rule.merchantExtractions) || "Unknown Merchant";
        }
        
        if (!merchantName || merchantName === "Unknown Merchant") {
          if (rule.merchantCondition) {
            const merchantPatterns = Array.isArray(rule.merchantCondition) ? 
              rule.merchantCondition : [rule.merchantCondition];
            for (const pattern of merchantPatterns) {
              try {
                const merchantRegex = new RegExp(pattern, 'i');
                const match = text.match(merchantRegex);
                if (match && match[1]) {
                  merchantName = match[1].trim();
                  break;
                }
              } catch (error) {
                console.error(`Invalid merchant regex pattern: ${pattern}`, error);
              }
            }
          }
        }

        // Apply merchant name cleaning patterns if available
        if (merchantName && rule.merchantCommonPatterns) {
          for (const pattern of rule.merchantCommonPatterns) {
            try {
              console.log(`Applying merchant cleaning pattern: ${pattern}`);
              const cleaningRegex = new RegExp(pattern, 'i');
              const match = merchantName.match(cleaningRegex);
              if (match && match[1]) {
                merchantName = match[1].trim();
                console.log(`Cleaned merchant name: ${merchantName}`);
                break;
              }
            } catch (error) {
              console.error(`Invalid merchant cleaning pattern: ${pattern}`, error);
            }
          }
        }

        // Update rule success count
        try {
          console.log(`Updating rule success count for ${rule.name}`);
          const updatedRule = {
            ...rule,
            successCount: (rule.successCount || 0) + 1,
            lastError: undefined
          };
          await updateSmsParserRule(updatedRule);
        } catch (error) {
          console.error("Error updating rule success count", error);
        }

        console.log(`Rule ${rule.name} successfully parsed message`);
        return { amount, merchantName, usedRule: rule };
      } catch (error) {
        console.error(`Error applying rule ${rule.name}:`, error);
        
        // Update rule with error information
        try {
          const updatedRule = {
            ...rule,
            lastError: String(error)
          };
          await updateSmsParserRule(updatedRule);
        } catch (updateError) {
          console.error("Error updating rule with error info", updateError);
        }
      }
    }

    return { amount: null, merchantName: "Unknown Merchant" };
  }

  static async scanSms(fromDate?: Date, toDate?: Date): Promise<Transaction[]> {
    try {
      if (!window?.Android?.readSMS) {
        console.log('SMS reading is not available: ', { hasAndroidBridge: Boolean(window?.Android?.readSMS) });
        toast('SMS Reading Not Available', { description: 'This feature is only available on Android devices with the native app installed.' });
        return [];
      }

      const rules = await getSmsParserRules();
      console.log('Loaded SMS parser rules:', rules);

      if (!rules || rules.length === 0) {
        toast('No Parser Rules Found', { description: 'Please create at least one SMS parser rule first' });
        return [];
      }

      // Check if there are any enabled rules
      const enabledRules = rules.filter(rule => rule.enabled);
      if (enabledRules.length === 0) {
        toast('No Enabled Rules', { description: 'Please enable at least one SMS parser rule' });
        return [];
      }

      // Date range for SMS query
      const fromTimestamp = fromDate?.getTime() || (new Date().getTime() - (30 * 24 * 60 * 60 * 1000)); // Default to 30 days ago
      const toTimestamp = toDate?.getTime() || Date.now();

      console.log(`Reading SMS from ${new Date(fromTimestamp).toISOString()} to ${new Date(toTimestamp).toISOString()}`);
      
      // Read SMS messages from the device
      const smsMessages = await window.Android.readSMS(
        fromTimestamp,
        toTimestamp
      );

      const transactions: Transaction[] = [];
      let parsedMessages;
      
      try {
        parsedMessages = JSON.parse(smsMessages);
        console.log(`Processing ${parsedMessages.length} SMS messages`);
      } catch (error) {
        console.error('Error parsing SMS messages:', error);
        toast('Error Parsing SMS', { description: 'Failed to parse SMS messages from the device' });
        return [];
      }

      let successCount = 0;
      let duplicateCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      
      // Process each SMS message
      for (const sms of parsedMessages) {
        console.log(`Processing SMS: ${sms.address} - ${sms.body.substring(0, 30)}...`);
        
        // Extract expense data from SMS, passing the sender address
        const { amount, merchantName, usedRule, transactionType } = await this.extractExpenseFromText(
          sms.body, 
          sms.address || '',
          enabledRules
        );
        
        if (amount && merchantName && usedRule) {
          const processedMessage = {
            body: sms.body,
            date: new Date(parseInt(sms.date)).toISOString(),
            amount,
            merchantName
          };

          // Check for duplicates before creating new transaction
          const isDuplicate = await isTransactionDuplicate(processedMessage);
          
          if (!isDuplicate) {
            // Use the transaction type from the rule
            const type = transactionType || 'expense';
            console.log(`Creating ${type} transaction: ${merchantName} - ${amount}`);
            
            // Create the transaction with the correct type
            const transaction = await createTransactionFromSms(
              processedMessage, 
              usedRule.paymentBank,
              type
            );
            
            // Add transaction to the appropriate store based on type
            if (transaction.type === 'expense') {
              await addExpense(transaction as Expense);
            } else if (transaction.type === 'income') {
              await addIncome(transaction as Income);
            }
            
            transactions.push(transaction);
            successCount++;
          } else {
            duplicateCount++;
            console.log(`Skipping duplicate transaction: ${merchantName} - ${amount}`);
          }
        } else {
          skippedCount++;
          console.log(`No matching rules found for sender: ${sms.address}`);
        }
      }

      // Update UI with results including duplicate information
      dbEvents.emit(DatabaseEvent.TRANSACTION_LIST_REFRESH);
      
      // Show result toast
      if (parsedMessages.length === 0) {
        toast('No SMS Messages Found', { description: 'No messages found in the selected date range' });
      } else if (successCount === 0 && duplicateCount === 0) {
        toast('No Transactions Found', { description: `Scanned ${parsedMessages.length} messages, skipped ${skippedCount} unmatched senders` });
      } else {
        toast('Processing Complete', { description: `Found ${successCount} new transactions (${duplicateCount} duplicates, ${skippedCount} unmatched senders) in ${parsedMessages.length} messages` });
      }

      return transactions;
    } catch (error) {
      console.error('Error reading SMS:', error);
      return [];
    }
  }

  static async loadSmsFromDevice(limit: number = 100): Promise<{ address: string, body: string, date: string }[]> {
    try {
      console.log('[SMS DEBUG] Platform:', 'window.Android:', !!window?.Android);
      
      if (!window?.Android?.readSMS) {
        console.log('[SMS DEBUG] SMS reading is not available: ', { hasAndroidBridge: Boolean(window?.Android?.readSMS) });
        toast('SMS Reading Not Available', { description: 'This feature is only available on Android devices with the native app installed.' });
        throw new Error('SMS reading not available');
      }

      // If limit is 0, load all SMS messages (from the beginning of time)
      const fromTimestamp = limit === 0 ? 0 : new Date().getTime() - (30 * 24 * 60 * 60 * 1000); 
      const toTimestamp = Date.now();
      console.log('[SMS DEBUG] Reading SMS for tester from', fromTimestamp, 'to', toTimestamp, new Date(fromTimestamp).toISOString(), new Date(toTimestamp).toISOString());
      
      // Read SMS messages from the device
      const smsMessages = await window.Android.readSMS(
        fromTimestamp,
        toTimestamp
      );
      console.log('[SMS DEBUG] Raw result from window.Android.readSMS:', smsMessages);

      let parsedMessages;
      try {
        parsedMessages = JSON.parse(smsMessages);
        console.log('[SMS DEBUG] Loaded', parsedMessages.length, 'SMS messages for tester');
        // Sort messages by date (newest first)
        parsedMessages.sort((a: any, b: any) => {
          return parseInt(b.date) - parseInt(a.date);
        });
        // Limit the number of messages returned if needed
        const limitedMessages = limit > 0 ? parsedMessages.slice(0, limit) : parsedMessages;
        return limitedMessages;
      } catch (error) {
        console.error('[SMS DEBUG] Error parsing SMS messages:', error, smsMessages);
        toast('Error Loading SMS', { description: 'Failed to parse SMS messages from the device' });
        return [];
      }
    } catch (error) {
      console.error('[SMS DEBUG] Error reading SMS:', error);
      throw error;
    }
  }
}

// Add TypeScript interface for the Android bridge
declare global {
  interface Window {
    Android?: {
      readSMS: (fromDate: number, toDate: number) => Promise<string>;
    };
  }
}
