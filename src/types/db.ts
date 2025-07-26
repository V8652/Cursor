import { ExpenseCategory, IncomeCategory } from '@/types';
export type { ExpenseCategory, IncomeCategory };

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  color?: string;
  icon?: string;
}

export interface ParserRule {
  id: string;
  pattern: string;
  category: ExpenseCategory | IncomeCategory;
  type: 'expense' | 'income';
}

export interface Preference {
  id: string;
  defaultCurrency: string;
  defaultExpenseCategory: ExpenseCategory;
  defaultIncomeCategory: IncomeCategory;
  categorizeAutomatically: boolean;
}

export interface UserCategories {
  id: string;
  expenseCategories: string[];
  incomeCategories: string[];
  categoryColors: Record<string, string>;
  categoryIcons: Record<string, string>;
}

export interface FinancialSummary {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
} 