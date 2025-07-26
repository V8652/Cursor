import { MerchantNote } from '@/types/merchant-note';
import { dbEvents, DatabaseEvent } from '../db-event';
import { initDB } from './core';
import { getTransactions } from './transactions';

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
    dbEvents.emit(DatabaseEvent.MERCHANT_NOTES_REFRESH, true);
  } catch (error) {
    console.error('Error saving merchant note:', error);
    throw error;
  }
};

export const deleteMerchantNote = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete('merchantNotes', id);
    dbEvents.emit(DatabaseEvent.MERCHANT_NOTES_REFRESH, true);
  } catch (error) {
    console.error('Error deleting merchant note:', error);
    throw error;
  }
};

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

export const applyMerchantNotesToTransactions = async (): Promise<number> => {
  try {
    const db = await initDB();
    const [transactions, merchantNotes] = await Promise.all([
      getTransactions(),
      getMerchantNotes()
    ]);
    
    let updatedCount = 0;
    
    for (const transaction of transactions) {
      if (!transaction.merchantName) continue;
      
      const matchingNote = merchantNotes.find(note => 
        note.merchantPattern.toLowerCase() === transaction.merchantName?.toLowerCase()
      );
      
      if (matchingNote && (!transaction.notes || transaction.notes !== matchingNote.notes)) {
        transaction.notes = matchingNote.notes;
        await db.put('transactions', transaction);
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      dbEvents.broadcast([
        DatabaseEvent.TRANSACTION_UPDATED,
        DatabaseEvent.TRANSACTION_LIST_REFRESH,
        DatabaseEvent.UI_REFRESH_NEEDED
      ]);
    }
    
    return updatedCount;
  } catch (error) {
    console.error('Error applying merchant notes:', error);
    return 0;
  }
}; 