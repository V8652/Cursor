import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SmsService } from '@/lib/sms-service';
import { toast } from '@/hooks/use-toast';
import { Loader2, Smartphone, AlertCircle, Info, Download, PlusCircle, Filter, SortAsc, SortDesc, BarChart2, History, ListChecks } from 'lucide-react';
import DateRangeSelector from '@/components/DateRangeSelector';
import { getSmsParserRules } from '@/lib/sms-parser-rules';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { saveAs } from 'file-saver';
import { SmsParserRule } from '@/types/sms-parser';
import { usePreferences } from '@/hooks/usePreferences';
import { Preference } from '@/types/db';
import { startOfMonth, endOfMonth } from 'date-fns';
import { deleteTransaction } from '@/lib/db';
import { 
  addScanHistoryEntry, 
  loadScanHistory, 
  saveScanHistory, 
  loadScanResults, 
  saveScanResults, 
  clearScanHistory, 
  clearScanResults,
  type ScanHistoryEntry,
  type ScanResult,
  type SmsDateRange
} from '@/lib/sms-scan-history';

// Minimal Transaction type for local use
type Transaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  smsSnippet: string;
  ruleMatched?: string;
};

const SMS_SCAN_DATE_RANGE_KEY = 'smsScanDateRange';

function getInitialDateRange() {
  const stored = localStorage.getItem(SMS_SCAN_DATE_RANGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        from: parsed.from ? new Date(parsed.from) : startOfMonth(new Date()),
        to: parsed.to ? new Date(parsed.to) : endOfMonth(new Date()),
      };
    } catch {
      // ignore parse errors
    }
  }
  return {
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  };
}

