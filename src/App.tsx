import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import TransactionsPage from './pages/Transactions';
import { initDB } from "./lib/db";
import { ThemeProvider } from "./components/theme-provider";
import { dbEvents, DatabaseEvent } from "./lib/db-event";
import CommandPalette from "./components/CommandPalette";

// Configure the query client with more aggressive refetching options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // More frequent staleness (30 seconds)
      retry: 1,
      refetchOnWindowFocus: true, // Enable refetching on window focus
      refetchOnMount: true, // Always refresh when a component mounts
      refetchOnReconnect: true, // Refresh on network reconnect
    },
  },
});

// Create a separate AppContent component to use router hooks
const AppContent: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const location = useLocation();
  
  React.useEffect(() => {
    initDB().catch(error => {
      console.error("Failed to initialize database:", error);
    });
    
    // Set up a periodic global refresh mechanism - but don't trigger page re-renders
    const intervalId = setInterval(() => {
      // Only refresh essential data, not the UI
      dbEvents.emit(DatabaseEvent.BALANCE_UPDATED);
      dbEvents.emit(DatabaseEvent.TRANSACTION_LIST_REFRESH);
    }, 60000); // Every minute
    
    // Subscribe to all events and invalidate queries as needed
    const unsubscribeAdd = dbEvents.subscribe(DatabaseEvent.TRANSACTION_ADDED, () => {
      console.log("Transaction added - invalidating all queries");
      queryClient.invalidateQueries();
    });
    
    const unsubscribeUpdate = dbEvents.subscribe(DatabaseEvent.TRANSACTION_UPDATED, () => {
      console.log("Transaction updated - invalidating all queries");
      queryClient.invalidateQueries();
    });
    
    const unsubscribeDelete = dbEvents.subscribe(DatabaseEvent.TRANSACTION_DELETED, () => {
      queryClient.invalidateQueries();
    });
    
    const unsubscribeImport = dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, () => {
      queryClient.invalidateQueries();
    });
    
    const unsubscribeCategoriesImport = dbEvents.subscribe(DatabaseEvent.CATEGORIES_IMPORTED, () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    });
    
    const unsubscribeParserRulesImport = dbEvents.subscribe(DatabaseEvent.PARSER_RULES_IMPORTED, () => {
      queryClient.invalidateQueries({ queryKey: ['parserRules'] });
    });
    
    const unsubscribeMerchantNotesImport = dbEvents.subscribe(DatabaseEvent.MERCHANT_NOTES_IMPORTED, () => {
      queryClient.invalidateQueries({ queryKey: ['merchantNotes'] });
    });
    
    const unsubscribeBalanceUpdated = dbEvents.subscribe(DatabaseEvent.BALANCE_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    });
    
    const unsubscribePreferencesUpdated = dbEvents.subscribe(DatabaseEvent.USER_PREFERENCES_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    });
    
    const unsubscribeTransactionListRefresh = dbEvents.subscribe(DatabaseEvent.TRANSACTION_LIST_REFRESH, () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    });
    
    const unsubscribeCategoriesRefresh = dbEvents.subscribe(DatabaseEvent.CATEGORIES_REFRESH, () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    });
    
    // Updated to use SMS_RULES_REFRESH instead of PARSER_RULES_REFRESH
    const unsubscribeParserRulesRefresh = dbEvents.subscribe(DatabaseEvent.SMS_RULES_REFRESH, () => {
      queryClient.invalidateQueries({ queryKey: ['parserRules'] });
    });
    
    const unsubscribeUiRefresh = dbEvents.subscribe(DatabaseEvent.UI_REFRESH_NEEDED, () => {
      queryClient.invalidateQueries();
    });
    
    // Remove the refresh trigger update to prevent UI refreshes
    const unsubscribeForceUiRefresh = dbEvents.subscribe(DatabaseEvent.FORCE_UI_REFRESH, (data) => {
      queryClient.invalidateQueries();
      // Removed the refresh trigger update to prevent automatic UI refreshing
    });
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
      
      // Add a global refresh shortcut (Ctrl+Shift+R or Cmd+Shift+R)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "r") {
        e.preventDefault();
        console.log("Manual refresh triggered via keyboard shortcut");
        dbEvents.refreshAll('keyboard-shortcut');
        setRefreshTrigger(prev => prev + 1);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    
    // Only refresh data, not UI, when visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Document became visible - refreshing data");
        dbEvents.refreshAll('visibility-change');
        // Removed the refresh trigger update to prevent automatic UI refreshing
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      unsubscribeAdd();
      unsubscribeUpdate();
      unsubscribeDelete();
      unsubscribeImport();
      unsubscribeCategoriesImport();
      unsubscribeParserRulesImport();
      unsubscribeMerchantNotesImport();
      unsubscribeBalanceUpdated();
      unsubscribePreferencesUpdated();
      unsubscribeTransactionListRefresh();
      unsubscribeCategoriesRefresh();
      unsubscribeParserRulesRefresh();
      unsubscribeUiRefresh();
      unsubscribeForceUiRefresh();
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <Toaster />
      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
      <Routes>
        {/* Remove key prop with refreshTrigger to prevent automatic re-renders */}
        <Route path="/" element={<Index />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="expense-tracker-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <HashRouter>
              <AppContent />
            </HashRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
};

export default App;
