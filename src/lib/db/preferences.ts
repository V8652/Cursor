import { Preference } from '@/types/db';
import { dbEvents, DatabaseEvent } from '../db-event';
import { initDB } from './core';

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
    await db.put('preferences', preferences);
    dbEvents.emit(DatabaseEvent.USER_PREFERENCES_UPDATED, true);
  } catch (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
}; 