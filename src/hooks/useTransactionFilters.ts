import { useMemo } from 'react';
import { Expense, Income } from '../types';

interface UseTransactionFiltersProps {
  expenses: Expense[];
  incomes: Income[];
  currentTab: 'all' | 'income' | 'expenses';
  searchTerm: string;
  categoryFilter: string;
  paymentMethodFilter: string;
  sortField: 'date' | 'amount' | 'merchantName';
  sortDirection: 'asc' | 'desc';
}

export const useTransactionFilters = ({
  expenses,
  incomes,
  currentTab,
  searchTerm,
  categoryFilter,
  paymentMethodFilter,
  sortField,
  sortDirection
}: UseTransactionFiltersProps) => {
  const filteredTransactions = useMemo(() => {
    let transactions: (Expense | Income)[] = [];
    if (currentTab === 'all') {
      transactions = [...expenses, ...incomes];
    } else {
      transactions = currentTab === 'income' ? incomes : expenses;
    }
    
    return transactions.filter(transaction => {
      // Apply category and payment method filters first
      const matchesCategoryFilter = categoryFilter === 'all' || 
        transaction.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesPaymentMethod = paymentMethodFilter === 'all' || 
        transaction.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase();
      
      // If search term is empty, only apply category and payment method filters
      if (!searchTerm.trim()) {
        return matchesCategoryFilter && matchesPaymentMethod;
      }
      
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Convert amount to string and remove any non-numeric characters for comparison
      const amountStr = Math.abs(transaction.amount).toString();
      const searchAmount = searchLower.replace(/[^0-9.]/g, '');
      
      // Check if search term matches amount (exact or partial numeric match)
      const matchesAmount = searchAmount && (
        // Exact match
        amountStr === searchAmount ||
        // Partial match
        amountStr.includes(searchAmount) ||
        // Match with decimal point
        amountStr.includes(searchAmount.replace('.', '')) ||
        // Match with currency symbol
        amountStr.includes(searchAmount.replace(/[^0-9]/g, ''))
      );
      
      // Check if search term matches merchant name (case-insensitive partial match)
      const matchesMerchant = transaction.merchantName?.toLowerCase().includes(searchLower);
      // Check if search term matches notes (case-insensitive partial match)
      const matchesNotes = transaction.notes?.toLowerCase().includes(searchLower);
      // Check if search term matches category (case-insensitive partial match)
      const matchesCategory = transaction.category.toLowerCase().includes(searchLower);
      
      // Return true if any of the search criteria match AND category/payment method filters match
      return (matchesAmount || matchesMerchant || matchesNotes || matchesCategory) && 
             matchesCategoryFilter && 
             matchesPaymentMethod;
    }).sort((a, b) => {
      if (sortField === 'date') {
        return sortDirection === 'asc' ? 
          new Date(a.date).getTime() - new Date(b.date).getTime() : 
          new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortField === 'amount') {
        return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      } else {
        const aName = a.merchantName || '';
        const bName = b.merchantName || '';
        return sortDirection === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
    });
  }, [expenses, incomes, currentTab, searchTerm, categoryFilter, paymentMethodFilter, sortField, sortDirection]);

  return filteredTransactions;
};