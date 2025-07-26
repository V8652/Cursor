import { Expense, Income, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { ProcessedSmsMessage } from './types';
import { getPreviousTransactionData } from '../../transaction-enricher';

export const createTransactionFromSms = async (
  smsData: ProcessedSmsMessage,
  bankName: string,
  type: 'expense' | 'income' = 'expense'
): Promise<Transaction> => {
  try {
    // Generate a deterministic ID based on transaction details
    const id = await generateDeterministicTransactionId(smsData);
    
    // Get enriched data from previous similar transactions
    const enrichedData = await getPreviousTransactionData(smsData.merchantName);
    
    // Create base transaction object
    const baseTransaction = {
      id,
      amount: smsData.amount,
      date: smsData.date,
      merchantName: smsData.merchantName,
      category: enrichedData.category || (type === 'expense' ? 'other' : 'other'),
      notes: enrichedData.notes,
      paymentMethod: bankName,
      source: 'sms',
      type
    };
    
    // Return typed transaction
    return type === 'expense'
      ? { ...baseTransaction, type: 'expense' } as Expense
      : { ...baseTransaction, type: 'income' } as Income;
  } catch (error) {
    console.error('Error creating transaction from SMS:', error);
    throw error;
  }
};

export async function generateDeterministicTransactionId(fields: {
  date: string;
  amount: number;
  merchantName: string;
  sender?: string;
  body?: string;
}): Promise<string> {
  try {
    // Create a deterministic string from the fields
    const idString = `${fields.date}_${fields.amount}_${fields.merchantName}_${fields.sender || ''}_${fields.body || ''}`;
    
    // Use UUID v5 with a namespace UUID to generate a deterministic ID
    const namespaceUuid = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // UUID v4 generated once
    return uuidv4(); // For now, using random UUID. TODO: Implement UUID v5
  } catch (error) {
    console.error('Error generating transaction ID:', error);
    return uuidv4(); // Fallback to random UUID
  }
}; 