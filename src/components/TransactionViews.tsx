import { useState, useMemo, useEffect } from 'react';
import { Expense, Income } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Tag, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  List, 
  LayoutGrid, 
  Loader2, 
  AlertCircle, 
  Plus, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  DollarSign 
} from 'lucide-react';
import { getUserCategories, getExpenses, getIncomes, deleteTransaction } from '../lib/db';
import { format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../components/ui/use-toast';
import { dbEvents, DatabaseEvent } from '../lib/db-event';
import { getExpandedState, saveExpandedState, updateExpandedState, normalizeDateToUTC } from '../lib/expanded-state';
import { Button } from '@/components/ui/button';
import { getCategoryIcon } from '@/lib/category-icons';
import { formatCurrency } from '@/lib/utils';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import { useDatabaseEvents } from '@/hooks/useDatabaseEvents';
import { useTransactionManagement } from '@/hooks/useTransactionManagement';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FilterControls } from '@/components/FilterControls';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import TransactionCardView from './TransactionCardView';
import ExpenseEditForm from './ExpenseEditForm';
import IncomeEditForm from './IncomeEditForm';

interface TransactionViewsProps {
  expenses: Expense[];
  incomes: Income[];
  activeTab?: 'expenses' | 'income' | 'all';
  onTransactionChange?: () => void;
  currency?: string;
}

interface GroupedTransactions {
  date: Date;
  transactions: (Expense | Income)[];
}

interface TransactionItemProps {
  transaction: Expense | Income;
  categoryColors: Record<string, string>;
  onTransactionClick: (transaction: Expense | Income) => void;
  currency?: string;
}

interface TransactionGroupProps {
  group: GroupedTransactions;
  isExpanded: boolean;
  onToggle: () => void;
  renderTransactions: (transactions: (Expense | Income)[]) => React.ReactNode;
}

const TransactionItem = ({ transaction, categoryColors, onTransactionClick, currency = 'INR' }: TransactionItemProps & { currency?: string }) => {
  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <motion.div
      key={transaction.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="force-refresh-animation"
      onClick={() => onTransactionClick(transaction)}
    >
      <div className="flex items-center p-4 rounded-xl bg-card hover:bg-accent/10 transition-all duration-200 cursor-pointer border shadow-sm hover:shadow-md">
        <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: `${categoryColors[transaction.category] || (transaction.type === 'income' ? '#10b981' : '#ef4444')}20` }}>
          {getCategoryIcon(transaction.category)({ className: "h-5 w-5", style: { color: categoryColors[transaction.category] || (transaction.type === 'income' ? '#10b981' : '#ef4444') } })}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-xs">
            {transaction.merchantName}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{formatDate(new Date(transaction.date))}</span>
            {transaction.paymentMethod && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
                <span className="truncate">{transaction.paymentMethod}</span>
              </>
            )}
          </div>
        </div>
        
        <p className={`font-medium text-right pl-3 text-lg ${transaction.type === 'income' ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-400"}`}>
          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), currency)}
        </p>
      </div>
    </motion.div>
  );
};

const TransactionGroup = ({
  group,
  isExpanded,
  onToggle,
  renderTransactions
}: TransactionGroupProps) => {
  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <div className="mb-4">
      <div 
        className="flex items-center justify-between mb-2 cursor-pointer"
        onClick={onToggle}
      >
        <h3 className="text-sm font-medium">
          {formatDate(group.date)}
        </h3>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderTransactions(group.transactions)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EmptyState = ({ type }: { type: 'all' | 'income' | 'expenses' }) => {
  const message = {
    all: "No transactions found. Add your first transaction to get started!",
    income: "No income transactions found. Add your first income to get started!",
    expenses: "No expense transactions found. Add your first expense to get started!"
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
      <p className="text-muted-foreground mb-4">{message[type]}</p>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Add {type === 'all' ? 'Transaction' : type === 'income' ? 'Income' : 'Expense'}
      </Button>
    </div>
  );
};

const LoadingState = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="ml-2 text-muted-foreground">Loading transactions...</span>
  </div>
);

