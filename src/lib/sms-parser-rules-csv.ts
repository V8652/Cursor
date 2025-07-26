import { SmsParserRule } from '@/types/sms-parser';
import { getSmsParserRules, addSmsParserRule } from '@/lib/sms-parser-rules';
import { toast } from 'sonner';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { parseCSVFile, forceDownloadCSV } from '@/lib/csv-utils';
import { isAndroidDevice, isCapacitorApp } from '@/lib/platform-utils';
import Papa from 'papaparse';

/**
 * Export SMS parser rules to CSV with improved error handling and Android support
 */
export async function exportSmsParserRulesToCSV(filename?: string): Promise<string> {
  try {
    console.log("Starting SMS parser rules export");
    
    // Get all SMS parser rules
    const rules = await getSmsParserRules();
    console.log("Rules to export:", rules.length);
    
    if (rules.length === 0) {
      toast.error('No Rules to Export', { description: 'There are no SMS parser rules to export.' });
      throw new Error("No rules to export");
    }
    
    // Format rules for CSV export
    const exportData = rules.map(rule => ({
      name: rule.name || '',
      enabled: rule.enabled ? 'true' : 'false',
      senderMatch: Array.isArray(rule.senderMatch) 
        ? JSON.stringify(rule.senderMatch) 
        : JSON.stringify([rule.senderMatch || '']),
      amountRegex: Array.isArray(rule.amountRegex) 
        ? JSON.stringify(rule.amountRegex) 
        : JSON.stringify([rule.amountRegex || '']),
      merchantCondition: Array.isArray(rule.merchantCondition) 
        ? JSON.stringify(rule.merchantCondition) 
        : JSON.stringify([rule.merchantCondition || '']),
      merchantCommonPatterns: rule.merchantCommonPatterns 
        ? JSON.stringify(rule.merchantCommonPatterns) 
        : JSON.stringify([]),
      paymentBank: rule.paymentBank || '',
      priority: rule.priority !== undefined ? rule.priority : 0,
      skipCondition: Array.isArray(rule.skipCondition) ? JSON.stringify(rule.skipCondition) : JSON.stringify(rule.skipCondition ? [rule.skipCondition] : []),
      transactionType: rule.transactionType || '',
      merchantExtractions: rule.merchantExtractions ? JSON.stringify(rule.merchantExtractions) : '',
      merchantStartText: rule.merchantExtractions && rule.merchantExtractions[0] ? rule.merchantExtractions[0].startText || '' : (rule.merchantStartText || ''),
      merchantEndText: rule.merchantExtractions && rule.merchantExtractions[0] ? rule.merchantExtractions[0].endText || '' : (rule.merchantEndText || ''),
      merchantStartIndex: rule.merchantExtractions && rule.merchantExtractions[0] ? rule.merchantExtractions[0].startIndex || 1 : (rule.merchantStartIndex || 1)
    }));
    
    // Generate CSV filename with date if not provided
    if (!filename) {
      const date = new Date();
      const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      filename = `sms-parser-rules_${timestamp}.csv`;
    }
    
    // Convert data to CSV
    const csvContent = Papa.unparse(exportData, {
      header: true,
      skipEmptyLines: true
    });
    
    // Use our enhanced CSV download function which handles Android correctly
    const result = await forceDownloadCSV(csvContent, filename);
    
    toast('Export Complete', { description: `SMS parser rules exported successfully` });
    
    return result;
  } catch (error) {
    console.error('Error exporting SMS parser rules:', error);
    
    // Only show toast if it's not the "No rules to export" error which already has a toast
    if ((error as Error).message !== "No rules to export") {
      toast.error('Export Failed', { description: `Failed to export rules: ${(error as Error).message || "Unknown error"}` });
    }
    
    throw error;
  }
}

/**
 * Import SMS parser rules from CSV with improved processing for Android
 */
