import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { getExpenses, getIncomes } from '@/lib/db';
import ExpenseEditForm from '@/components/ExpenseEditForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Info, Search, ScanLine, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TableScrollArea } from '@/components/ui/table';
import { motion, AnimatePresence } from 'framer-motion';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile, isNativeApp } from '@/hooks/use-mobile';
import { LogoutButton } from '@/components/LogoutButton';
import SmsScanView from '@/components/SmsScanView';

// Add minimal local types:
type Expense = { amount: number; date: string; category: string; [key: string]: any };
type Income = { amount: number; date: string; category: string; [key: string]: any };

const Expenses = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const isNative = isNativeApp();
  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true);
      try {
        const [loadedExpenses, loadedIncomes] = await Promise.all([getExpenses(), getIncomes()]);
        setExpenses(loadedExpenses);
        setIncomes(loadedIncomes);
      } catch (error) {
        console.error('Error loading transactions:', error);
        toast.error('Error', { description: 'Failed to load transactions' });
      } finally {
        setIsLoading(false);
      }
    };
    loadTransactions();
  }, [refreshKey]);
  const handleScanComplete = (newExpenses: Expense[]) => {
    setScanError(null);
    if (newExpenses.length > 0) {
      setRefreshKey(prev => prev + 1);
      toast('Scan Complete', { description: `Found ${newExpenses.length} new expenses.` });
    }
  };
  const handleScanError = (errorMessage: string) => {
    setScanError(errorMessage);
  };
  const handleTransactionChange = () => {
    setRefreshKey(prev => prev + 1);
  };
  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditExpenseOpen(true);
  };
  const handleExpenseEditSave = () => {
    setRefreshKey(prev => prev + 1);
    setIsEditExpenseOpen(false);
    setSelectedExpense(null);
  };
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };
  return <Layout>
    <div className="space-y-6 max-w-6xl w-full max-w-full mx-auto px-2 md:px-0 p-0">
        <motion.div className="space-y-4" initial="hidden" animate="visible" variants={containerVariants}>
          <motion.div variants={itemVariants} className="space-y-4">
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full" initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} exit={{
            opacity: 0
          }} transition={{
            duration: 0.3
          }}>
            <div className="order-2 md:order-1 w-full max-w-full">
              <div className="space-y-4 w-full max-w-full">
                <SmsScanView />
              </div>
                </div>
            <div className="order-1 md:order-2 w-full max-w-full">
              <div className="space-y-4 w-full max-w-full">
                {/* Remove the <SmsScanView /> component in the second column */}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
      </div>
      {selectedExpense && (
        <ExpenseEditForm
          expense={{
            type: 'expense',
            id: selectedExpense.id || 'unknown',
            merchantName: selectedExpense.merchantName || '',
            notes: selectedExpense.notes || '',
            paymentMethod: selectedExpense.paymentMethod || '',
            currency: selectedExpense.currency || 'INR',
            source: selectedExpense.source || 'manual',
            ...selectedExpense
          }}
          isOpen={isEditExpenseOpen}
          onClose={() => setIsEditExpenseOpen(false)}
          onSave={handleExpenseEditSave}
        />
      )}
    </Layout>;
};
export default Expenses;