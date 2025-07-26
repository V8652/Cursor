import { v4 as uuidv4 } from 'uuid';
import { openDB } from 'idb';
import { initDB } from './db';
import { SmsParserRule, SmsParserRuleFormData } from '@/types/sms-parser';
import { dbEvents, DatabaseEvent } from './db-event';

const SMS_RULES_STORE = 'smsParserRules';

export async function getSmsParserRules(): Promise<SmsParserRule[]> {
  try {
    const db = await initDB();
    const rules = await db.getAll(SMS_RULES_STORE);
    
    if (!rules || rules.length === 0) {
      const defaultRules = await createDefaultRules();
      return defaultRules;
    }
    
    return rules;
  } catch (error) {
    console.error('Error getting SMS parser rules:', error);
    return [];
  }
}

export async function addSmsParserRule(rule: SmsParserRuleFormData): Promise<SmsParserRule> {
  try {
    const db = await initDB();
    const id = uuidv4();
    const now = new Date().toISOString();
    const timestamp = Date.now();
    
    const newRule: SmsParserRule = {
      id,
      ...rule,
      merchantCondition: rule.merchantCondition || [],
      lastModified: now,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await db.add(SMS_RULES_STORE, newRule);
    dbEvents.emit(DatabaseEvent.SMS_RULES_REFRESH, true);
    return newRule;
  } catch (error) {
    console.error('Error adding SMS parser rule:', error);
    throw error;
  }
}

export const createSmsParserRule = addSmsParserRule;

export async function updateSmsParserRule(rule: SmsParserRule): Promise<SmsParserRule> {
  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    const updatedRule = {
      ...rule,
      lastModified: now,
      updatedAt: Date.now()
    };
    
    await db.put(SMS_RULES_STORE, updatedRule);
    dbEvents.emit(DatabaseEvent.SMS_RULES_REFRESH, true);
    return updatedRule;
  } catch (error) {
    console.error('Error updating SMS parser rule:', error);
    throw error;
  }
}

export async function deleteSmsParserRule(id: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete(SMS_RULES_STORE, id);
    dbEvents.emit(DatabaseEvent.SMS_RULES_REFRESH, true);
  } catch (error) {
    console.error('Error deleting SMS parser rule:', error);
    throw error;
  }
}

export async function toggleSmsParserRuleEnabled(id: string, enabled: boolean): Promise<void> {
  try {
    const db = await initDB();
    const rule = await db.get(SMS_RULES_STORE, id);
    
    if (rule) {
      rule.enabled = enabled;
      rule.lastModified = new Date().toISOString();
      rule.updatedAt = Date.now();
      await db.put(SMS_RULES_STORE, rule);
      dbEvents.emit(DatabaseEvent.SMS_RULES_REFRESH, true);
    }
  } catch (error) {
    console.error('Error toggling SMS parser rule:', error);
    throw error;
  }
}

async function createDefaultRules(): Promise<SmsParserRule[]> {
  let defaultRules: SmsParserRuleFormData[] = [
    {
      name: "HDFC Bank Credit Card",
      enabled: true,
      pattern: "(?:HDFCBK|HDFC-VM).*?Rs\\.?\\s*([\\d,]+\\.?\\d*).*?(?:to\\s+(.+?)\\s+on|at\\s+(.+?)\\.|spent\\s+on\\s+(.+?)\\s+on).*?(^(.+?)\\s+on\\s+\\d+|^(.+?)\\.)",
      merchantNameRegex: "",
      senderMatch: [
        "HDFCBK",
        "HDFC-VM"
      ],
      amountRegex: [
        "Rs\\.?\\s*([\\d,]+\\.?\\d*)",
        "Rs\\s*([\\d,]+\\.?\\d*)",
        "INR\\s*([\\d,]+\\.?\\d*)"
      ],
      merchantCommonPatterns: [
        "^(.+?)\\s+on\\s+\\d+",
        "^(.+?)\\."
      ],
      paymentBank: "HDFC Bank",
      priority: 20,
      transactionType: "expense",
      merchantCondition: [],
      merchantExtractions: [
        { startText: "at", endText: "on", startIndex: 1 },
        { startText: "to", endText: "on", startIndex: 1 }
      ]
    },
    {
      name: "ICICI Bank UPI",
      enabled: true,
      pattern: "(?:ICICIB|ICICI|ICINB).*?Rs\\.?\\s*([\\d,]+\\.?\\d*).*?(?:to\\s+(.+?)\\s+on|to\\s+(.+?)\\.|to\\s+VPA\\s+(.+?)@).*?(^(.+?)\\s+on\\s+\\d+|^(.+?)\\s+via\\s+|^(.+?)\\.)",
      merchantNameRegex: "",
      senderMatch: [
        "ICICIB",
        "ICICI",
        "ICINB"
      ],
      amountRegex: [
        "Rs\\.?\\s*([\\d,]+\\.?\\d*)\\s+paid",
        "Rs\\.?\\s*([\\d,]+\\.?\\d*)\\s+debited",
        "Rs\\.?\\s*([\\d,]+\\.?\\d*)"
      ],
      merchantCommonPatterns: [
        "^(.+?)\\s+on\\s+\\d+",
        "^(.+?)\\s+via\\s+",
        "^(.+?)\\."
      ],
      paymentBank: "ICICI Bank",
      priority: 15,
      transactionType: "expense",
      merchantCondition: [],
      merchantExtractions: [
        { startText: "to", endText: "on", startIndex: 1 },
        { startText: "to", endText: ".", startIndex: 1 }
      ]
    }
  ];

  // Ensure every rule has at least one merchantExtractions entry
  defaultRules = defaultRules.map(rule => ({
    ...rule,
    merchantExtractions:
      rule.merchantExtractions && rule.merchantExtractions.length > 0
        ? rule.merchantExtractions
        : [{ startText: '', endText: '', startIndex: 1 }]
  }));

  const createdRules: SmsParserRule[] = [];
  for (const rule of defaultRules) {
    try {
      const createdRule = await addSmsParserRule(rule);
      createdRules.push(createdRule);
    } catch (error) {
      console.error('Error creating default rule:', error);
    }
  }

  return createdRules;
}