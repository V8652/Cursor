import { SmsParserRule } from '@/types/sms-parser';
import { updateSmsParserRule } from '../sms-parser-rules';
import { tryMerchantExtractions } from '../merchant-extract';

export interface ParseResult {
  amount: number | null;
  merchantName: string;
  usedRule?: SmsParserRule;
  transactionType?: 'expense' | 'income';
}

export async function extractExpenseFromText(text: string, sender: string, rules: SmsParserRule[]): Promise<ParseResult> {
  console.log('Extracting expense from text:', text, 'sender:', sender, 'Using rules:', rules);
  
  // Group rules by transaction type
  const expenseRules = rules.filter(rule => rule.transactionType === 'expense');
  const incomeRules = rules.filter(rule => rule.transactionType === 'income');
  
  // Try expense rules first
  const expenseResult = await tryRules(text, sender, expenseRules);
  if (expenseResult.amount) {
    return { ...expenseResult, transactionType: 'expense' };
  }
  
  // If no expense match, try income rules
  const incomeResult = await tryRules(text, sender, incomeRules);
  if (incomeResult.amount) {
    return { ...incomeResult, transactionType: 'income' };
  }
  
  console.log('No rules matched the message');
  return { amount: null, merchantName: "Unknown Merchant" };
}

async function tryRules(text: string, sender: string, rules: SmsParserRule[]): Promise<ParseResult> {
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
        console.error("Error updating rule error information", updateError);
      }
    }
  }

  return { amount: null, merchantName: "Unknown Merchant" };
} 