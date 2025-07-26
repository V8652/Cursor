
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { checkAndRequestStoragePermissions, pickFile } from '@/lib/file-utils';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { 
  exportSmsParserRulesToCSV, 
  importSmsParserRulesFromCSV 
} from '@/lib/sms-parser-rules-csv';

interface ParserRulesImportExportProps {
  onDataChanged: () => void;
}

const ParserRulesImportExport = ({ onDataChanged }: ParserRulesImportExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const handleExportParserRules = async () => {
    try {
      setIsExporting(true);
      console.log('Starting export of parser rules...');
      
      const hasPermissions = await checkAndRequestStoragePermissions();
      console.log('Storage permissions check result:', hasPermissions);
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to export data.",
          variant: "destructive",
        });
        return;
      }
      
      await exportSmsParserRulesToCSV();
      console.log('SMS parser rules export completed successfully');
      
      toast({
        title: "Export Complete",
        description: "SMS parser rules have been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting parser rules:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export data: ${(error as Error).message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleImportParserRules = async () => {
    try {
      setIsImporting(true);
      console.log('Setting up parser rules import...');
      
      const hasPermissions = await checkAndRequestStoragePermissions();
      console.log('Storage permissions check result:', hasPermissions);
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to import data.",
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }
      
      const file = await pickFile(['text/csv']);
      
      if (!file) {
        console.log('No file selected, cancelling import');
        setIsImporting(false);
        return;
      }
      
      try {
        const rules = await importSmsParserRulesFromCSV(file);
        
        dbEvents.emit(DatabaseEvent.SMS_RULES_REFRESH);
        
        onDataChanged();
        
        toast({
          title: "Import Complete",
          description: `Successfully imported ${rules.length} SMS parser rules.`,
        });
      } catch (error) {
        console.error('Error importing parser rules:', error);
        toast({
          title: "Import Failed",
          description: `Failed to import data: ${(error as Error).message}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error setting up file input:', error);
      setIsImporting(false);
      
      toast({
        title: "Import Failed",
        description: `Failed to set up file picker: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">SMS Parser Rules Management</h3>
          <p className="text-sm text-muted-foreground">
            Import and export your SMS parser rules
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="default" 
            onClick={handleExportParserRules} 
            disabled={isExporting}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export SMS Parser Rules"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleImportParserRules} 
            disabled={isImporting}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import SMS Parser Rules"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParserRulesImportExport;
