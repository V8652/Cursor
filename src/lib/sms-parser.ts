import { Transaction } from '@/types';
import { getParserRules } from './db';

// Parse SMS messages to extract transaction data
export async function parseSMS(messages: string[]): Promise<Transaction[]> {
  try {
    console.log(`Starting to parse ${messages.length} SMS messages`);
    
    // Get the parser rules from the database
    const parserRules = await getParserRules();
    console.log(`Loaded ${parserRules.length} parser rules`);
    
    const transactions: Transaction[] = [];
    
    // Process each message
    for (const message of messages) {
      console.log(`Processing message: ${message.substring(0, 50)}...`);
      
      // Check if message should be skipped based on global skip conditions
      let shouldSkip = false;
      
      // Check global skip conditions first - check all rules for any skip conditions
      for (const rule of parserRules) {
        if (rule.skipConditions && rule.skipConditions.length > 0) {
          for (const skipCondition of rule.skipConditions) {
            if (skipCondition && message.toLowerCase().includes(skipCondition.toLowerCase())) {
              console.log(`Skipping message due to global skip condition: ${skipCondition}`);
              shouldSkip = true;
              break;
            }
          }
        }
        
        if (shouldSkip) break;
      }
      
      // Skip to next message if this one should be skipped
      if (shouldSkip) {
        console.log('Message skipped due to global skip condition');
        continue;
      }
      
      // Try each parser rule until one matches
      for (const rule of parserRules) {
        // Skip disabled rules
        if (!rule.enabled) {
          console.log(`Skipping disabled rule: ${rule.name}`);
          continue;
        }
        
        // Check rule-specific skip patterns
        if (rule.skipPatterns && rule.skipPatterns.length > 0) {
          const shouldSkipForRule = rule.skipPatterns.some(pattern => {
            if (pattern && pattern.trim() !== '') {
              return message.toLowerCase().includes(pattern.toLowerCase());
            }
            return false;
          });
          
          if (shouldSkipForRule) {
            console.log(`Skipping rule "${rule.name}" due to rule-specific skip pattern match`);
            continue; // Skip this rule, try the next one
          }
        }
        
        try {
          // Also check rule skipCondition property which might be used interchangeably with skipPatterns
          if (rule.skipCondition) {
            const skipConditions = Array.isArray(rule.skipCondition) ? rule.skipCondition : [rule.skipCondition];
            const shouldSkipForCondition = skipConditions.some(condition => {
              if (condition && condition.trim() !== '') {
                return message.toLowerCase().includes(condition.toLowerCase());
              }
              return false;
            });
            
            if (shouldSkipForCondition) {
              console.log(`Skipping rule "${rule.name}" due to skip condition match`);
              continue; // Skip this rule, try the next one
            }
          }
          
          const match = new RegExp(rule.pattern, 'i').exec(message);
          
          if (match) {
            console.log(`Match found with rule: ${rule.name}`);
            
            // Extract amount
            let amount = 0;
            if (rule.amountGroup && match[rule.amountGroup]) {
              // Always store positive amount regardless of sign in message
              amount = Math.abs(parseFloat(match[rule.amountGroup].replace(/[^\d.]/g, '')));
              console.log(`Extracted amount: ${amount}`);
            }
            
            // Extract transaction type (income/expense)
            const type = rule.transactionType || 'expense';
            console.log(`Transaction type: ${type}`);
            
            // No need to apply sign based on transaction type - we store positive amounts
            
            // Extract merchant name
            let merchantName = 'Unknown';
            if (rule.merchantGroup && match[rule.merchantGroup]) {
              merchantName = match[rule.merchantGroup].trim();
              console.log(`Extracted merchant: ${merchantName}`);
            }
            
            // Extract date/time
            const date = new Date().toISOString();
            
            // Create transaction object
            const transaction: Transaction = {
              id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              merchantName,
              amount,
              currency: rule.currency || 'INR',
              date,
              category: rule.defaultCategory || 'other',
              type,
              source: 'sms', // Valid property on Transaction
            };
            
            transactions.push(transaction);
            console.log(`Added transaction: ${JSON.stringify(transaction)}`);
            
            // Break after first successful match
            break;
          }
        } catch (error) {
          console.error(`Error applying rule ${rule.name}:`, error);
          // Continue with the next rule
        }
      }
    }
    
    console.log(`Parsed ${transactions.length} transactions from ${messages.length} SMS messages`);
    return transactions;
  } catch (error) {
    console.error('Error parsing SMS messages:', error);
    throw error;
  }
}
