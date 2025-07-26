import { Expense } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { getCategoryIcon, categoryIconMap } from '@/lib/category-icons';
import { getUserCategories } from '@/lib/db';
import { useEffect, useState } from 'react';

export interface ExpenseCardProps {
  expense: Expense;
  onClick?: () => void;
  onUpdate?: () => void;
  refreshKey?: number;
  currency?: string;
}

const ExpenseCard = ({ expense, onClick, onUpdate, refreshKey = 0, currency }: ExpenseCardProps) => {
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [categoryIcons, setCategoryIcons] = useState<Record<string, string>>({});
  const [timeAgo, setTimeAgo] = useState('');
  
  // Load category colors and set initial timeAgo
  useEffect(() => {
    const loadCategorySettings = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.categoryColors) {
          setCategoryColors(userCategories.categoryColors);
        }
        if (userCategories.categoryIcons) {
          setCategoryIcons(userCategories.categoryIcons);
        }
      } catch (error) {
        console.error('Error loading category settings:', error);
      }
    };
    
    loadCategorySettings();
  }, []);
  
  // Update time ago format at regular intervals
  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo(formatDistanceToNow(new Date(expense.date), { addSuffix: true }));
    };
    
    // Update immediately
    updateTimeAgo();
    
    // Set up interval to update every minute
    const intervalId = setInterval(updateTimeAgo, 60000);
    
    return () => clearInterval(intervalId);
  }, [expense.date, refreshKey]);

  const {
    merchantName,
    amount,
    date,
    category,
    paymentMethod,
    notes
  } = expense;

  const formattedDate = format(new Date(date), 'MMM d, yyyy');
  
  // Format currency (INR) - Always display positive amounts for expenses with the negative sign added in the UI
  const formatCurrencyValue = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleClick = () => {
    if (onClick) onClick();
  };

  // Get category icon based on user preferences or fallback to automatic mapping
  const getCategoryIconComponent = (category: string) => {
    // If there's a user-defined icon for this category, use it
    if (categoryIcons[category]) {
      // Use the icon name from categoryIcons to get the actual component from categoryIconMap
      return categoryIconMap[categoryIcons[category]] || categoryIconMap.DollarSign;
    }
    
    // Otherwise use the automatic mapping
    return getCategoryIcon(category);
  };
  
  // Get category icon
  const CategoryIcon = getCategoryIconComponent(category);
  
  // Get category color
  const getCategoryColor = () => {
    return categoryColors[category] || `var(--${category}-color, var(--primary))`;
  };

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
    <AnimatePresence mode="wait">
      <motion.div
        key={`${expense.id}-${refreshKey}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className="w-full force-refresh-animation"
      >
        <div className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border">
          <div className="p-4">
            <div className="flex justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center" 
                  style={{ backgroundColor: `${getCategoryColor()}20` }}
                >
                  <CategoryIcon className="h-5 w-5" style={{ color: getCategoryColor() }} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium line-clamp-1">{notes || merchantName}</h3>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{timeAgo}</span>
                    {merchantName !== notes && notes && (
                      <span className="truncate max-w-[120px]">• {merchantName}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-semibold text-destructive">
                  -{formatCurrencyValue(amount, currency || 'INR')}
                </span>
                {paymentMethod && (
                  <div className="mt-1">
                    <span className="inline-flex text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                      {paymentMethod}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div 
            className="h-1" 
            style={{ backgroundColor: getCategoryColor() }}
          ></div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExpenseCard;