const TransactionViews = ({
  expenses,
  incomes,
  activeTab = 'all',
  onTransactionChange,
  currency = 'INR'
}: TransactionViewsProps) => {
  // Get initial filter state from localStorage or use defaults
  const getInitialFilterState = () => {
    try {
      const savedState = localStorage.getItem('transaction-filters');
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      console.error('Error loading saved filter state:', error);
    }
    return {
      searchTerm: '',
      categoryFilter: 'all',
      paymentMethodFilter: 'all',
      sortField: 'date' as const,
      sortDirection: 'desc' as const,
      viewMode: 'list' as const
    };
  };

  const [searchTerm, setSearchTerm] = useState(getInitialFilterState().searchTerm);
  const [categoryFilter, setCategoryFilter] = useState<string>(getInitialFilterState().categoryFilter);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>(getInitialFilterState().paymentMethodFilter);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'merchantName'>(getInitialFilterState().sortField);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(getInitialFilterState().sortDirection);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(getExpandedState);
  const [currentTab, setCurrentTab] = useState<'all' | 'income' | 'expenses'>(activeTab);
  const [viewMode, setViewMode] = useState<'list' | 'card'>(getInitialFilterState().viewMode);
  const [isLoading, setIsLoading] = useState(true);

  const {
    localExpenses,
    localIncomes,
    selectedExpense,
    selectedIncome,
    isEditExpenseOpen,
    isEditIncomeOpen,
    handleExpenseClick,
    handleIncomeClick,
    handleExpenseEditSave,
    handleIncomeEditSave,
    handleTransactionDelete,
    setLocalExpenses,
    setLocalIncomes,
    setIsEditExpenseOpen,
    setIsEditIncomeOpen
  } = useTransactionManagement({ onTransactionChange });

  const { categoryColors } = useDatabaseEvents({
    onDataChange: () => {
      setLocalExpenses(expenses);
      setLocalIncomes(incomes);
    }
  });

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
    setLocalExpenses(expenses);
    setLocalIncomes(incomes);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [expenses, incomes, setLocalExpenses, setLocalIncomes]);

  // Save filter state to localStorage whenever it changes
  useEffect(() => {
    const filterState = {
      searchTerm,
      categoryFilter,
      paymentMethodFilter,
      sortField,
      sortDirection,
      viewMode
    };
    localStorage.setItem('transaction-filters', JSON.stringify(filterState));
  }, [searchTerm, categoryFilter, paymentMethodFilter, sortField, sortDirection, viewMode]);

  const paymentMethods = useMemo(() => {
    const methodsSet = new Set<string>();
    [...localExpenses, ...localIncomes].forEach(transaction => {
      if (transaction.paymentMethod) {
        methodsSet.add(transaction.paymentMethod);
      }
    });
    return Array.from(methodsSet);
  }, [localExpenses, localIncomes]);

  const categories = useMemo(() => {
    const categoriesSet = new Set([
      ...localIncomes.map(income => income.category),
      ...localExpenses.map(expense => expense.category)
    ]);
    return Array.from(categoriesSet).sort();
  }, [localIncomes, localExpenses]);

  const filteredTransactions = useTransactionFilters({
    expenses: localExpenses,
    incomes: localIncomes,
    currentTab,
    searchTerm,
    categoryFilter,
    paymentMethodFilter,
    sortField,
    sortDirection
  });

  const groupTransactionsByDate = (transactions: (Expense | Income)[]): GroupedTransactions[] => {
    const groups: { [key: string]: (Expense | Income)[] } = {};
    transactions.forEach(transaction => {
      const dateKey = normalizeDateToUTC(transaction.date);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(transaction);
    });
    return Object.entries(groups)
      .map(([dateKey, transactions]) => ({
        date: new Date(dateKey),
        transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const groupedTransactions = useMemo(() => {
    return groupTransactionsByDate(filteredTransactions);
  }, [filteredTransactions]);

  useEffect(() => {
    const groupKeys = new Set(groupedTransactions.map(group => normalizeDateToUTC(group.date)));
    setExpandedDates(prev => {
      const updated = updateExpandedState(prev, groupKeys);
      saveExpandedState(updated);
      return updated;
    });
  }, [groupedTransactions]);

  const toggleDateSection = (dateKey: string) => {
    setExpandedDates(prev => {
      const updated = {
        ...prev,
        [dateKey]: !prev[dateKey]
      };
      saveExpandedState(updated);
      return updated;
    });
  };

  const handleTransactionClick = (transaction: Expense | Income) => {
    if (transaction.type === 'income') {
      handleIncomeClick(transaction as Income);
    } else {
      handleExpenseClick(transaction as Expense);
    }
  };

  const renderTransactions = (transactions: (Expense | Income)[]) => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (transactions.length === 0) {
      return <EmptyState type={currentTab} />;
    }

    if (viewMode === 'card') {
      return (
        <TransactionCardView
          transaction={transactions}
          transactionType={currentTab}
          onEdit={handleTransactionClick}
          onDelete={async () => {
            const transaction = transactions[0];
            await handleTransactionDelete(transaction.id, transaction.type === 'income' ? 'income' : 'expenses');
          }}
          categoryColors={categoryColors}
          currency={currency}
        />
      );
    }

    return (
      <div className="space-y-3">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            categoryColors={categoryColors}
            onTransactionClick={handleTransactionClick}
            currency={currency}
          />
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (filteredTransactions.length === 0) {
      return <EmptyState type={currentTab} />;
    }

    return (
      <>
        <TabsContent value="all" className="mt-4">
          {groupedTransactions.map(group => {
            const dateKey = normalizeDateToUTC(group.date);
            const isExpanded = !!expandedDates[dateKey];

            return (
              <TransactionGroup
                key={dateKey}
                group={group}
                isExpanded={isExpanded}
                onToggle={() => toggleDateSection(dateKey)}
                renderTransactions={renderTransactions}
              />
            );
          })}
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          {renderTransactions(filteredTransactions.filter(t => t.type === 'income'))}
        </TabsContent>
        <TabsContent value="expenses" className="mt-4">
          {renderTransactions(filteredTransactions.filter(t => t.type === 'expense'))}
        </TabsContent>
      </>
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setPaymentMethodFilter('all');
    // Don't reset sort and view mode as they are user preferences
  };

  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const totalExpenses = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const netAmount = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
            <p className="text-muted-foreground">
              Manage and track your financial transactions
            </p>
        </div>
        </div>
        <Button size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
              Total Income
            </CardTitle>
            <Badge variant="outline" className="text-green-600 dark:text-green-500">
              +{formatCurrency(totalIncome, 'USD')}
            </Badge>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-500" />
              Total Expenses
            </CardTitle>
            <Badge variant="outline" className="text-red-600 dark:text-red-500">
              -{formatCurrency(totalExpenses, 'USD')}
            </Badge>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Net Amount
            </CardTitle>
            <Badge 
              variant="outline" 
              className={netAmount >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}
            >
              {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount, 'USD')}
            </Badge>
          </CardHeader>
        </Card>
              </div>
              
      <Card>
        <CardContent className="p-6">
          <FilterControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            paymentMethodFilter={paymentMethodFilter}
            onPaymentMethodChange={setPaymentMethodFilter}
            viewMode={viewMode}
            onViewModeChange={() => setViewMode(viewMode === 'list' ? 'card' : 'list')}
            categories={categories}
            paymentMethods={paymentMethods}
            onClearFilters={handleClearFilters}
          />

          <Separator className="my-6" />

          <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'all' | 'income' | 'expenses')}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="income" className="flex-1">Income</TabsTrigger>
              <TabsTrigger value="expenses" className="flex-1">Expenses</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[calc(100vh-400px)] mt-4">
              {renderContent()}
            </ScrollArea>
          </Tabs>
                    </CardContent>
            </Card>

      {selectedExpense && (
        <ExpenseEditForm
          expense={selectedExpense}
          isOpen={isEditExpenseOpen}
          onClose={() => setIsEditExpenseOpen(false)}
          onSave={handleExpenseEditSave}
        />
      )}
      {selectedIncome && (
        <IncomeEditForm
          income={selectedIncome}
          isOpen={isEditIncomeOpen}
          onClose={() => setIsEditIncomeOpen(false)}
          onSave={handleIncomeEditSave}
        />
      )}
    </div>
  );
};

export default TransactionViews;
