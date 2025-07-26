export interface Transaction {
  id: string;
  amount: number;
  date: string;
  category: string;
  type: 'expense' | 'income';
  merchantName: string;
  notes: string;
  paymentMethod: string;
  currency: string;
  source: string;
  sender?: string;
}

export interface Expense extends Transaction {
  type: 'expense';
}

export interface Income extends Transaction {
  type: 'income';
}

export type ExpenseCategory = 
  | 'food'
  | 'transportation'
  | 'housing'
  | 'utilities'
  | 'entertainment'
  | 'shopping'
  | 'healthcare'
  | 'education'
  | 'travel'
  | 'other';

export type IncomeCategory = 
  | 'salary'
  | 'freelance'
  | 'investments'
  | 'gifts'
  | 'other'; 