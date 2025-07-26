import { DBSchema } from 'idb';
import { Expense, Income } from '@/types';
import { Category, ParserRule, Preference, UserCategories } from '@/types/db';
import { SmsParserRule } from '@/types/sms-parser';
import { MerchantNote } from '@/types/merchant-note';

export interface MoneyMinderDB extends DBSchema {
  transactions: {
    key: string;
    value: Expense | Income;
    indexes: {
      'by-date': string;
      'by-type': string;
    };
  };
  categories: {
    key: string;
    value: Category;
  };
  merchantNotes: {
    key: string;
    value: MerchantNote;
  };
  parserRules: {
    key: string;
    value: ParserRule;
  };
  preferences: {
    key: string;
    value: Preference;
  };
  smsParserRules: {
    key: string;
    value: SmsParserRule;
  };
  userCategories: {
    key: string;
    value: UserCategories;
  };
} 