const SmsScanView: React.FC = () => {
  const { data: preferences } = usePreferences() as { data: Preference | undefined };
  const [tab, setTab] = useState<'scan' | 'history'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [rules, setRules] = useState<SmsParserRule[]>([]);
  const [rulesLoaded, setRulesLoaded] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>(getInitialDateRange);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<'date' | 'amount' | 'category'>('date');
  const [sortAsc, setSortAsc] = useState(true);
  const navigate = useNavigate();

  // Load rules
  useEffect(() => {
    const loadRules = async () => {
      try {
        setRulesLoaded(false);
        const loadedRules = await getSmsParserRules();
        setRules(loadedRules);
        setRulesLoaded(true);
      } catch (error) {
        setRulesLoaded(true);
        setScanError('Failed to load SMS parser rules');
      }
    };
    loadRules();
  }, []);

  // Load scan results and history from localStorage on mount
  useEffect(() => {
    const results = loadScanResults();
    setScanResults(results);
    const historyData = loadScanHistory();
    setHistory(historyData);
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    saveScanHistory(history);
  }, [history]);

  // Refresh history when new entries are added (for dashboard scans)
  useEffect(() => {
    const refreshHistory = () => {
      const historyData = loadScanHistory();
      setHistory(historyData);
    };

    // Listen for storage events to sync history across tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'smsScanHistory') {
        refreshHistory();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also refresh periodically to catch dashboard scans
    const interval = setInterval(refreshHistory, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Persist dateRange to localStorage whenever it changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      localStorage.setItem(
        SMS_SCAN_DATE_RANGE_KEY,
        JSON.stringify({
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        })
      );
    }
  }, [dateRange]);

  // Scan SMS messages
  const handleScanSms = async () => {
    setIsScanning(true);
    setScanError(null);
    setScanResults([]);
    try {
      const enabledRules = rules.filter(rule => rule.enabled);
      if (enabledRules.length === 0) {
        toast({ title: 'No Enabled Rules', description: 'Please enable at least one SMS parser rule', variant: 'destructive' });
        setIsScanning(false);
        return;
      }
      await new Promise(res => setTimeout(res, 500));
      const transactions = await SmsService.scanSms(dateRange.from, dateRange.to);
      const results: ScanResult[] = transactions.map((t, i) => ({
        ...t,
        ruleMatched: enabledRules[i % enabledRules.length]?.name || '',
        smsSnippet: (t as any).smsSnippet || ''
      }));
      setScanResults(results);
      saveScanResults(results);
      addScanHistoryEntry(results, dateRange, undefined, 'scanner');
    } catch (error) {
      setScanError('Failed to scan SMS messages');
      addScanHistoryEntry([], dateRange, 'Failed to scan SMS messages', 'scanner');
    } finally {
      setIsScanning(false);
    }
  };

  // Export results to CSV
  const handleExportCSV = () => {
    if (scanResults.length === 0) return;
    const header = 'Date,Amount,Category,Rule,Snippet\n';
    const rows = scanResults.map(t =>
      [t.date, t.amount, t.category, t.ruleMatched || '', t.smsSnippet.replace(/\n/g, ' ')].join(',')
    ).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, `sms-scan-results-${Date.now()}.csv`);
  };

  // Filter and sort results
  const filteredResults = scanResults.filter(t =>
    t.category.toLowerCase().includes(filter.toLowerCase()) ||
    t.smsSnippet.toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (sortKey === 'amount') cmp = a.amount - b.amount;
    else if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
    return sortAsc ? cmp : -cmp;
  });

  // Clear scan results from localStorage when clearing results
  const handleClearResults = () => {
    setScanResults([]);
    clearScanResults();
  };

  // Clear scan history
  const handleClearHistory = () => {
    setHistory([]);
    clearScanHistory();
  };

  // Delete a single transaction from scan results
  const handleDeleteTransaction = async (id: string) => {
    const updated = scanResults.filter(t => t.id !== id);
    setScanResults(updated);
    saveScanResults(updated);
    try {
      await deleteTransaction(id);
      toast({ title: 'Transaction deleted', description: 'The transaction was removed from your records.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete transaction from main list.', variant: 'destructive' });
    }
  };

  // --- Modern Layout ---
  return (
    <div className="flex flex-col md:flex-row gap-6 w-full max-w-7xl mx-auto p-2 md:p-6">
      {/* Left Panel: Scan Controls & Summary */}
      <div className="md:w-1/3 w-full flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Smartphone className="h-6 w-6 text-blue-500" />
            <CardTitle className="text-lg">SMS Transaction Scanner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div>
              <div className="font-semibold mb-1">Scan Date Range</div>
              <DateRangeSelector value={dateRange} onChange={setDateRange} className="w-full" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ListChecks className="h-4 w-4" />
              {rulesLoaded ? (
                rules.length === 0 ? (
                  <span>No parser rules found</span>
                ) : (
                  <span>{rules.filter(r => r.enabled).length} of {rules.length} rules enabled</span>
                )
              ) : (
                <span>Loading rules...</span>
              )}
            </div>
            <Button 
              onClick={handleScanSms} 
              disabled={isScanning || !rulesLoaded || rules.filter(r => r.enabled).length === 0}
              className="w-full h-12 text-lg bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow"
              size="lg"
            >
              {isScanning ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Scanning...</>) : (<><Smartphone className="mr-2 h-5 w-5" />Scan SMS</>)}
            </Button>
            {scanError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{scanError}</AlertDescription></Alert>}
          </CardContent>
        </Card>
        {/* Summary/Statistics Card */}
        <Card className="shadow">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart2 className="h-5 w-5 text-green-500" />
            <CardTitle className="text-base">Scan Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* TODO: Fill with real summary data */}
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span>Total Transactions</span><span className="font-bold">{scanResults.length}</span></div>
              <div className="flex justify-between"><span>Date Range</span><span>{format(dateRange.from, 'PP')} - {dateRange.to ? format(dateRange.to, 'PP') : ''}</span></div>
              {/* Add more stats here (total amount, top categories, etc.) */}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Right Panel: Results & History */}
      <div className="md:w-2/3 w-full flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart2 className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Results</CardTitle>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={scanResults.length === 0}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
              <Button variant="outline" size="sm" onClick={handleClearResults} disabled={scanResults.length === 0}><Filter className="h-4 w-4 mr-1" />Clear Results</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* Filter/Search Bar */}
            <div className="flex items-center gap-2 mb-2">
              <Input placeholder="Filter results..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full max-w-xs" />
              <Button variant="ghost" size="icon" onClick={() => { setSortKey('date'); setSortAsc(a => !a); }}><SortAsc className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { setSortKey('amount'); setSortAsc(a => !a); }}><SortDesc className="h-4 w-4" /></Button>
            </div>
            {/* Results Table */}
            <div className="overflow-x-auto rounded border bg-slate-800">
              <table className="min-w-full text-xs text-left text-white">
                <thead className="sticky top-0 bg-slate-900">
                  <tr>
                    <th className="px-2 py-1 cursor-pointer" onClick={() => { setSortKey('date'); setSortAsc(a => !a); }}>Date</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={() => { setSortKey('amount'); setSortAsc(a => !a); }}>Amount</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={() => { setSortKey('category'); setSortAsc(a => !a); }}>Category</th>
                    <th className="px-2 py-1">Rule</th>
                    <th className="px-2 py-1">SMS Snippet</th>
                    <th className="px-2 py-1">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map(row => (
                    <tr key={row.id} className="hover:bg-slate-700">
                      <td className="px-2 py-1">{format(new Date(row.date), 'dd/MM/yyyy')}</td>
                      <td className="px-2 py-1">{row.amount}</td>
                      <td className="px-2 py-1">{row.category}</td>
                      <td className="px-2 py-1">{row.ruleMatched}</td>
                      <td className="px-2 py-1 max-w-xs truncate" title={row.smsSnippet}>{row.smsSnippet}</td>
                      <td className="px-2 py-1">
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteTransaction(row.id)} title="Delete Transaction">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredResults.length === 0 && <div className="text-center text-gray-400 py-4">No results</div>}
            </div>
          </CardContent>
        </Card>
        {/* History Section */}
        <Card className="shadow">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <History className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Scan History</CardTitle>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={handleClearHistory} disabled={history.length === 0}>Clear History</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {history.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No scan history yet</div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.map(entry => (
                  <div key={entry.id} className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {format(entry.date, 'PPp')}
                          {entry.source && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              entry.source === 'dashboard' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {entry.source === 'dashboard' ? 'Dashboard' : 'Scanner'}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(entry.range.from, 'PP')} - {format(entry.range.to, 'PP')}
                        </div>
                      </div>
                      {entry.error ? (
                        <Alert variant="destructive" className="py-1 px-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{entry.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {entry.transactions.length} transactions
                        </div>
                      )}
                    </div>
                    {!entry.error && entry.transactions.length > 0 && (
                      <div className="mt-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setScanResults(entry.transactions.map(t => ({
                            ...t,
                            smsSnippet: t.smsSnippet || '',
                            ruleMatched: t.ruleMatched || ''
                          })));
                        }}>
                          View Results
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SmsScanView;