export async function importSmsParserRulesFromCSV(file: File): Promise<SmsParserRule[]> {
  try {
    console.log("Starting SMS parser rules import from", file.name);
    
    const importedData = await parseCSVFile<Record<string, any>>(file);
    console.log("Parsed CSV data:", importedData.length, "items");
    
    if (importedData.length === 0) {
      throw new Error('No rules found in the CSV file');
    }
    
    // Get existing rules to avoid duplicates
    const existingRules = await getSmsParserRules();
    const existingRuleNames = new Set(existingRules.map(rule => rule.name));
    
    const importedRules: SmsParserRule[] = [];
    let skippedCount = 0;
    let duplicateCount = 0;
    
    for (const item of importedData) {
      try {
        // Skip if no name provided
        if (!item.name) {
          console.log("Skipping rule without name");
          skippedCount++;
          continue;
        }
        
        // Track duplicates separately
        if (existingRuleNames.has(item.name)) {
          console.log("Skipping duplicate rule:", item.name);
          duplicateCount++;
          continue;
        }
        
        console.log("Processing rule:", item.name);
        
        // Parse JSON arrays with better error handling
        let senderMatch = [];
        try {
          senderMatch = typeof item.senderMatch === 'string' 
            ? JSON.parse(item.senderMatch) 
            : Array.isArray(item.senderMatch) ? item.senderMatch : [item.senderMatch].filter(Boolean);
        } catch (e) {
          console.warn("Error parsing senderMatch, using as-is:", e);
          senderMatch = Array.isArray(item.senderMatch) ? item.senderMatch : 
                        item.senderMatch ? [item.senderMatch] : [];
        }
        
        let amountRegex = [];
        try {
          amountRegex = typeof item.amountRegex === 'string' 
            ? JSON.parse(item.amountRegex) 
            : Array.isArray(item.amountRegex) ? item.amountRegex : [item.amountRegex].filter(Boolean);
        } catch (e) {
          console.warn("Error parsing amountRegex, using as-is:", e);
          amountRegex = Array.isArray(item.amountRegex) ? item.amountRegex : 
                        item.amountRegex ? [item.amountRegex] : [];
        }
        
        let merchantCondition = [];
        try {
          merchantCondition = typeof item.merchantCondition === 'string' 
            ? JSON.parse(item.merchantCondition) 
            : Array.isArray(item.merchantCondition) ? item.merchantCondition : [item.merchantCondition].filter(Boolean);
        } catch (e) {
          console.warn("Error parsing merchantCondition, using as-is:", e);
          merchantCondition = Array.isArray(item.merchantCondition) ? item.merchantCondition : 
                             item.merchantCondition ? [item.merchantCondition] : [];
        }
        
        let merchantCommonPatterns = [];
        try {
          merchantCommonPatterns = typeof item.merchantCommonPatterns === 'string' 
            ? JSON.parse(item.merchantCommonPatterns) 
            : Array.isArray(item.merchantCommonPatterns) ? item.merchantCommonPatterns : [];
        } catch (e) {
          console.warn("Error parsing merchantCommonPatterns, using as-is:", e);
          merchantCommonPatterns = Array.isArray(item.merchantCommonPatterns) ? item.merchantCommonPatterns : 
                                  item.merchantCommonPatterns ? [item.merchantCommonPatterns] : [];
        }
        
        let merchantExtractions = [];
        try {
          if (item.merchantExtractions) {
            merchantExtractions = typeof item.merchantExtractions === 'string' ? JSON.parse(item.merchantExtractions) : item.merchantExtractions;
          } else if (item.merchantStartText || item.merchantEndText || item.merchantStartIndex) {
            merchantExtractions = [{
              startText: item.merchantStartText || '',
              endText: item.merchantEndText || '',
              startIndex: item.merchantStartIndex ? parseInt(item.merchantStartIndex) || 1 : 1
            }];
          }
        } catch (e) {
          merchantExtractions = [];
        }
        
        // For skipCondition, support both skipCondition and skipConditions fields:
        let skipCondition = [];
        try {
          if (typeof item.skipCondition === 'string') {
            // Try to parse as JSON array, fallback to splitting by comma
            if (item.skipCondition.trim().startsWith('[')) {
              skipCondition = JSON.parse(item.skipCondition);
            } else if (item.skipCondition.includes(',')) {
              skipCondition = item.skipCondition.split(',').map(s => s.trim()).filter(Boolean);
            } else if (item.skipCondition.trim() !== '') {
              skipCondition = [item.skipCondition.trim()];
            } else {
              skipCondition = [];
            }
          } else if (Array.isArray(item.skipCondition)) {
            skipCondition = item.skipCondition;
          } else if (item.skipConditions) {
            // legacy plural field
            skipCondition = Array.isArray(item.skipConditions) ? item.skipConditions : [item.skipConditions];
          } else {
            skipCondition = [];
          }
        } catch (e) {
          skipCondition = [];
        }
        
        // Create rule object with better type safety
        const ruleData = {
          name: item.name,
          enabled: item.enabled === true || item.enabled === 'true' || item.enabled === 'TRUE',
          senderMatch: senderMatch,
          amountRegex: amountRegex,
          merchantCondition: merchantCondition,
          merchantCommonPatterns: merchantCommonPatterns,
          paymentBank: item.paymentBank || '',
          priority: typeof item.priority === 'number' ? item.priority : 
                   typeof item.priority === 'string' ? parseInt(item.priority) || 0 : 0,
          skipCondition: skipCondition,
          transactionType: item.transactionType || '',
          merchantExtractions: merchantExtractions,
          merchantStartText: item.merchantStartText || '',
          merchantEndText: item.merchantEndText || '',
          merchantStartIndex: typeof item.merchantStartIndex === 'number' ? item.merchantStartIndex :
                            typeof item.merchantStartIndex === 'string' ? parseInt(item.merchantStartIndex) || 1 : 1
        };
        
        console.log("Adding rule:", ruleData.name);
        const rule = await addSmsParserRule(ruleData);
        console.log("Rule added:", rule.id);
        
        importedRules.push({
          ...rule,
          merchantStartText: rule.merchantExtractions && rule.merchantExtractions[0] ? rule.merchantExtractions[0].startText || '' : '',
          merchantEndText: rule.merchantExtractions && rule.merchantExtractions[0] ? rule.merchantExtractions[0].endText || '' : '',
          merchantStartIndex: rule.merchantExtractions && rule.merchantExtractions[0] ? rule.merchantExtractions[0].startIndex || 1 : 1
        });
      } catch (error) {
        console.error(`Error importing rule:`, error);
        skippedCount++;
      }
    }
    
    // Notify UI about the imported rules
    dbEvents.emit(DatabaseEvent.SMS_RULES_REFRESH);
    
    const message = `Imported ${importedRules.length} rules` + 
                   (skippedCount > 0 ? `, skipped ${skippedCount} invalid entries` : '') +
                   (duplicateCount > 0 ? `, ignored ${duplicateCount} duplicates` : '');
                   
    toast('Import Complete', { description: message });
    
    return importedRules;
  } catch (error) {
    console.error('Error importing SMS parser rules:', error);
    toast.error('Import Failed', { description: `Failed to import rules: ${(error as Error).message || "Unknown error"}` });
    throw error;
  }
}
