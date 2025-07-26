import React, { useEffect, useState } from 'react';
import { Expense, Income } from '@/types';
import { deleteTransaction, getUserCategories } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { Trash2, CreditCard, Calendar, ArrowUp, ArrowDown, MoreVertical, Tag, Receipt, Banknote, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, PanInfo, useAnimation, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { getCategoryIcon, CategoryIconName, categoryIconMap } from '@/lib/category-icons';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface TransactionCardViewProps {
  transaction: (Expense | Income | null) | (Expense | Income)[];
  transactionType: string;
  onEdit: (transaction: Expense | Income) => void;
  onDelete: () => Promise<void>;
  categoryColors: Record<string, string>;
  currency?: string;
}

const TransactionCardView: React.FC<TransactionCardViewProps> = ({
  transaction,
  transactionType,
  onEdit,
  onDelete,
  categoryColors,
  currency = 'INR',
}) => {
  const [categoryIcons, setCategoryIcons] = useState<Record<string, CategoryIconName>>({});
  const [localTransactions, setLocalTransactions] = useState<Array<Expense | Income>>(
    Array.isArray(transaction) ? transaction : (transaction ? [transaction] : [])
  );

  // Sync localTransactions with prop changes
  useEffect(() => {
    setLocalTransactions(Array.isArray(transaction) ? transaction : (transaction ? [transaction] : []));
  }, [transaction]);

  // Load custom category icons
  useEffect(() => {
    const loadCategoryIcons = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.categoryIcons) {
          setCategoryIcons(userCategories.categoryIcons as Record<string, CategoryIconName>);
        }
      } catch (error) {
        console.error('Error loading category icons:', error);
      }
    };
    
    loadCategoryIcons();
  }, []);

  const handleDelete = async (transaction: Expense | Income, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteTransaction(transaction.id);
      setLocalTransactions((prev) => prev.filter((t) => t.id !== transaction.id)); // Optimistic update
      dbEvents.emit(DatabaseEvent.TRANSACTION_DELETED);
      dbEvents.emit(DatabaseEvent.DATA_IMPORTED);
      dbEvents.emit(DatabaseEvent.BALANCE_UPDATED);
      dbEvents.emit(DatabaseEvent.UI_REFRESH_NEEDED);
      dbEvents.emit(DatabaseEvent.TRANSACTION_LIST_REFRESH);
      toast({
        title: 'Transaction deleted',
        description: 'The transaction has been successfully removed',
      });
      if (onDelete) {
        await onDelete();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete transaction. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (localTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl" />
          <Banknote className="relative h-20 w-20 text-primary/70" />
          <div className="absolute -bottom-3 -right-3 bg-background/80 backdrop-blur-sm rounded-full p-2.5 shadow-lg border border-border/50">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">No Transactions</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          {transactionType === 'income' 
            ? "You haven't recorded any income yet. Add your first income transaction to get started."
            : "You haven't recorded any expenses yet. Add your first expense to start tracking your spending."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 force-refresh-animation">
      {localTransactions.map((item) => (
        <SingleTransactionCard
          key={item.id}
          transaction={item}
          onEdit={onEdit}
          onDelete={handleDelete}
          categoryColors={categoryColors}
          categoryIcons={categoryIcons}
          currency={currency}
        />
      ))}
    </div>
  );
};

const normalizeCategoryKey = (category: string) =>
  (category || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').trim();

const SingleTransactionCard = ({
  transaction,
  onEdit,
  onDelete,
  categoryColors,
  categoryIcons,
  currency = 'INR',
}: {
  transaction: Expense | Income;
  onEdit: (transaction: Expense | Income) => void;
  onDelete: (transaction: Expense | Income, e?: React.MouseEvent) => Promise<void>;
  categoryColors: Record<string, string>;
  categoryIcons: Record<string, CategoryIconName>;
  currency?: string;
}) => {
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isIncome = transaction.type === 'income';

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    if (info.offset.x > 0) {
      // Right swipe: Show actions
      controls.start({ x: 80 });
      setShowActions(true);
    } else if (info.offset.x < -100) {
      // Left swipe past -100: Delete transaction
      controls.start({ x: -200, opacity: 0 });
      await onDelete(transaction);
    } else if (info.offset.x <= -20 && info.offset.x >= -100) {
      // Left swipe between -20 and -100: Open edit form
      onEdit(transaction);
      controls.start({ x: 0 });
    } else {
      // Any other case: Reset position
      controls.start({ x: 0 });
      setShowActions(false);
    }
  };

  const formatDate = (date: string) => {
    const transactionDate = new Date(date);
    if (isToday(transactionDate)) return 'Today';
    if (isYesterday(transactionDate)) return 'Yesterday';
    return format(transactionDate, 'MMM d, yyyy');
  };

  const formattedAmount = formatCurrency(Math.abs(transaction.amount), currency);
  const key = normalizeCategoryKey(transaction.category);
  const hasCustomIcon = Object.prototype.hasOwnProperty.call(categoryIcons, key);
  const hasCustomColor = Object.prototype.hasOwnProperty.call(categoryColors, key);
  const categoryColor = hasCustomColor ? categoryColors[key] : (isIncome ? '#10b981' : '#ef4444');
  const CategoryIcon = hasCustomIcon
    ? (categoryIconMap[categoryIcons[key]] || categoryIconMap.DollarSign)
    : getCategoryIcon(key);
  
  // Format category name with first letter capitalized
  const formatCategoryName = (category: string): string => {
    if (!category) return 'Uncategorized';
    
    // Handle hyphenated categories like 'credit-card'
    if (category.includes('-')) {
      return category.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <motion.div
      animate={controls}
      drag="x"
      dragConstraints={{ left: -200, right: 80 }}
      dragElastic={0.5}
      onDragEnd={handleDragEnd}
      onDragStart={() => setIsDragging(true)}
      className="relative"
    >
      {/* Action buttons background */}
      <div className="absolute inset-y-0 right-0 w-20 bg-primary/5 backdrop-blur-sm flex items-center justify-end pr-4 rounded-r-lg">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-primary/10"
          onClick={() => onEdit(transaction)}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete button background */}
      <div className="absolute inset-y-0 left-0 w-16 bg-red-500/90 backdrop-blur-sm flex items-center justify-center rounded-l-lg">
        <Trash2 className="h-5 w-5 text-white" />
      </div>

      {/* Card content */}
      <motion.div
        className={cn(
          "bg-card/50 backdrop-blur-sm rounded-xl p-4 cursor-pointer relative z-10",
          "border border-border/50 hover:border-border/80 transition-all duration-300",
          "shadow-sm hover:shadow-lg transition-shadow",
          "group"
        )}
        whileHover={{ scale: isDragging ? 1 : 1.01 }}
        onClick={() => onEdit(transaction)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <HoverCard>
              <HoverCardTrigger asChild>
            <div 
                  className={cn(
                    "p-2.5 rounded-full transition-all duration-300",
                    "group-hover:scale-110 group-hover:shadow-md",
                    "cursor-help relative"
                  )}
                  style={{ backgroundColor: `${categoryColor}15` }}
            >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full" />
                  <CategoryIcon className="h-5 w-5 relative z-10" style={{ color: categoryColor }} />
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 bg-background/80 backdrop-blur-sm border-border/50">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className="h-4 w-4" style={{ color: categoryColor }} />
                    <span className="font-medium">{transaction.category || 'Uncategorized'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {transaction.notes || 'No additional notes'}
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-xs">
                  {transaction.notes || transaction.merchantName || 'Unnamed Transaction'}
                </h3>
                {transaction.category && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs font-normal",
                      "transition-all duration-300",
                      "group-hover:bg-primary/5 group-hover:border-primary/20",
                      "bg-background/50 backdrop-blur-sm"
                    )}
                  >
                    {transaction.category}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(transaction.date)}</span>
            </div>
                {transaction.paymentMethod && (
                  <div className="flex items-center space-x-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>{transaction.paymentMethod}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={cn(
              "text-lg font-semibold transition-all duration-300",
              isIncome ? "text-green-600" : "text-red-600",
              "group-hover:brightness-110"
            )}>
              {isIncome ? '+' : '-'}{formattedAmount}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors duration-300" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TransactionCardView;
