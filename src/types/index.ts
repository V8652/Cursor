// Transaction base type
type Transaction = {
  id: string;
  amount: number;
  date: string;
  category: string;
  merchantName?: string;
  paymentMethod?: string;
  notes?: string;
  type: 'expense' | 'income';
  currency?: string;
  source?: string;
};

// Expense and Income types extend Transaction
export type Expense = Transaction & { type: 'expense'; };
export type Income = Transaction & { type: 'income'; };

// Category types (expand as needed)
export type ExpenseCategory = string;
export type IncomeCategory = string;

export type TimeFrame = 'week' | 'month' | 'quarter' | 'year';

export interface UserPreferences {
  id?: string;
  defaultCurrency: string;
  defaultExpenseCategory?: string;
  defaultIncomeCategory: string;
  categorizeAutomatically: boolean;
}

export type { Transaction }; 