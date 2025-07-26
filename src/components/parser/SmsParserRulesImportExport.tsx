import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { checkAndRequestStoragePermissions, pickFile } from '@/lib/file-utils';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { exportSmsParserRulesToCSV, importSmsParserRulesFromCSV } from '@/lib/sms-parser-rules-csv';
import { motion } from 'framer-motion';

interface SmsParserRulesImportExportProps {
  onDataChanged: () => void;
}

const SmsParserRulesImportExport = ({
  onDataChanged
}: SmsParserRulesImportExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      console.log('Starting export of SMS parser rules...');
      
      toast({
        title: "Starting Export",
        description: "Preparing SMS parser rules for export...",
      });
      
      const hasPermissions = await checkAndRequestStoragePermissions();
      console.log("Storage permissions check result:", hasPermissions);
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to export data.",
          variant: "destructive"
        });
        return;
      }

      // Use enhanced filename with timestamp
      const filename = `sms-parser-rules_${new Date().toISOString().slice(0, 10)}.csv`;
      await exportSmsParserRulesToCSV(filename);
      toast({
        title: "Export Complete",
        description: `SMS parser rules exported successfully.\nOn Android, check your Downloads folder or Files app.`
      });
      console.log('SMS parser rules export completed successfully');
      
    } catch (error) {
      console.error('Error exporting SMS parser rules:', error);
      // Only show error if it wasn't already shown in the export function
      if ((error as Error).message !== "No rules to export") {
        toast({
          title: "Export Failed",
          description: `Failed to export data: ${(error as Error).message || "Unknown error"}`,
          variant: "destructive"
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      console.log('Setting up SMS parser rules import...');
      
      const hasPermissions = await checkAndRequestStoragePermissions();
      console.log("Storage permissions check result:", hasPermissions);
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to import data.",
          variant: "destructive"
        });
        return;
      }
      
      const file = await pickFile(['text/csv', '.csv', 'application/vnd.ms-excel']);
      console.log("Selected file:", file ? file.name : "none");
      
      if (!file) {
        console.log('No file selected');
        toast({
          title: "Import Cancelled",
          description: "No file was selected for import.",
          variant: "destructive"
        });
        setIsImporting(false);
        return;
      }

      toast({
        title: "Processing Import",
        description: "Analyzing SMS parser rules...",
      });

      try {
        const importedRules = await importSmsParserRulesFromCSV(file);
        console.log("Imported rules count:", importedRules.length);
        
        // Emit events to refresh UI
        dbEvents.emit(DatabaseEvent.SMS_RULES_REFRESH);
        
        // Notify parent component about data change
        onDataChanged();
      } catch (importError) {
        console.error('Error during import process:', importError);
        // Import function handles its own toast notifications
      }
    } catch (error) {
      console.error('Error setting up file input:', error);
      toast({
        title: "Import Failed",
        description: `Failed to initialize import: ${(error as Error).message || "Unknown error"}`,
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import/Export SMS Parser Rules</CardTitle>
        <CardDescription>
          Import and export your SMS parser rules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="default" 
            onClick={handleExport} 
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="mr-2"
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Exporting..." : "Export SMS Parser Rules"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleImport} 
            disabled={isImporting}
            className="flex-1"
          >
            {isImporting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="mr-2"
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isImporting ? "Importing..." : "Import SMS Parser Rules"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmsParserRulesImportExport;
