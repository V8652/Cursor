import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportTransactionsToCSV, importTransactionsFromCSV } from '@/lib/csv-handler';
import { checkAndRequestStoragePermissions, pickFile } from '@/lib/file-utils'; 
import { isAndroidDevice } from '@/lib/platform-utils';
import { motion } from 'framer-motion';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { deleteAllTransactions, getExpenses, getIncomes } from '@/lib/db';

interface DataImportExportProps {
  onDataChanged?: () => void;
}

const DataImportExport = ({ onDataChanged }: DataImportExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastImportTime, setLastImportTime] = useState<Date | null>(null);
  
  // Check for last import time in localStorage
  useEffect(() => {
    const lastImport = localStorage.getItem('lastImportTime');
    if (lastImport) {
      setLastImportTime(new Date(lastImport));
    }
  }, []);
  
  // Listen for import events
  useEffect(() => {
    const handleDataImported = () => {
      const now = new Date();
      setLastImportTime(now);
      localStorage.setItem('lastImportTime', now.toISOString());
      if (onDataChanged) onDataChanged();
    };
    
    const unsubscribe = dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, handleDataImported);
    return () => unsubscribe();
  }, [onDataChanged]);

  // Function to handle transaction data export
  const handleExportTransactions = async () => {
    try {
      setIsExporting(true);
      console.log('Starting transaction export...');
      
      // Enhanced logging for Android debugging
      const isAndroid = isAndroidDevice();
      if (isAndroid) {
        console.log('Android device detected, platform details:');
        console.log('- User Agent:', navigator.userAgent);
      }
      
      toast({
        title: "Starting Export",
        description: "Preparing transaction data for export...",
      });
      
      // Request storage permissions first on Android
      const hasPermissions = await checkAndRequestStoragePermissions();
      console.log('Storage permissions check result:', hasPermissions);
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to export data. Please grant permissions in your device settings.",
          variant: "destructive",
        });
        return;
      }
      
      // Export transactions to CSV with a timestamp in the filename
      const date = new Date();
      const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const filename = `transactions_${timestamp}.csv`;
      
      await exportTransactionsToCSV(filename);
      
      toast({
        title: "Export Complete",
        description: "Your transaction data has been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export data: ${(error as Error).message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Function to handle transaction data import
  const handleImportTransactions = async () => {
    try {
      setIsImporting(true);
      console.log('Starting transaction import...');
      
      // Request storage permissions first on Android
      const hasPermissions = await checkAndRequestStoragePermissions();
      console.log('Storage permissions check result:', hasPermissions);
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to import data. Please grant permissions in your device settings.",
          variant: "destructive",
        });
        return;
      }
      
      // Pick file using platform-specific method
      const file = await pickFile();
      if (!file) {
        console.log('No file selected');
        return;
      }
      
      try {
        // Import transactions from the selected CSV file
        const importedData = await importTransactionsFromCSV(file);
        console.log('Import successful:', importedData.length, 'transactions');
        
        // Update last import time and save to localStorage
        const now = new Date();
        setLastImportTime(now);
        localStorage.setItem('lastImportTime', now.toISOString());
        
        // Trigger data updated events
        dbEvents.emit(DatabaseEvent.DATA_IMPORTED, true);
      } catch (importError) {
        console.error('Error importing transactions:', importError);
        toast({
          title: "Import Failed",
          description: `Failed to import data: ${(importError as Error).message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error setting up import:', error);
      toast({
        title: "Import Failed",
        description: `Failed to set up file picker: ${(error as Error).message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Function to handle deleting all transactions
  const handleDeleteAllTransactions = async () => {
    if (!window.confirm('Are you sure you want to delete ALL transactions? This action cannot be undone.')) return;
    try {
      setIsDeleting(true);
      await deleteAllTransactions();
      toast({
        title: 'All Transactions Deleted',
        description: 'All transaction data has been permanently deleted.',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete all transactions.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>
          Import and export your transaction data
          {lastImportTime && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground mt-1 block"
            >
              Last import: {lastImportTime.toLocaleString()}
            </motion.span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleExportTransactions}
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Transactions
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleImportTransactions}
            disabled={isImporting}
            className="flex-1"
          >
            {isImporting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Transactions
              </>
            )}
          </Button>
        </div>
        <Button
          variant="destructive"
          onClick={handleDeleteAllTransactions}
          disabled={isDeleting}
          className="w-full"
        >
          {isDeleting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Transactions
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DataImportExport;
