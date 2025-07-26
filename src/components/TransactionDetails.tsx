import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Transaction, ExpenseCategory, IncomeCategory } from '../types';
import { toast } from '../hooks/use-toast';
import { deleteTransaction, updateTransaction, getUserCategories } from '../lib/db';
import { dbEvents, DatabaseEvent } from '../lib/db-event';
import { format } from 'date-fns';
import { Trash2, X, CreditCard, Calendar, Tag, MessageSquare, DollarSign, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { motion } from 'framer-motion';
import { formatCurrency } from '../lib/utils';
import { getCategoryIcon } from '../lib/category-icons';
import { CategoryIconName, categoryIconMap } from '../lib/category-icons';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

// Add missing types
type Expense = Transaction & {
  type: 'expense';
  category: ExpenseCategory;
};

type Income = Transaction & {
  type: 'income';
  category: IncomeCategory;
};

interface TransactionDetailsProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  categoryIcons: Record<string, CategoryIconName>;
  categoryColors: Record<string, string>;
  currency?: string;
}

const normalizeCategoryKey = (category: string) =>
  (category || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').trim();

const TransactionDetails = ({ 
  transaction, 
  isOpen, 
  onClose,
  onDelete,
  categoryIcons,
  categoryColors,
  currency
}: TransactionDetailsProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  useEffect(() => {
    if (transaction) {
      setEditCategory(transaction.category || '');
      setEditPaymentMethod(transaction.paymentMethod || '');
      setEditNotes(transaction.notes || '');
    }
  }, [transaction, isOpen]);

  useEffect(() => {
    if (!transaction) return;
    const loadCategories = async () => {
      const userCategories = await getUserCategories();
      let categories: string[] = [];
      if (transaction.type === 'income') {
        categories = userCategories.incomeCategories || [];
      } else {
        categories = userCategories.expenseCategories || [];
      }
      // Always include 'other' as fallback
      if (!categories.includes('other')) categories.unshift('other');
      setCategoryOptions(categories);
    };
    loadCategories();
  }, [transaction]);

  useEffect(() => {
    const handleFocus = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'
      ) {
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    window.addEventListener('focusin', handleFocus);
    return () => window.removeEventListener('focusin', handleFocus);
  }, []);

  if (!transaction) {
    return null;
  }
  
  const handleDelete = async () => {
    if (!transaction) return;
    
    try {
      setIsDeleting(true);
      await deleteTransaction(transaction.id);
      dbEvents.broadcast([
        DatabaseEvent.TRANSACTION_DELETED,
        DatabaseEvent.BALANCE_UPDATED,
        DatabaseEvent.TRANSACTION_LIST_REFRESH,
        DatabaseEvent.UI_REFRESH_NEEDED,
        DatabaseEvent.DATA_IMPORTED
      ]);
      toast({
        title: "Transaction deleted",
        description: "The transaction has been removed successfully"
      });
      onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const displayDate = format(new Date(transaction.date), 'PP');
  const type = transaction.type || (transaction.amount < 0 ? 'expense' : 'income');
  const isIncome = type === 'income';
  const amount = Math.abs(transaction.amount);
  
  // Use custom icon/color if available
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-xl force-refresh-animation">
        <DialogHeader className="sr-only">
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            View and manage transaction details for {transaction.merchantName}
          </DialogDescription>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="content-reflow"
        >
          <div className="max-h-[80vh] overflow-y-auto pb-32">
            <div 
              className={`w-full py-5 px-5 ${
                isIncome ? 
                  'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20' : 
                  'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    ''
                  }`} style={{ backgroundColor: `${categoryColor}20` }}>
                    {isIncome ? 
                      <ArrowUp className="h-6 w-6 text-green-600 dark:text-green-400" /> : 
                      <CategoryIcon className="h-6 w-6" style={{ color: categoryColor }} />
                    }
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{transaction.merchantName}</h2>
                    <div className="flex items-center gap-1 mt-1 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{displayDate}</span>
                    </div>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isIncome ? '+' : '-'}{formatCurrency(amount, currency || 'INR')}
                </div>
              </div>
            </div>
            
            <div className="px-5 py-4 space-y-3">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Category:</span>
                  {isEditing ? (
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger className="ml-auto w-40">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat.replace(/-/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="ml-auto">
                      {formatCategoryName(transaction.category)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Payment Method:</span>
                  {isEditing ? (
                    <Input
                      className="ml-auto w-40"
                      value={editPaymentMethod}
                      onChange={e => setEditPaymentMethod(e.target.value)}
                      placeholder="e.g. Credit Card"
                    />
                  ) : (
                    <span className="ml-auto px-2 py-1 bg-secondary/50 text-sm rounded-md">{transaction.paymentMethod || 'Not specified'}</span>
                  )}
                </div>
                
                {transaction.source && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Source:</span>
                    <span className="ml-auto text-sm capitalize">{transaction.source}</span>
                  </div>
                )}
              </div>
              
              {transaction.notes && transaction.notes.trim() !== '' && !transaction.notes.startsWith('Auto-extracted from SMS. Bank:') && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Notes</span>
                    </div>
                    {isEditing ? (
                      <Textarea
                        className="resize-none"
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="Add notes..."
                        rows={3}
                      />
                    ) : (
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm">{transaction.notes}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter className="bg-muted/20 px-5 py-3 flex items-center justify-between gap-2 flex-nowrap w-full overflow-x-auto">
              {isEditing ? (
                <>
                  <div className="flex gap-2 flex-nowrap min-w-0 flex-shrink">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      className="gap-1 min-w-0 flex-shrink text-xs px-2 py-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={async () => {
                        try {
                          const updated = {
                            ...transaction,
                            category: (transaction.type === 'income'
                              ? editCategory as IncomeCategory
                              : editCategory as ExpenseCategory),
                            paymentMethod: editPaymentMethod,
                            notes: editNotes,
                            type: transaction.type
                          };
                          if (transaction.type === 'income') {
                            await updateTransaction(updated as Income);
                          } else {
                            await updateTransaction(updated as Expense);
                          }
                          toast({
                            title: 'Transaction updated',
                            description: 'The transaction has been updated successfully',
                          });
                          setIsEditing(false);
                          onClose();
                        } catch (error) {
                          toast({
                            title: 'Error',
                            description: 'Failed to update transaction',
                            variant: 'destructive',
                          });
                        }
                      }}
                      className="gap-1 min-w-0 flex-shrink text-xs px-2 py-1"
                    >
                      Save
                    </Button>
                  </div>
                  <div className="flex-nowrap min-w-0 flex-shrink">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="gap-1 min-w-0 flex-shrink text-xs px-2 py-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-2 flex-nowrap min-w-0 flex-shrink">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                      className="gap-1 min-w-0 flex-shrink text-xs px-2 py-1"
                    >
                      <X className="h-4 w-4" />
                      Close
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="gap-1 min-w-0 flex-shrink text-xs px-2 py-1"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                  <div className="flex-nowrap min-w-0 flex-shrink">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="gap-1 min-w-0 flex-shrink text-xs px-2 py-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </>
              )}
            </DialogFooter>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetails;
