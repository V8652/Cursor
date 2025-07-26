import { getTransactions } from '../../db';
import { ProcessedSmsMessage } from './types';
import { generateDeterministicTransactionId } from './transaction-creator';

export const isTransactionDuplicate = async (smsData: ProcessedSmsMessage & { id?: string; }): Promise<boolean> => {
  try {
    const transactions = await getTransactions();
    
    // If ID is provided, check for exact match
    if (smsData.id) {
      return transactions.some(t => t.id === smsData.id);
    }
    
    // Generate deterministic ID and check for match
    const deterministicId = await generateDeterministicTransactionId(smsData);
    return transactions.some(t => t.id === deterministicId);
  } catch (error) {
    console.error('Error checking for duplicate transaction:', error);
    return false;
  }
}; 