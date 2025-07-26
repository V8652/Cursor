import { useState, useEffect, useCallback } from 'react';
import TransactionDashboard from '@/components/TransactionDashboard';
import { getExpenses, getIncomes } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';

// Match types with Index.tsx and TransactionDashboard
// If you have a shared types file, import from there
// Otherwise, define here:
type Expense = { id: string; amount: number; date: string; category: string; type: 'expense'; [key: string]: any };
type Income = { id: string; amount: number; date: string; category: string; type: 'income'; [key: string]: any };

const TransactionsPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const reloadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [exp, inc] = await Promise.all([getExpenses(), getIncomes()]);
      setExpenses(exp);
      setIncomes(inc);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
    const unsubAdd = dbEvents.subscribe(DatabaseEvent.TRANSACTION_ADDED, reloadData);
    const unsubUpdate = dbEvents.subscribe(DatabaseEvent.TRANSACTION_UPDATED, reloadData);
    const unsubDelete = dbEvents.subscribe(DatabaseEvent.TRANSACTION_DELETED, reloadData);
    const unsubImport = dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, reloadData);
    const unsubRefresh = dbEvents.subscribe(DatabaseEvent.TRANSACTION_LIST_REFRESH, reloadData);
    return () => {
      unsubAdd();
      unsubUpdate();
      unsubDelete();
      unsubImport();
      unsubRefresh();
    };
  }, [reloadData]);

  return (
    <div className="max-w-3xl mx-auto px-2 py-4 h-screen flex flex-col">
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading transactions...</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <TransactionDashboard expenses={expenses} incomes={incomes} />
        </div>
      )}
    </div>
  );
};

export default TransactionsPage; 