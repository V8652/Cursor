import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Tag, Calendar, CreditCard, MessageSquare, ArrowUp } from 'lucide-react';
import { Income } from '@/types';
import { deleteTransaction } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface IncomeCardProps {
  income: Income;
  onEdit: (income: Income) => void;
  onDelete: () => void;
  currency?: string;
}

const IncomeCard: React.FC<IncomeCardProps> = ({ income, onEdit, onDelete, currency }) => {
  const handleDelete = async (e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
    }
    
    try {
      // Delete the transaction
      await deleteTransaction(income.id);
      
      toast({
        title: 'Income deleted',
        description: 'The income has been removed successfully',
      });
      
      // Emit ALL events BEFORE calling onDelete to ensure UI components update
      dbEvents.emit(DatabaseEvent.TRANSACTION_DELETED);
      dbEvents.emit(DatabaseEvent.DATA_IMPORTED);
      dbEvents.emit(DatabaseEvent.BALANCE_UPDATED);
      dbEvents.emit(DatabaseEvent.UI_REFRESH_NEEDED);
      dbEvents.emit(DatabaseEvent.TRANSACTION_LIST_REFRESH);
      
      // Call onDelete callback after successful deletion
      if (onDelete) {
        onDelete();
      }
      
      console.log('Transaction deleted callback received, reloading data');
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete income. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formattedDate = format(new Date(income.date), 'MMM d, yyyy');
  const formattedAmount = formatCurrency(income.amount, currency || 'INR');
  
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="force-refresh-animation"
      onClick={() => onEdit(income)}
    >
      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ArrowUp className="h-5 w-5 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">{income.merchantName}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>
            <span className="text-green-600 dark:text-green-500 font-semibold text-lg">+{formattedAmount}</span>
          </div>
          
          <div className="grid gap-2 mt-3">
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Category:</span>
              <Badge variant="outline" className="text-xs ml-auto capitalize py-0 h-5">
                {formatCategoryName(income.category)}
              </Badge>
            </div>
            
            {income.paymentMethod && (
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Payment:</span>
                <span className="text-xs ml-auto">{income.paymentMethod}</span>
              </div>
            )}
            
            {income.notes && (
              <div className="mt-1">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Notes:</span>
                </div>
                <p className="text-xs mt-0.5 text-muted-foreground line-clamp-2">{income.notes}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-muted/20 flex justify-between items-center p-2 border-t">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(income);
            }}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          
          {income.paymentMethod && (
            <div className="flex items-center bg-secondary/40 px-2 py-1 rounded text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              <span>{income.paymentMethod}</span>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(e);
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default IncomeCard;
