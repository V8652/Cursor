import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Form, FormControl, FormDescription, 
  FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Expense, ExpenseCategory } from '@/types';
import { updateTransaction, getUserCategories } from '@/lib/db';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

const expenseSchema = z.object({
  merchantName: z.string().min(1, 'Merchant name is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentMethod: z.string().optional(),
  date: z.date(),
  category: z.string(),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseEditFormProps {
  expense: Expense;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ExpenseEditForm = ({ expense, isOpen, onClose, onSave }: ExpenseEditFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  
  // FIX: Use a form key to force re-creation of the form when expense changes
  const formKey = expense?.id || 'default-key';
  
  // Load custom categories
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.expenseCategories) {
          setCustomCategories(userCategories.expenseCategories);
        }
        if (userCategories.categoryColors) {
          setCategoryColors(userCategories.categoryColors);
        }
      } catch (error) {
        console.error('Error loading custom categories:', error);
      }
    };
    
    loadCustomCategories();
  }, []);
  
  // FIX: Reset form when expense changes
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      merchantName: expense.merchantName,
      // Always use positive amount in the form
      amount: Math.abs(expense.amount),
      paymentMethod: expense.paymentMethod || '',
      date: new Date(expense.date),
      category: expense.category,
      notes: expense.notes || '',
    },
  });
  
  // FIX: Update form values when expense changes
  useEffect(() => {
    form.reset({
      merchantName: expense.merchantName,
      // Always use positive amount in the form
      amount: Math.abs(expense.amount),
      paymentMethod: expense.paymentMethod || '',
      date: new Date(expense.date),
      category: expense.category,
      notes: expense.notes || '',
    });
  }, [expense, form]);
  
  // Keyboard avoidance for Android
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'web') {
      let showHandler: any;
      let hideHandler: any;
      (async () => {
        showHandler = await Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardPadding(300); // or info.keyboardHeight if available
        });
        hideHandler = await Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardPadding(0);
        });
      })();
      return () => {
        showHandler && showHandler.remove();
        hideHandler && hideHandler.remove();
      };
    }
  }, []);

  useEffect(() => {
    const handleFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    window.addEventListener('focusin', handleFocus);
    return () => window.removeEventListener('focusin', handleFocus);
  }, []);
  
  const handleSubmit = async (values: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      const updatedExpense: Expense = {
        ...expense,
        merchantName: values.merchantName,
        // Always store amount as positive
        amount: Math.abs(values.amount),
        paymentMethod: values.paymentMethod || '',
        date: values.date.toLocaleDateString('en-CA'),
        category: values.category as ExpenseCategory,
        notes: values.notes || '',
        currency: expense.currency || 'INR',
        type: 'expense',
        source: expense.source || 'manual',
      };
      
      await updateTransaction(updatedExpense);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to get color for a category
  const getCategoryColor = (category: string): string => {
    return categoryColors[category] || '#8E9196';
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto pb-32" style={{ paddingBottom: keyboardPadding }}>
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>
            Update the expense details below
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="merchantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Only include 'other' as the default category */}
                      <SelectItem value="other" className="capitalize">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor('other') }}></div>
                          <span>Other</span>
                        </div>
                      </SelectItem>
                      
                      {/* Include all custom categories */}
                      {customCategories.map(category => (
                        <SelectItem key={category} value={category} className="capitalize">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(category) }}></div>
                            <span>{category.replace(/-/g, ' ')}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        classNames={{
                          month: "space-y-2",
                          table: "w-full border-collapse space-y-0",
                          head_row: "flex",
                          row: "flex w-full mt-0 mb-0",
                          cell: "h-9 w-9 text-center p-0 relative focus-within:relative focus-within:z-20",
                          day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90 ring-2 ring-blue-500 ring-offset-2",
                          day_today: "bg-accent text-accent-foreground",
                          day_outside: "text-muted-foreground opacity-50",
                          day_disabled: "text-muted-foreground opacity-50",
                          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                          day_hidden: "invisible"
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseEditForm;
