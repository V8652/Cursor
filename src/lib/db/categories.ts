import { UserCategories } from '@/types/db';
import { dbEvents, DatabaseEvent } from '../db-event';
import { initDB } from './core';

export const getUserCategories = async (): Promise<UserCategories> => {
  try {
    const db = await initDB();
    const userCategories = await db.get('userCategories', 'user-categories');
    
    if (!userCategories) {
      const defaultCategories: UserCategories = {
        id: 'user-categories',
        expenseCategories: [],
        incomeCategories: [],
        categoryColors: {},
        categoryIcons: {}
      };
      await db.put('userCategories', defaultCategories);
      return defaultCategories;
    }
    
    return userCategories;
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
    await db.put('userCategories', userCategories);
    dbEvents.emit(DatabaseEvent.CATEGORY_UPDATED, true);
  } catch (error) {
    console.error('Error saving user categories:', error);
    throw error;
  }
}; 