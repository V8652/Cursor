import { Expense, Income } from '@/types';
import { dbEvents, DatabaseEvent } from '../db-event';
import { initDB } from './core';
import { FinancialSummary } from '@/types/db';

// Transaction functions
export const getTransactions = async (): Promise<(Expense | Income)[]> => {
  try {
    const db = await initDB();
    return await db.getAll('transactions');
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
};

export const addTransaction = async (transaction: Expense | Income): Promise<void> => {
  try {
    const db = await initDB();
    await db.add('transactions', transaction);
    
    // Batch multiple events together with a consistent order
    dbEvents.broadcast([
      DatabaseEvent.TRANSACTION_ADDED,
      DatabaseEvent.BALANCE_UPDATED,
      DatabaseEvent.TRANSACTION_LIST_REFRESH,
      DatabaseEvent.UI_REFRESH_NEEDED
    ], transaction);
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

export const updateTransaction = async (transaction: Expense | Income): Promise<void> => {
  try {
    const db = await initDB();
    await db.put('transactions', transaction);
    
    // Batch multiple events together with a consistent order
    dbEvents.broadcast([
      DatabaseEvent.TRANSACTION_UPDATED,
      DatabaseEvent.BALANCE_UPDATED,
      DatabaseEvent.TRANSACTION_LIST_REFRESH,
      DatabaseEvent.UI_REFRESH_NEEDED
    ], transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete('transactions', id);
    
    // Batch multiple events together with a consistent order
    dbEvents.broadcast([
      DatabaseEvent.TRANSACTION_DELETED,
      DatabaseEvent.BALANCE_UPDATED,
      DatabaseEvent.TRANSACTION_LIST_REFRESH,
      DatabaseEvent.UI_REFRESH_NEEDED
    ], { id });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

export const deleteAllTransactions = async (): Promise<void> => {
  try {
    const db = await initDB();
    await db.clear('transactions');
    dbEvents.broadcast([
      DatabaseEvent.TRANSACTION_DELETED,
      DatabaseEvent.BALANCE_UPDATED,
      DatabaseEvent.TRANSACTION_LIST_REFRESH,
      DatabaseEvent.UI_REFRESH_NEEDED,
      DatabaseEvent.DATA_IMPORTED
    ]);
  } catch (error) {
    console.error('Error deleting all transactions:', error);
    throw error;
  }
};

// Expense specific functions
export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const db = await initDB();
    const transactions = await db.getAll('transactions');
    return transactions.filter((transaction): transaction is Expense => transaction.type === 'expense');
  } catch (error) {
    console.error('Error getting expenses:', error);
    return [];
  }
};

export const getExpense = async (id: string): Promise<Expense | null> => {
  try {
    const db = await initDB();
    const transaction = await db.get('transactions', id);
    if (transaction && transaction.type === 'expense') {
      return transaction as Expense;
    }
    return null;
  } catch (error) {
    console.error('Error getting expense:', error);
    return null;
  }
};

export const addExpense = async (expense: Expense): Promise<void> => {
  try {
    await addTransaction(expense);
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

// Income specific functions
export const getIncomes = async (): Promise<Income[]> => {
  try {
    const db = await initDB();
    const transactions = await db.getAll('transactions');
    return transactions.filter((transaction): transaction is Income => transaction.type === 'income');
  } catch (error) {
    console.error('Error getting incomes:', error);
    return [];
  }
};

export const getIncome = async (id: string): Promise<Income | null> => {
  try {
    const db = await initDB();
    const transaction = await db.get('transactions', id);
    if (transaction && transaction.type === 'income') {
      return transaction as Income;
    }
    return null;
  } catch (error) {
    console.error('Error getting income:', error);
    return null;
  }
};

export const addIncome = async (income: Income): Promise<void> => {
  try {
    await addTransaction(income);
  } catch (error) {
    console.error('Error adding income:', error);
    throw error;
  }
};

// Date range functions
export const getTransactionsByDateRange = async (startDate: string, endDate: string): Promise<(Expense | Income)[]> => {
  try {
    const db = await initDB();
    const index = db.transaction('transactions').store.index('by-date');
    return await index.getAll(IDBKeyRange.bound(startDate, endDate));
  } catch (error) {
    console.error('Error getting transactions by date range:', error);
    return [];
  }
};

export const getExpensesByDateRange = async (startDate: string, endDate: string): Promise<Expense[]> => {
  try {
    const transactions = await getTransactionsByDateRange(startDate, endDate);
    return transactions.filter((transaction): transaction is Expense => transaction.type === 'expense');
  } catch (error) {
    console.error('Error getting expenses by date range:', error);
    return [];
  }
};

export const getIncomesByDateRange = async (startDate: string, endDate: string): Promise<Income[]> => {
  try {
    const transactions = await getTransactionsByDateRange(startDate, endDate);
    return transactions.filter((transaction): transaction is Income => transaction.type === 'income');
  } catch (error) {
    console.error('Error getting incomes by date range:', error);
    return [];
  }
};

export const getFinancialSummary = async (startDate?: string, endDate?: string): Promise<FinancialSummary> => {
  try {
    let expenses: Expense[] = [];
    let incomes: Income[] = [];
    if (startDate && endDate) {
      expenses = await getExpensesByDateRange(startDate, endDate);
      incomes = await getIncomesByDateRange(startDate, endDate);
    } else {
      expenses = await getExpenses();
      incomes = await getIncomes();
    }
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    return {
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses
    };
  } catch (error) {
    console.error('Error getting financial summary:', error);
    return {
      totalExpenses: 0,
      totalIncome: 0,
      balance: 0
    };
  }
}; 