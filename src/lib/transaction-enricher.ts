
import { Transaction, Expense, Income } from '@/types';
import { getTransactions, updateTransaction } from '@/lib/db';

/**
 * Enriches a transaction with data from previous transactions with the same merchant
 * @param transaction The transaction to enrich
 * @returns True if the transaction was enriched, false otherwise
 */
export const enrichTransaction = async (transaction: Transaction): Promise<boolean> => {
  try {
    // Skip if already has non-default category and notes
    if (
      transaction.category !== 'other' && 
      !transaction.notes?.includes('Auto-extracted from SMS')
    ) {
      return false;
    }
    
    // Get previous transactions for the same merchant
    const previousData = await getPreviousTransactionData(transaction.merchantName);
    
    if (!previousData) {
      return false;
    }
    
    let wasEnriched = false;
    
    // Update transaction with previous data
    if (transaction.category === 'other' && previousData.category) {
      transaction.category = previousData.category;
      wasEnriched = true;
    }
    
    if (
      (!transaction.notes || transaction.notes.includes('Auto-extracted from SMS')) && 
      previousData.notes
    ) {
      transaction.notes = previousData.notes;
      wasEnriched = true;
    }
    
    // Save the updated transaction if it was enriched
    if (wasEnriched) {
      // Type assertion to Expense | Income which is required by updateTransaction
      await updateTransaction(transaction as (Expense | Income));
    }
    
    return wasEnriched;
  } catch (error) {
    console.error('Error enriching transaction:', error);
    return false;
  }
};

/**
 * Gets previous transaction data for the same merchant
 * @param merchantName The name of the merchant to search for
 * @returns Promise with previous transaction data or null if none found
 */
export const getPreviousTransactionData = async (merchantName: string): Promise<{
  notes: string;
  category: string;
} | null> => {
  try {
    if (!merchantName) return null;
    
    // Get existing transactions
    const transactions = await getTransactions();
    
    // Look for transactions with the same merchant
    const matchingTransactions = transactions.filter(transaction => 
      transaction.merchantName && 
      transaction.merchantName.toLowerCase() === merchantName.toLowerCase() &&
      // Exclude auto-generated notes to avoid reinforcing defaults
      !(transaction.notes?.includes('Auto-extracted from SMS'))
    );
    
    // Sort by date (newest first) to get the most recent transaction
    matchingTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Return data from the most recent transaction, if available
    if (matchingTransactions.length > 0) {
      return {
        notes: matchingTransactions[0].notes || '',
        category: matchingTransactions[0].category || ''
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting previous transaction data:', error);
    return null;
  }
};

/**
 * Batch enriches multiple transactions at once
 * @param transactions Array of transactions to enrich
 * @returns Number of transactions that were enriched
 */
export const batchEnrichTransactions = async (transactions: Transaction[]): Promise<number> => {
  let enrichedCount = 0;
  
  for (const transaction of transactions) {
    const wasEnriched = await enrichTransaction(transaction);
    if (wasEnriched) {
      enrichedCount++;
    }
  }
  
  return enrichedCount;
};
