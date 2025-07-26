import { useState, useCallback } from 'react';
import { Expense, Income } from '../types';
import { getExpenses, getIncomes, deleteTransaction } from '../lib/db';
import { dbEvents, DatabaseEvent } from '../lib/db-event';
import { toast } from '../components/ui/use-toast';

interface UseTransactionManagementProps {
  onTransactionChange?: () => void;
}

export const useTransactionManagement = ({ onTransactionChange }: UseTransactionManagementProps) => {
  const [localExpenses, setLocalExpenses] = useState<Expense[]>([]);
  const [localIncomes, setLocalIncomes] = useState<Income[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isEditIncomeOpen, setIsEditIncomeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadData = useCallback(async () => {
    try {
      console.log('Reloading transaction data');
      const [updatedExpenses, updatedIncomes] = await Promise.all([getExpenses(), getIncomes()]);
      setLocalExpenses(updatedExpenses);
      setLocalIncomes(updatedIncomes);
      setRefreshKey(prev => prev + 1);
      console.log('Transaction data reloaded');
      if (onTransactionChange) {
        onTransactionChange();
      }
    } catch (error) {
      console.error('Error reloading data:', error);
      toast({
        title: "Error",
        description: "Failed to reload transaction data",
        variant: "destructive"
      });
    }
  }, [onTransactionChange]);

  const handleExpenseClick = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditExpenseOpen(true);
  }, []);

  const handleIncomeClick = useCallback((income: Income) => {
    setSelectedIncome(income);
    setIsEditIncomeOpen(true);
  }, []);

  const handleExpenseEditSave = useCallback(async () => {
    setIsEditExpenseOpen(false);
    setSelectedExpense(null);
    await reloadData();
  }, [reloadData]);

  const handleIncomeEditSave = useCallback(async () => {
    setIsEditIncomeOpen(false);
    setSelectedIncome(null);
    await reloadData();
  }, [reloadData]);

  const handleTransactionDelete = useCallback(async (transactionId: string, currentTab: 'income' | 'expenses') => {
    try {
      await deleteTransaction(transactionId);
      
      if (currentTab === 'income') {
        setLocalIncomes(prev => prev.filter(t => t.id !== transactionId));
      } else {
        setLocalExpenses(prev => prev.filter(t => t.id !== transactionId));
      }
      
      dbEvents.broadcast([
        DatabaseEvent.TRANSACTION_DELETED,
        DatabaseEvent.BALANCE_UPDATED,
        DatabaseEvent.TRANSACTION_LIST_REFRESH,
        DatabaseEvent.UI_REFRESH_NEEDED
      ]);
      
      if (onTransactionChange) onTransactionChange();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive"
      });
    }
  }, [onTransactionChange]);

  return {
    localExpenses,
    localIncomes,
    selectedExpense,
    selectedIncome,
    isEditExpenseOpen,
    isEditIncomeOpen,
    refreshKey,
    reloadData,
    handleExpenseClick,
    handleIncomeClick,
    handleExpenseEditSave,
    handleIncomeEditSave,
    handleTransactionDelete,
    setLocalExpenses,
    setLocalIncomes,
    setIsEditExpenseOpen,
    setIsEditIncomeOpen
  };
}; 