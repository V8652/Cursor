import { openDB, IDBPDatabase } from 'idb';
import { MoneyMinderDB } from './types';

let db: IDBPDatabase<MoneyMinderDB> | null = null;

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