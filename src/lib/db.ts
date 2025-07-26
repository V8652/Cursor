import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Expense, Income, ExpenseCategory, IncomeCategory } from '@/types';
import { Category, ParserRule, Preference, UserCategories, FinancialSummary } from '@/types/db';
import { SmsParserRule } from '@/types/sms-parser';
import { MerchantNote } from '@/types/merchant-note';
import { dbEvents, DatabaseEvent } from './db-event';

interface MoneyMinderDB extends DBSchema {
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

let db: IDBPDatabase<MoneyMinderDB> | null = null;

// Define the database stores and their schemas
export const initDB = async () => {
  try {
    if (db) return db;
    
    db = await openDB<MoneyMinderDB>('MoneyMinderDB', 1, {
      upgrade(database, oldVersion, newVersion) {
        // Create stores if they don't exist
        if (!database.objectStoreNames.contains('transactions')) {
          const transactionStore = database.createObjectStore('transactions', { keyPath: 'id' });
          transactionStore.createIndex('by-date', 'date');
          transactionStore.createIndex('by-type', 'type');
        }
        
        if (!database.objectStoreNames.contains('categories')) {
          database.createObjectStore('categories', { keyPath: 'id' });
        }
        
        if (!database.objectStoreNames.contains('merchantNotes')) {
          database.createObjectStore('merchantNotes', { keyPath: 'id' });
        }
        
        if (!database.objectStoreNames.contains('parserRules')) {
          database.createObjectStore('parserRules', { keyPath: 'id' });
        }
        
        if (!database.objectStoreNames.contains('preferences')) {
          database.createObjectStore('preferences', { keyPath: 'id' });
        }
        
        if (!database.objectStoreNames.contains('smsParserRules')) {
          database.createObjectStore('smsParserRules', { keyPath: 'id' });
        }
        
        if (!database.objectStoreNames.contains('userCategories')) {
          database.createObjectStore('userCategories', { keyPath: 'id' });
        }
      }
    });
    
    // Initialize default preferences if they don't exist
    const preferences = await db.get('preferences', 'user-preferences');
    if (!preferences) {
      await db.put('preferences', {
        id: 'user-preferences',
        defaultCurrency: 'INR',
        defaultExpenseCategory: 'other',
        defaultIncomeCategory: 'other',
        categorizeAutomatically: true
      });
    }
    
    // Initialize default user categories if they don't exist
    const userCategories = await db.get('userCategories', 'user-categories');
    if (!userCategories) {
      await db.put('userCategories', {
        id: 'user-categories',
        expenseCategories: [],
        incomeCategories: [],
        categoryColors: {},
        categoryIcons: {}
      });
    }
    
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Transaction functions
export const getTransactions = async (): Promise<(Expense | Income)[]> => {
  try {
    const db = await initDB();
    const transactions = await db.getAll('transactions');
    // Ensure all retrieved transactions have 'currency' and 'source' properties
    return transactions.map(transaction => ({
      currency: 'INR',
      source: 'manual',
      ...transaction,
    }));
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

// New function to delete all transactions
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
    const transactions = await getTransactions();
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
    if (transaction) {
      // Ensure currency and source are present even for single retrieval
      const enrichedTransaction = {
        currency: transaction.currency || 'INR',
        source: transaction.source || 'manual',
        ...transaction,
      };
      if (enrichedTransaction.type === 'expense') {
        return enrichedTransaction as Expense;
      }
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
    const transactions = await getTransactions();
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
    if (transaction) {
      // Ensure currency and source are present even for single retrieval
      const enrichedTransaction = {
        currency: transaction.currency || 'INR',
        source: transaction.source || 'manual',
        ...transaction,
      };
      if (enrichedTransaction.type === 'income') {
        return enrichedTransaction as Income;
      }
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

// Date range queries
function normalizeToLocalMidnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const getTransactionsByDateRange = async (startDate: string, endDate: string): Promise<(Expense | Income)[]> => {
  try {
    const transactions = await getTransactions();
    const start = normalizeToLocalMidnight(startDate).getTime();
    const end = normalizeToLocalMidnight(endDate).getTime();
    return transactions.filter(transaction => {
      const transactionTime = normalizeToLocalMidnight(transaction.date).getTime();
      return transactionTime >= start && transactionTime <= end;
    });
  } catch (error) {
    console.error('Error getting transactions by date range:', error);
    return [];
  }
};

export const getExpensesByDateRange = async (startDate: string, endDate: string): Promise<Expense[]> => {
  try {
    const expenses = await getExpenses();
    const start = normalizeToLocalMidnight(startDate).getTime();
    const end = normalizeToLocalMidnight(endDate).getTime();
    return expenses.filter(expense => {
      const expenseTime = normalizeToLocalMidnight(expense.date).getTime();
      return expenseTime >= start && expenseTime <= end;
    });
  } catch (error) {
    console.error('Error getting expenses by date range:', error);
    return [];
  }
};

export const getIncomesByDateRange = async (startDate: string, endDate: string): Promise<Income[]> => {
  try {
    const incomes = await getIncomes();
    const start = normalizeToLocalMidnight(startDate).getTime();
    const end = normalizeToLocalMidnight(endDate).getTime();
    return incomes.filter(income => {
      const incomeTime = normalizeToLocalMidnight(income.date).getTime();
      return incomeTime >= start && incomeTime <= end;
    });
  } catch (error) {
    console.error('Error getting incomes by date range:', error);
    return [];
  }
};

// Financial summary
export const getFinancialSummary = async (startDate?: string, endDate?: string): Promise<FinancialSummary> => {
  try {
    let expenses: Expense[];
    let incomes: Income[];
    
    if (startDate && endDate) {
      expenses = await getExpensesByDateRange(startDate, endDate);
      incomes = await getIncomesByDateRange(startDate, endDate);
    } else {
      expenses = await getExpenses();
      incomes = await getIncomes();
    }
    
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    
    return {
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses
    };
  } catch (error) {
    console.error('Error getting financial summary:', error);
    return { totalExpenses: 0, totalIncome: 0, balance: 0 };
  }
};

// User Categories
export const getUserCategories = async (): Promise<UserCategories> => {
  try {
    const db = await initDB();
    const userCategories = await db.get('userCategories', 'user-categories');
    if (userCategories) {
      return userCategories;
    }
    // Return default categories if none found
    const defaultCategories = {
      id: 'user-categories',
      expenseCategories: [],
      incomeCategories: [],
      categoryColors: {},
      categoryIcons: {}
    };
    
    // Create default categories in DB
    await db.put('userCategories', defaultCategories);
    return defaultCategories;
  } catch (error) {
    console.error('Error getting user categories:', error);
    return {
      id: 'user-categories',
      expenseCategories: [],
      incomeCategories: [],
      categoryColors: {},
      categoryIcons: {}
    };
  }
};

export const saveUserCategories = async (userCategories: UserCategories): Promise<void> => {
  try {
    const db = await initDB();
    // Make sure id is always set
    const categories = {
      ...userCategories,
      id: 'user-categories' // Always use consistent ID
    };
    
    // Add console logging to track category saving
    console.log('Saving categories:', categories);
    
    // Ensure proper structure before saving
    if (!categories.expenseCategories) categories.expenseCategories = [];
    if (!categories.incomeCategories) categories.incomeCategories = [];
    if (!categories.categoryColors) categories.categoryColors = {};
    if (!categories.categoryIcons) categories.categoryIcons = {};
    
    await db.put('userCategories', categories);
    console.log('Categories saved successfully');
  } catch (error) {
    console.error('Error saving user categories:', error);
    throw error;
  }
};

// Preferences
export const getPreferences = async (): Promise<Preference | null> => {
  try {
    const db = await initDB();
    return await db.get('preferences', 'user-preferences');
  } catch (error) {
    console.error('Error getting preferences:', error);
    return null;
  }
};

export const savePreferences = async (preferences: Preference): Promise<void> => {
  try {
    const db = await initDB();
    // Ensure the id field is always set to the standard key
    const preferencesWithId: Preference = {
      ...preferences,
      id: 'user-preferences'
    };
    await db.put('preferences', preferencesWithId);
  } catch (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
};

// Merchant Notes
export const getMerchantNotes = async (): Promise<MerchantNote[]> => {
  try {
    const db = await initDB();
    return await db.getAll('merchantNotes');
  } catch (error) {
    console.error('Error getting merchant notes:', error);
    return [];
  }
};

export const saveMerchantNote = async (merchantNote: MerchantNote): Promise<void> => {
  try {
    const db = await initDB();
    await db.put('merchantNotes', merchantNote);
  } catch (error) {
    console.error('Error saving merchant note:', error);
    throw error;
  }
};

export const deleteMerchantNote = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete('merchantNotes', id);
  } catch (error) {
    console.error('Error deleting merchant note:', error);
    throw error;
  }
};

// Get unique merchants from transactions
export const getUniqueMerchants = async (): Promise<string[]> => {
  try {
    const transactions = await getTransactions();
    const merchantSet = new Set<string>();
    
    transactions.forEach(transaction => {
      if (transaction.merchantName) {
        merchantSet.add(transaction.merchantName);
      }
    });
    
    return Array.from(merchantSet).sort();
  } catch (error) {
    console.error('Error getting unique merchants:', error);
    return [];
  }
};

// Apply merchant notes to all matching transactions
export const applyMerchantNotesToTransactions = async (): Promise<number> => {
  try {
    const merchantNotes = await getMerchantNotes();
    const transactions = await getTransactions();
    let updatedCount = 0;
    
    for (const transaction of transactions) {
      for (const note of merchantNotes) {
        try {
          const pattern = new RegExp(note.merchantPattern, 'i');
          if (pattern.test(transaction.merchantName)) {
            let updatedTransaction = { ...transaction };
            
            // Update notes if provided
            if (note.notes) {
              updatedTransaction.notes = note.notes;
            }
            
            // Update category if provided - ensure type safety
            if (note.categoryOverride) {
              if (transaction.type === 'expense') {
                // Cast to Expense and set proper expense category type
                (updatedTransaction as Expense).category = note.categoryOverride as ExpenseCategory;
              } else {
                // Cast to Income and set proper income category type
                (updatedTransaction as Income).category = note.categoryOverride as IncomeCategory;
              }
            }
            
            await updateTransaction(updatedTransaction);
            updatedCount++;
            break; // Apply only the first matching pattern
          }
        } catch (err) {
          console.error(`Error applying merchant note pattern ${note.merchantPattern}:`, err);
        }
      }
    }
    
    return updatedCount;
  } catch (error) {
    console.error('Error applying merchant notes to transactions:', error);
    return 0;
  }
};

// Add this function to get parser rules
export const getParserRules = async (): Promise<any[]> => {
  try {
    const db = await initDB();
    const smsParserRules = await db.getAll('smsParserRules');
    return smsParserRules || [];
  } catch (error) {
    console.error('Error getting parser rules:', error);
    return [];
  }
};
