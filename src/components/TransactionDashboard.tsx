import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Tag, Filter, ChevronDown, ChevronRight, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { getCategoryIcon, CategoryIconName, categoryIconMap } from '@/lib/category-icons';
import TransactionDetails from './TransactionDetails';
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ExpenseEditForm from './ExpenseEditForm';
import IncomeEditForm from './IncomeEditForm';
import { getUserCategories } from '@/lib/db';
import { getExpandedState, saveExpandedState, updateExpandedState, normalizeDateToUTC } from '@/lib/expanded-state';
import { useNavigate } from 'react-router-dom';
import { Expense, Income, Transaction } from '@/types';
import { usePreferences } from '@/hooks/usePreferences';
import { Preference } from '@/types/db';

const FILTER_STATE_KEY = 'transaction-dashboard-filters';

const getInitialFilterState = () => {
  try {
    const savedState = localStorage.getItem(FILTER_STATE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      console.log('Loading filter state:', parsedState);
      return {
        searchTerm: parsedState.searchTerm || '',
        categoryFilter: parsedState.categoryFilter || 'all',
        paymentMethodFilter: parsedState.paymentMethodFilter || 'all',
        activeTab: parsedState.activeTab || 'all' as const,
      };
    }
  } catch (error) {
    console.error('Error loading saved filter state:', error);
  }
  return {
    searchTerm: '',
    categoryFilter: 'all',
    paymentMethodFilter: 'all',
    activeTab: 'all' as const,
  };
};

