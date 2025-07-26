import { Transaction } from '@/types';
import { addTransaction } from '../db';
import { scanSms } from './scanner';
import { dbEvents, DatabaseEvent } from '../db-event';

export class SmsService {
  static async scanAndSaveTransactions(fromDate?: Date, toDate?: Date): Promise<Transaction[]> {
    try {
      const transactions = await scanSms(fromDate, toDate);
      
      // Save each transaction
      for (const transaction of transactions) {
        await addTransaction(transaction);
      }
      
      // Emit events if any transactions were saved
      if (transactions.length > 0) {
        dbEvents.broadcast([
          DatabaseEvent.DATA_IMPORTED,
          DatabaseEvent.TRANSACTION_LIST_REFRESH,
          DatabaseEvent.BALANCE_UPDATED,
          DatabaseEvent.UI_REFRESH_NEEDED
        ]);
      }
      
      return transactions;
    } catch (error) {
      console.error('Error in scanAndSaveTransactions:', error);
      throw error;
    }
  }
} 