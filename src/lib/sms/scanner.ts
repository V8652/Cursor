import { toast } from 'sonner';
import { Transaction } from '@/types';
import { isTransactionDuplicate, createTransactionFromSms } from './processor';
import { getSmsParserRules } from '../sms-parser-rules';
import { extractExpenseFromText } from './parser';
import { dbEvents, DatabaseEvent } from '../db-event';

interface SmsMessage {
  address: string;
  body: string;
  date: string;
}

declare global {
  interface Window {
    Android?: {
      readSMS: (fromDate: number, toDate: number) => Promise<string>;
    };
  }
}

export async function scanSms(fromDate?: Date, toDate?: Date): Promise<Transaction[]> {
  try {
    const messages = await loadSmsFromDevice();
    if (!messages || messages.length === 0) {
      toast.error('No SMS messages found', { description: 'Please check your SMS permissions and try again.' });
      return [];
    }

    const rules = await getSmsParserRules();
    if (!rules || rules.length === 0) {
      toast.error('No SMS parser rules found', { description: 'Please add some SMS parser rules first.' });
      return [];
    }

    const transactions: Transaction[] = [];
    let processedCount = 0;
    let skippedCount = 0;

    for (const message of messages) {
      try {
        const result = await extractExpenseFromText(message.body, message.address, rules);
        
        if (!result.amount || !result.transactionType) {
          skippedCount++;
          continue;
        }

        const smsData = {
          body: message.body,
          date: message.date,
          amount: result.amount,
          merchantName: result.merchantName,
          sender: message.address
        };

        const transaction = await createTransactionFromSms(
          smsData,
          result.usedRule?.paymentBank || 'Other Bank',
          result.transactionType
        );

        if (await isTransactionDuplicate({ ...smsData, id: transaction.id })) {
          skippedCount++;
          continue;
        }

        transactions.push(transaction);
        processedCount++;

        // Emit progress event
        dbEvents.emit(DatabaseEvent.TRANSACTION_IMPORTED, {
          total: messages.length,
          processed: processedCount + skippedCount,
          success: processedCount,
          skipped: skippedCount
        });
      } catch (error) {
        console.error('Error processing SMS message:', error);
        skippedCount++;
      }
    }

    if (transactions.length > 0) {
      toast('SMS Scan Complete', { description: `Found ${transactions.length} new transactions from ${messages.length} messages.` });
    } else {
      toast.error('No new transactions found', { description: `Scanned ${messages.length} messages but found no new transactions.` });
    }

    return transactions;
  } catch (error) {
    console.error('Error scanning SMS:', error);
    toast.error('Error scanning SMS', { description: String(error) });
    return [];
  }
}

export async function loadSmsFromDevice(limit: number = 100): Promise<SmsMessage[]> {
  try {
    if (!window.Android?.readSMS) {
      console.error('Android SMS reading not available');
      return [];
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30); // Last 30 days
    const toDate = new Date();

    const smsJson = await window.Android.readSMS(fromDate.getTime(), toDate.getTime());
    const messages = JSON.parse(smsJson);

    if (!Array.isArray(messages)) {
      console.error('Invalid SMS data format:', messages);
      return [];
    }

    return messages
      .slice(0, limit)
      .map(msg => ({
        address: msg.address || '',
        body: msg.body || '',
        date: new Date(msg.date).toISOString()
      }));
  } catch (error) {
    console.error('Error loading SMS from device:', error);
    return [];
  }
} 