const normalizeCategoryKey = (category: string) =>
  (category || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').trim();

const formatDate = (date: Date) => {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

const TransactionCard = React.memo(({ 
  transaction, 
  onView, 
  onEdit,
  categoryIcons,
  categoryColors,
  currency
}: { 
  transaction: Expense | Income;
  onView: (transaction: Expense | Income) => void;
  onEdit: (transaction: Expense | Income) => void;
  categoryIcons: Record<string, CategoryIconName>;
  categoryColors: Record<string, string>;
  currency: string | undefined;
}) => {
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [0.5, 1]);
  const deleteOpacity = useTransform(x, [-100, 0], [1, 0]);
  const editOpacity = useTransform(x, [0, 100], [0, 1]);

  const key = normalizeCategoryKey(transaction.category);
  const hasCustomIcon = Object.prototype.hasOwnProperty.call(categoryIcons, key);
  const hasCustomColor = Object.prototype.hasOwnProperty.call(categoryColors, key);
  const categoryColor = hasCustomColor ? categoryColors[key] : (transaction.type === 'income' ? '#10b981' : '#ef4444');
  const CategoryIcon = hasCustomIcon
    ? (categoryIconMap[categoryIcons[key]] || categoryIconMap.DollarSign)
    : getCategoryIcon(key);

  return (
    <motion.div
      key={transaction.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="relative"
      drag="x"
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(event, info) => {
        if (info.offset.x < -50) {
          onView(transaction);
        } else if (info.offset.x > 50) {
          onEdit(transaction);
        }
      }}
      style={{ x, opacity }}
    >
      {/* Delete Action */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center"
        style={{ opacity: deleteOpacity }}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </motion.div>

      {/* Edit Action */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-20 bg-blue-500 flex items-center justify-center"
        style={{ opacity: editOpacity }}
      >
        <Pencil className="h-6 w-6 text-white" />
      </motion.div>

      {/* Transaction Content */}
      <div
        className="p-4 cursor-pointer hover:bg-accent/50 bg-background"
        onClick={() => onView(transaction)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${categoryColor}20` }}>
              <CategoryIcon className="h-6 w-6" style={{ color: categoryColor }} />
            </div>
            <div>
              <span className="font-medium block">{transaction.notes && transaction.notes.trim() !== '' ? transaction.notes : transaction.merchantName}</span>
              {transaction.notes && transaction.notes.trim() !== '' && (
                <span className="text-xs text-muted-foreground capitalize block">
                  {transaction.merchantName}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`font-medium block ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), currency || 'INR')}
            </span>
            {transaction.paymentMethod && (
              <span className="text-xs text-muted-foreground block">{transaction.paymentMethod}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

TransactionCard.displayName = 'TransactionCard';

interface TransactionDashboardProps {
  expenses: Expense[];
  incomes: Income[];
  onTransactionChange?: () => void;
}

interface GroupedTransactions {
  date: Date;
  transactions: (Expense | Income)[];
  totalIncome: number;
  totalExpenses: number;
}

const Filters = React.memo(({ searchTerm, setSearchTerm, activeTab, setActiveTab, categoryFilter, setCategoryFilter, paymentMethodFilter, setPaymentMethodFilter, expenses, incomes }: any) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1"> 
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-8 w-full"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search transactions"
            autoFocus
          />
        </div>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-[90px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expenses">Expenses</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 flex-row w-full">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full">
            <Tag className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Array.from(new Set([...expenses, ...incomes].map(t => t.category))).map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
          <SelectTrigger className="w-full">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {Array.from(new Set([...expenses, ...incomes].map(t => t.paymentMethod))).map(method => (
              <SelectItem key={method} value={method}>{method}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});
Filters.displayName = 'Filters';

const TransactionGroup = React.memo(({ group, isExpanded, toggleGroup, handleTransactionClick, handleEdit, categoryIcons, categoryColors, currency }: any) => {
  const dateKey = group.date.toISOString();
  return (
    <motion.div
      key={dateKey}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
          onClick={() => toggleGroup(dateKey)}
          aria-label={`Toggle group for ${formatDate(group.date)}`}
        >
          <div className="flex items-center space-x-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <h3 className="font-medium">{formatDate(group.date)}</h3>
            <span className="text-muted-foreground">({group.transactions.length})</span>
          </div>
          <div className="flex gap-2 text-sm">
            {group.totalIncome > 0 && <span className="text-green-500 font-semibold">+{formatCurrency(group.totalIncome, currency || 'INR')}</span>}
            {group.totalExpenses > 0 && <span className="text-red-500 font-semibold">-{formatCurrency(group.totalExpenses, currency || 'INR')}</span>}
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
              <CardContent className="p-0">
                <div className="divide-y">
                  {group.transactions.map((transaction: any) => (
                    <TransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      onView={handleTransactionClick}
                      onEdit={handleEdit}
                      categoryIcons={categoryIcons}
                      categoryColors={categoryColors}
                      currency={currency}
                    />
                  ))}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
});
TransactionGroup.displayName = 'TransactionGroup';

const GROUP_BY_DATE_KEY = 'transaction-dashboard-group-by-date';

const TransactionDashboard = ({ expenses, incomes, onTransactionChange }: TransactionDashboardProps) => {
  console.log('TransactionDashboard rendered');
  // State
  const [searchTerm, setSearchTerm] = useState(getInitialFilterState().searchTerm);
  const [categoryFilter, setCategoryFilter] = useState<string>(getInitialFilterState().categoryFilter);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>(getInitialFilterState().paymentMethodFilter);
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expenses'>(getInitialFilterState().activeTab);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(getExpandedState);
  const [selectedTransaction, setSelectedTransaction] = useState<Expense | Income | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const scrollPositions = useRef<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingTransaction, setEditingTransaction] = useState<Expense | Income | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, CategoryIconName>>({});
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const prevGroupKeysRef = useRef<Set<string>>(new Set());
  const [groupByDate, setGroupByDate] = useState(() => {
    const stored = localStorage.getItem(GROUP_BY_DATE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const navigate = useNavigate();

  // Preferences
  const { data: preferences, isLoading: prefsLoading } = usePreferences() as { data: Preference | undefined, isLoading: boolean };
  const [timeFrame, setTimeFrame] = useState<string | undefined>('month');

  useEffect(() => {
    console.log('TransactionDashboard mounted');
    return () => {
      console.log('TransactionDashboard unmounted');
    };
  }, []);

  // Load user categories
  useEffect(() => {
    setLoading(true);
    const loadCategoryData = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.categoryIcons) {
          setCategoryIcons(userCategories.categoryIcons as Record<string, CategoryIconName>);
        }
        if (userCategories.categoryColors) {
          setCategoryColors(userCategories.categoryColors);
        }
      } catch (error) {
        console.error('Error loading category data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCategoryData();
  }, []);

  useEffect(() => {
    localStorage.setItem(GROUP_BY_DATE_KEY, String(groupByDate));
  }, [groupByDate]);

  // Save filter states to localStorage whenever they change
  useEffect(() => {
    const filterState = {
      searchTerm,
      categoryFilter,
      paymentMethodFilter,
      activeTab,
    };
    console.log('Saving filter state:', filterState);
    localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(filterState));
  }, [searchTerm, categoryFilter, paymentMethodFilter, activeTab]);

  // Memoized filtered transactions
  const filteredTransactions = useMemo(() => {
    let transactions: (Expense | Income)[] = [];
    if (activeTab === 'all') transactions = [...expenses, ...incomes];
    else if (activeTab === 'expenses') transactions = expenses;
    else transactions = incomes;
    return transactions.filter(transaction => {
      const searchLower = searchTerm.toLowerCase().trim();
      const searchNumeric = searchLower.replace(/[^0-9.]/g, '');

      const matchesAmount = searchNumeric !== '' && Math.abs(transaction.amount).toString().includes(searchNumeric);

      const matchesSearch = searchTerm === '' || 
        transaction.merchantName?.toLowerCase().includes(searchLower) ||
        transaction.category?.toLowerCase().includes(searchLower) ||
        transaction.paymentMethod?.toLowerCase().includes(searchLower) ||
        (transaction.notes && transaction.notes.toLowerCase().includes(searchLower)) ||
        matchesAmount;

      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
      const matchesPaymentMethod = paymentMethodFilter === 'all' || transaction.paymentMethod === paymentMethodFilter;
      return matchesSearch && matchesCategory && matchesPaymentMethod;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, incomes, activeTab, searchTerm, categoryFilter, paymentMethodFilter]);

  // Memoized grouped transactions
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, GroupedTransactions> = {};
    filteredTransactions.forEach(transaction => {
      const dateKey = normalizeDateToUTC(transaction.date);
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: new Date(dateKey),
          transactions: [],
          totalIncome: 0,
          totalExpenses: 0
        };
      }
      groups[dateKey].transactions.push(transaction);
      if (transaction.type === 'income') groups[dateKey].totalIncome += transaction.amount;
      else groups[dateKey].totalExpenses += transaction.amount;
    });
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([_, group]) => group);
  }, [filteredTransactions]);

  // Toggle group expansion
  const toggleGroup = (dateKey: string) => {
    setExpandedGroups(prev => {
      const updated = {
        ...prev,
        [dateKey]: !prev[dateKey]
      };
      saveExpandedState(updated);
      return updated;
    });
  };

  // Transaction click/edit handlers
  const handleTransactionClick = useCallback((transaction: Expense | Income) => {
    setSelectedTransaction(transaction);
    setIsDetailsOpen(true);
  }, []);
  const handleEdit = useCallback((transaction: Expense | Income) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  }, []);
  const handleEditSave = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
    if (onTransactionChange) onTransactionChange();
  }, [onTransactionChange]);
  const handleTransactionDelete = useCallback(async () => {
    if (selectedTransaction) {
      if (onTransactionChange) onTransactionChange();
      setIsDetailsOpen(false);
      setSelectedTransaction(null);
    }
  }, [selectedTransaction, onTransactionChange]);

  // Scroll position preservation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const visibleGroups = Array.from(Object.keys(expandedGroups));
      if (visibleGroups.length > 0) scrollPositions.current[visibleGroups[0]] = scrollTop;
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [expandedGroups]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const visibleGroups = Array.from(Object.keys(expandedGroups));
    if (visibleGroups.length > 0) {
      const savedPosition = scrollPositions.current[visibleGroups[0]];
      if (savedPosition !== undefined) container.scrollTop = savedPosition;
    }
  }, [expandedGroups]);

  // Preserve expanded/collapsed state of groups on data change
  useEffect(() => {
    const groupKeys = new Set(groupedTransactions.map(group => normalizeDateToUTC(group.date)));
    setExpandedGroups(prev => {
      const updated = updateExpandedState(prev, groupKeys);
      saveExpandedState(updated);
      return updated;
    });
  }, [groupedTransactions]);

  // Get unique categories and methods for dropdowns
  const allCategories = useMemo(() => Array.from(new Set([...expenses, ...incomes].map(t => t.category))).filter(Boolean), [expenses, incomes]);
  const allMethods = useMemo(() => Array.from(new Set([...expenses, ...incomes].map(t => t.paymentMethod))).filter(Boolean), [expenses, incomes]);

  // Render
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header Row with working dropdowns */}
      <div className="flex items-center justify-between mb-2 px-1 sm:px-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Transactions</h1>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={activeTab} onValueChange={v => setActiveTab(v as 'all' | 'income' | 'expenses')}>
            <SelectTrigger className="w-[90px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expenses">Expenses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Filters Row with working dropdowns */}
      <div className="flex flex-wrap md:flex-nowrap gap-2 mb-2 px-1 sm:px-3">
        <div className="flex-1 min-w-[150px]">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full flex items-center gap-2">
              <Tag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger className="w-full flex items-center gap-2">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {allMethods.map(method => (
                <SelectItem key={method} value={method}>{method}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Search Row */}
      <div className="flex flex-wrap md:flex-nowrap gap-2 mb-4 px-1 sm:px-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            className="pl-10 pr-[140px] py-2 w-full rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-300"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGroupByDate((prev) => !prev)}
            className="whitespace-nowrap rounded-xl absolute right-2 top-1/2 -translate-y-1/2 h-8 text-xs"
          >
            {groupByDate ? "Flat List" : "Group by Date"}
          </Button>
        </div>
      </div>
      {/* Loading state */}
      {loading && <div className="text-center text-muted-foreground py-8">Loading categories...</div>}
      {/* Empty state */}
      {!loading && groupedTransactions.length === 0 && <div className="text-center text-muted-foreground py-8">No transactions found.</div>}
      {/* Transaction Groups or Flat List */}
      <div ref={containerRef} className="flex-1 min-h-0 space-y-1 overflow-y-auto">
        {groupByDate ? (
          <AnimatePresence>
            {groupedTransactions.map(group => (
              <TransactionGroup
                key={normalizeDateToUTC(group.date)}
                group={group}
                isExpanded={!!expandedGroups[normalizeDateToUTC(group.date)]}
                toggleGroup={toggleGroup}
                handleTransactionClick={handleTransactionClick}
                handleEdit={handleEdit}
                categoryIcons={categoryIcons}
                categoryColors={categoryColors}
                currency={preferences?.defaultCurrency || 'INR'}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="divide-y">
            {filteredTransactions.map(transaction => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onView={handleTransactionClick}
                onEdit={handleEdit}
                categoryIcons={categoryIcons}
                categoryColors={categoryColors}
                currency={preferences?.defaultCurrency || 'INR'}
              />
            ))}
          </div>
        )}
      </div>
      {/* Transaction Details Modal */}
      <TransactionDetails
        transaction={selectedTransaction}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTransaction(null);
        }}
        onDelete={handleTransactionDelete}
        categoryIcons={categoryIcons}
        categoryColors={categoryColors}
      />
      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>Update the transaction details below</DialogDescription>
            </DialogHeader>
            {editingTransaction.type === 'income' ? (
              <IncomeEditForm
                income={editingTransaction as Income}
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onSave={handleEditSave}
              />
            ) : (
              <ExpenseEditForm
                expense={editingTransaction as Expense}
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onSave={handleEditSave}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TransactionDashboard; 