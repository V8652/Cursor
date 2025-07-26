import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { getIncomes, getExpenses } from '@/lib/db';
import { dbEvents, DatabaseEvent, useDbEvents, useMultipleDbEvents } from '@/lib/db-event';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactions, useBalanceMonitor } from '@/hooks/use-database';

export interface NetBalanceDisplayProps {
  totalIncome: number;
  totalExpenses: number;
  timeframe: string;
  currency?: string;
}

const NetBalanceDisplay = ({ totalIncome, totalExpenses, timeframe, currency }: NetBalanceDisplayProps) => {
  const [netBalance, setNetBalance] = useState<number>(0);
  const [allTimeIncome, setAllTimeIncome] = useState<number>(0);
  const [allTimeExpenses, setAllTimeExpenses] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previousBalance, setPreviousBalance] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Use our custom hooks for real-time data
  const { refresh: refreshTransactions } = useTransactions({
    autoRefresh: false
  });

  // Define calculateNetBalance as a memoized callback to prevent recreation
  const calculateNetBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('NetBalanceDisplay: Calculating net balance...');
      // Get all incomes and expenses
      const allIncomes = await getIncomes();
      const allExpenses = await getExpenses();
      
      // Calculate total income and expenses across all time
      // Both are stored as positive numbers now
      const totalAllTimeIncome = allIncomes.reduce((sum, income) => sum + income.amount, 0);
      const totalAllTimeExpenses = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Calculate net balance (total income - total expenses)
      const totalNetBalance = totalAllTimeIncome - totalAllTimeExpenses;
      
      // Store previous balance for animation
      setPreviousBalance(netBalance);
      
      // Update state
      setAllTimeIncome(totalAllTimeIncome);
      setAllTimeExpenses(totalAllTimeExpenses);
      setNetBalance(totalNetBalance);
      
      console.log('NetBalanceDisplay updated:', { 
        totalAllTimeIncome, 
        totalAllTimeExpenses, 
        totalNetBalance 
      });
    } catch (error) {
      console.error('Error calculating net balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [netBalance]);

  // More comprehensive event handling for real-time updates
  const handleDatabaseChange = useCallback(() => {
    console.log('Database change detected in NetBalanceDisplay - refreshing');
    calculateNetBalance();
    setRefreshTrigger(prev => prev + 1);
    refreshTransactions();
  }, [calculateNetBalance, refreshTransactions]);

  // Subscribe to ALL relevant events using the new multiple events hook
  useMultipleDbEvents([
    [DatabaseEvent.BALANCE_UPDATED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_ADDED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_UPDATED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_DELETED, handleDatabaseChange],
    [DatabaseEvent.DATA_IMPORTED, handleDatabaseChange],
    [DatabaseEvent.GMAIL_SCAN_COMPLETED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_LIST_REFRESH, handleDatabaseChange],
    [DatabaseEvent.UI_REFRESH_NEEDED, handleDatabaseChange]
  ]);

  // Calculate initial balance
  useEffect(() => {
    calculateNetBalance();
  }, [calculateNetBalance, refreshTrigger]);

  const isPositive = netBalance >= 0;
  const hasChanged = previousBalance !== null && previousBalance !== netBalance;

  return (
    <Card className="border-t-4" style={{ borderTopColor: isPositive ? '#10b981' : '#ef4444' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Net Balance</CardTitle>
        <p className="text-sm text-muted-foreground">All Time</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Calculating balance...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div 
                key={`balance-${netBalance}-${refreshTrigger}`}
                initial={hasChanged ? { opacity: 0, y: hasChanged && previousBalance && previousBalance < netBalance ? 20 : -20 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`text-3xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}
              >
                {formatCurrency(netBalance, currency || 'INR')}
              </motion.div>
            </AnimatePresence>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div 
                  key={`income-${allTimeIncome}-${refreshTrigger}`} 
                  className="flex items-center"
                  initial={hasChanged ? { opacity: 0, scale: 0.9 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <ArrowUp className="mr-1 h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    Income: <span className="font-medium text-green-500">{formatCurrency(allTimeIncome, currency || 'INR')}</span>
                  </span>
                </motion.div>
              </AnimatePresence>
              
              <AnimatePresence mode="wait" initial={false}>
                <motion.div 
                  key={`expense-${allTimeExpenses}-${refreshTrigger}`}
                  className="flex items-center"
                  initial={hasChanged ? { opacity: 0, scale: 0.9 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">
                    Expenses: <span className="font-medium text-red-500">{formatCurrency(allTimeExpenses, currency || 'INR')}</span>
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="text-xs text-muted-foreground pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
              {timeframe}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NetBalanceDisplay;
