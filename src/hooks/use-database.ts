import { useState, useEffect, useCallback, useMemo } from 'react';
import { Expense, Income, Transaction } from '@/types';
import { 
  getExpenses, 
  getIncomes, 
  getExpensesByDateRange, 
  getIncomesByDateRange,
  getFinancialSummary
} from '@/lib/db';
import { dbEvents, DatabaseEvent, useDbEvents, useMultipleDbEvents } from '@/lib/db-event';
import { type FinancialSummary } from '@/types/db';

interface UseTransactionsOptions {
  timeframe?: 'week' | 'month' | 'all' | 'custom';
  dateRange?: { from: Date, to: Date };
  autoRefresh?: boolean;
  pageSize?: number;
}

// Cache for financial summaries
const summaryCache = new Map<string, { summary: FinancialSummary, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useTransactions(options: UseTransactionsOptions = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({ totalExpenses: 0, totalIncome: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const { timeframe = 'month', dateRange, autoRefresh = true, pageSize = 50 } = options;

  // Memoize the date range calculation
  const dateRangeMemo = useMemo(() => {
    if (timeframe === 'week') {
      const today = new Date();
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay());
      const lastDay = new Date(today);
      lastDay.setDate(today.getDate() + (6 - today.getDay()));
      return { startDate: firstDay.toISOString(), endDate: lastDay.toISOString() };
    } else if (timeframe === 'month') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: firstDay.toISOString(), endDate: lastDay.toISOString() };
    } else if (timeframe === 'custom' && dateRange) {
      return {
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString()
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [timeframe, dateRange]);

  // Function to get cache key
  const getCacheKey = useCallback(() => {
    const { startDate, endDate } = dateRangeMemo;
    return `${timeframe}-${startDate}-${endDate}`;
  }, [timeframe, dateRangeMemo]);

  // Function to check and get cached summary
  const getCachedSummary = useCallback(() => {
    const cacheKey = getCacheKey();
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.summary;
    }
    return null;
  }, [getCacheKey]);

  // Function to update cache
  const updateCache = useCallback((summary: FinancialSummary) => {
    const cacheKey = getCacheKey();
    summaryCache.set(cacheKey, { summary, timestamp: Date.now() });
  }, [getCacheKey]);

  const loadData = useCallback(async () => {
    console.log('Loading data in useTransactions with timeframe:', timeframe);
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cachedSummary = getCachedSummary();
      if (cachedSummary) {
        setSummary(cachedSummary);
        setIsLoading(false);
        return;
      }

      const { startDate, endDate } = dateRangeMemo;
      let expensesResult: Expense[];
      let incomesResult: Income[];
      
      if (startDate && endDate) {
        // Load only the necessary data for summary
        const [expensesResult, incomesResult] = await Promise.all([
          getExpensesByDateRange(startDate, endDate),
          getIncomesByDateRange(startDate, endDate)
        ]);
        
        // Calculate summary
        const totalExpenses = expensesResult.reduce((sum, expense) => sum + expense.amount, 0);
        const totalIncome = incomesResult.reduce((sum, income) => sum + income.amount, 0);
        const balance = totalIncome - totalExpenses;
        
        const newSummary = { totalExpenses, totalIncome, balance };
        setSummary(newSummary);
        updateCache(newSummary);
        
        // Only load full data if needed
        if (currentPage > 1) {
          setExpenses(expensesResult);
          setIncomes(incomesResult);
        }
      } else {
        // For 'all' timeframe, load everything
        [expensesResult, incomesResult] = await Promise.all([
          getExpenses(),
          getIncomes()
        ]);
        
        const totalExpenses = expensesResult.reduce((sum, expense) => sum + expense.amount, 0);
        const totalIncome = incomesResult.reduce((sum, income) => sum + income.amount, 0);
        const balance = totalIncome - totalExpenses;
        
        const newSummary = { totalExpenses, totalIncome, balance };
        setSummary(newSummary);
        updateCache(newSummary);
        
        setExpenses(expensesResult);
        setIncomes(incomesResult);
      }
      
      setCurrentPage(1);
      dbEvents.emit(DatabaseEvent.BALANCE_UPDATED);
      
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  }, [dateRangeMemo, getCachedSummary, updateCache, currentPage]);

  // Memoize the database change handler
  const handleDatabaseChange = useCallback(() => {
    // Clear cache on data changes
    summaryCache.clear();
    setRefreshKey(prev => prev + 1);
  }, []);

  useMultipleDbEvents([
    [DatabaseEvent.TRANSACTION_ADDED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_UPDATED, handleDatabaseChange],
    [DatabaseEvent.TRANSACTION_DELETED, handleDatabaseChange],
    [DatabaseEvent.DATA_IMPORTED, handleDatabaseChange],
    [DatabaseEvent.GMAIL_SCAN_COMPLETED, handleDatabaseChange],
    [DatabaseEvent.BALANCE_UPDATED, handleDatabaseChange],
    [DatabaseEvent.USER_PREFERENCES_UPDATED, handleDatabaseChange],
  ]);

  useEffect(() => {
    if (autoRefresh || refreshKey > 0) {
      loadData();
    }
  }, [autoRefresh, loadData, refreshKey]);

  // Memoize paginated transactions
  const paginatedTransactions = useMemo(() => {
    const allTransactions = [...expenses, ...incomes].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const startIndex = (currentPage - 1) * pageSize;
    return allTransactions.slice(startIndex, startIndex + pageSize);
  }, [expenses, incomes, currentPage, pageSize]);

  // Memoize total count for pagination
  const totalTransactions = useMemo(() => expenses.length + incomes.length, [expenses.length, incomes.length]);

  // Memoize all transactions (only used when needed)
  const allTransactions = useMemo(() => {
    return [...expenses, ...incomes].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [expenses, incomes]);

  return {
    expenses,
    incomes,
    summary,
    isLoading,
    error,
    refresh: () => {
      summaryCache.clear();
      setRefreshKey(prev => prev + 1);
    },
    allTransactions,
    paginatedTransactions,
    currentPage,
    setCurrentPage,
    totalTransactions,
    pageSize,
    hasMore: currentPage * pageSize < totalTransactions
  };
}

export function useTransaction(id: string, type: 'expense' | 'income') {
  const [transaction, setTransaction] = useState<Expense | Income | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const fetchTransaction = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { getExpense, getIncome } = await import('@/lib/db');
      
      const result = type === 'expense' 
        ? await getExpense(id)
        : await getIncome(id);
      
      setTransaction(result || null);
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to load ${type}`));
    } finally {
      setIsLoading(false);
    }
  }, [id, type]);
  
  const handleTransactionChange = useCallback(() => {
    console.log(`Refreshing transaction ${id} due to database change`);
    setRefreshKey(prev => prev + 1);
  }, [id]);
  
  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction, refreshKey]);
  
  useMultipleDbEvents([
    [DatabaseEvent.TRANSACTION_ADDED, handleTransactionChange],
    [DatabaseEvent.TRANSACTION_UPDATED, handleTransactionChange],
    [DatabaseEvent.TRANSACTION_DELETED, handleTransactionChange],
    [DatabaseEvent.DATA_IMPORTED, handleTransactionChange],
  ]);
  
  return { 
    transaction, 
    isLoading, 
    error, 
    refresh: () => setRefreshKey(prev => prev + 1)
  };
}

export function useBalanceMonitor() {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      const summary = await getFinancialSummary();
      setBalance(summary.balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBalanceChange = useCallback(() => {
    console.log('Balance change detected');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useMultipleDbEvents([
    [DatabaseEvent.BALANCE_UPDATED, handleBalanceChange],
    [DatabaseEvent.TRANSACTION_ADDED, handleBalanceChange],
    [DatabaseEvent.TRANSACTION_UPDATED, handleBalanceChange],
    [DatabaseEvent.TRANSACTION_DELETED, handleBalanceChange],
    [DatabaseEvent.DATA_IMPORTED, handleBalanceChange],
  ]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, refreshTrigger]);

  return { balance, isLoading, refresh: () => setRefreshTrigger(prev => prev + 1) };
}
