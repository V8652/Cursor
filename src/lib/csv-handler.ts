import { Expense, Income } from '@/types';
import { getExpenses, getIncomes, addExpense, addIncome } from '@/lib/db';
import { toast } from 'sonner';
import { parseCSVFile, forceDownloadCSV } from './csv-utils';
import { v4 as uuidv4 } from 'uuid';
import { dbEvents, DatabaseEvent } from './db-event';
import Papa from 'papaparse';
import { generateDeterministicTransactionId } from './sms-transaction-processor';

/**
 * Export transaction data (expenses and incomes) to CSV with improved handling
 */
export const exportTransactionsToCSV = async (filename: string): Promise<void> => {
  try {
    const expenses = await getExpenses();
    const incomes = await getIncomes();
    
    if (expenses.length === 0 && incomes.length === 0) {
      toast.error('No Data to Export', { description: 'You don\'t have any transactions to export yet.' });
      return;
    }

    const exportData = [
      ...expenses.map(expense => ({
        ID: expense.id,
        category: expense.category || '',
        Note: expense.notes || '',
        amount: expense.amount.toFixed(2),
        Date: new Date(expense.date).toISOString().split('T')[0],
        paymentMethod: expense.paymentMethod || '',
        merchantName: expense.merchantName || '',
        currency: expense.currency || 'INR',
        type: 'expense'
      })),
      ...incomes.map(income => ({
        ID: income.id,
        category: income.category || '',
        Note: income.notes || '',
        amount: income.amount.toFixed(2),
        Date: new Date(income.date).toISOString().split('T')[0],
        paymentMethod: income.paymentMethod || '',
        merchantName: income.merchantName || '',
        currency: income.currency || 'INR',
        type: 'income'
      }))
    ];

    const csvContent = Papa.unparse(exportData, {
      header: true,
      skipEmptyLines: true,
      quotes: true
    });

    await forceDownloadCSV(csvContent, filename, csvContent);

    toast('Export Complete', { description: `${expenses.length + incomes.length} transactions exported successfully` });
  } catch (error) {
    console.error('Error exporting transactions:', error);
    toast.error('Export Failed', { description: `Failed to export transactions: ${(error as Error).message || "Unknown error"}` });
  }
};

/**
 * Import transaction data (expenses and incomes) from CSV with improved handling
 */
export const importTransactionsFromCSV = async (file: File): Promise<(Expense | Income)[]> => {
  try {
    console.log("Starting to parse CSV file", file.name);
    
    // Parse CSV file
    const transactions = await parseCSVFile<Record<string, any>>(file);
    console.log("Parsed transactions:", transactions.length);
    
    if (transactions.length === 0) {
      toast.error('No Data to Import', { description: 'No valid transactions found in the CSV file.' });
      return [];
    }
    
    // Counters for success message
    let expenseCount = 0;
    let incomeCount = 0;
    let errorCount = 0;
    const importedTransactions: (Expense | Income)[] = [];
    
    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Validate required fields
        if (!transaction.amount) {
          console.warn('Transaction missing amount:', transaction);
          errorCount++;
          continue;
        }
        
        if (!transaction.Date) {
          console.warn('Transaction missing date:', transaction);
          errorCount++;
          continue;
        }
        
        // Normalize the transaction type
        const type = transaction.type?.toLowerCase();
        console.log("Processing transaction of type:", type);
        
        // Parse date (handle both YYYY-MM-DD and DD-MM-YYYY formats)
        let parsedDate: Date | null = null;
        if (/^\d{2}-\d{2}-\d{4}$/.test(transaction.Date)) {
          const [day, month, year] = transaction.Date.split('-');
          parsedDate = new Date(`${year}-${month}-${day}`);
        } else {
          parsedDate = new Date(transaction.Date);
        }
        
        if (isNaN(parsedDate.getTime())) {
          console.warn('Invalid date format:', transaction.Date);
          errorCount++;
          continue;
        }
        
        const isoDate = parsedDate.toISOString().split('T')[0];
        
        // Generate deterministic ID if not present
        let id = transaction.ID;
        if (!id) {
          id = await generateDeterministicTransactionId({
            date: isoDate,
            amount: Number(transaction.amount),
            merchantName: transaction.merchantName || '',
            sender: '',
            body: transaction.Note || ''
          });
        }
        
        // Common fields
        const commonFields = {
          id,
          amount: Number(transaction.amount),
          date: isoDate,
          category: transaction.category || '',
          notes: transaction.Note || '',
          paymentMethod: transaction.paymentMethod || '',
          currency: transaction.currency || 'INR',
          source: transaction.merchantName || '' // Using merchantName as source if not provided
        };
        
        if (type === 'expense') {
          // Create expense
          const expense: Expense = {
            ...commonFields,
            type: 'expense',
            merchantName: transaction.merchantName || ''
          };
          
          console.log("Adding expense:", expense.amount, expense.merchantName);
          await addExpense(expense);
          importedTransactions.push(expense);
          expenseCount++;
        } else if (type === 'income') {
          // Create income
          const income: Income = {
            ...commonFields,
            type: 'income',
            merchantName: transaction.merchantName || ''
          };
          
          console.log("Adding income:", income.amount, income.merchantName);
          await addIncome(income);
          importedTransactions.push(income);
          incomeCount++;
        } else {
          console.warn('Unknown transaction type:', type);
          errorCount++;
        }
      } catch (error) {
        console.error('Error importing transaction:', error);
        errorCount++;
      }
    }
    
    // Update UI with multiple events for better reactivity
    dbEvents.emit(DatabaseEvent.TRANSACTION_UPDATED);
    dbEvents.emit(DatabaseEvent.TRANSACTION_ADDED);
    dbEvents.emit(DatabaseEvent.TRANSACTION_IMPORTED);
    dbEvents.emit(DatabaseEvent.DATA_IMPORTED);
    
    // Show appropriate message
    let message = '';
    if (expenseCount > 0 && incomeCount > 0) {
      message = `Imported ${expenseCount} expenses and ${incomeCount} incomes.`;
    } else if (expenseCount > 0) {
      message = `Imported ${expenseCount} expenses.`;
    } else if (incomeCount > 0) {
      message = `Imported ${incomeCount} incomes.`;
    } else {
      message = 'No valid transactions were found in the file.';
    }
    
    if (errorCount > 0) {
      message += ` (${errorCount} items skipped due to errors)`;
    }
    
    toast('Import Complete', { description: message });
    
    return importedTransactions;
  } catch (error) {
    console.error('Error importing transactions:', error);
    toast.error('Import Failed', { description: `Failed to import transactions: ${(error as Error).message || "Unknown error"}` });
    return [];
  }
};
