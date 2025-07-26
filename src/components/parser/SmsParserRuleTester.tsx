import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, Edit, Smartphone, List, Plus, Tag, Save, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Expense, Income, Transaction } from '@/types';
import { toast } from '@/hooks/use-toast';
import { getSmsParserRules, updateSmsParserRule, createSmsParserRule } from '@/lib/sms-parser-rules';
import { SmsParserRule } from '@/types/sms-parser';
import { testSmsWithRules } from '@/lib/sms-transaction-processor';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { SmsService } from '@/lib/sms-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isNativeApp } from '@/hooks/use-mobile';
import InlineRuleEditor from './InlineRuleEditor';
import { addTransaction, addExpense, addIncome } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { suggestPatternsFromSms } from '@/lib/sms-pattern-suggest';

const SmsParserRuleTester = () => {
  const [smsText, setSmsText] = useState('');
  const [sender, setSender] = useState('');
  const [testResult, setTestResult] = useState<{
    expense?: Transaction | Expense;
    matchedRule?: SmsParserRule;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [allRules, setAllRules] = useState<SmsParserRule[]>([]);
  const [isSmsSelectorOpen, setIsSmsSelectorOpen] = useState(false);
  const [smsMessages, setSmsMessages] = useState<any[]>([]);
  const [isLoadingSms, setIsLoadingSms] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [creatingNewRule, setCreatingNewRule] = useState(false);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const isNative = isNativeApp();
  
  // New state for SMS search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSmsMessages, setFilteredSmsMessages] = useState<any[]>([]);

  // State for auto-generated patterns
  const [autoGenTriggered, setAutoGenTriggered] = useState(false);
  const [autoGenPatterns, setAutoGenPatterns] = useState<{
    amountPatterns: string[];
    merchantPatterns: string[];
    merchantCleaningPatterns: string[];
  } | null>(null);

  // Load all rules when component mounts
  useEffect(() => {
    loadRules();
    
    // Subscribe to SMS rules refresh events
    const unsubscribe = dbEvents.subscribe(DatabaseEvent.SMS_RULES_REFRESH, loadRules);
    return () => unsubscribe();
  }, []);
  
  const loadRules = async () => {
    try {
      const rules = await getSmsParserRules();
      setAllRules(rules);
    } catch (error) {
      console.error('Error loading parser rules:', error);
    }
  };

  const handleTest = async () => {
    try {
      if (!smsText.trim()) {
        setError('Please enter SMS text to test');
        return;
      }
      if (!sender.trim()) {
        setError('Please enter a sender name to test');
        return;
      }
      setError(null);
      setTestResult(null);
      setIsTesting(true);
      
      if (allRules.length === 0) {
        setError('No parser rules found. Please create some rules first.');
        return;
      }
      
      const result = await testSmsWithRules(smsText, sender, new Date(), new Date());
      if (result.expense) {
        // Find the matched rule object
        const matchedRule = allRules.find(rule => rule.id === result.matchedRule.id);
        setTestResult({
          expense: result.expense,
          matchedRule,
        });
        // Automatically start editing the matched rule
        setEditingRuleId(result.matchedRule.id || null);
      } else {
        setError('No expense could be extracted from this SMS with current rules');
      }
    } catch (error) {
      console.error('Error testing SMS:', error);
      setError(`Test failed: ${(error as Error).message}`);
    } finally {
      setIsTesting(false);
    }
  };
  
  const handleOpenSmsSelectorModal = async () => {
    try {
      setIsLoadingSms(true);
      setSmsMessages([]);
      setFilteredSmsMessages([]);
      setSearchQuery('');
      setIsSmsSelectorOpen(true);
      
      // Load all SMS messages from the device (passing 0 for no limit)
      const messages = await SmsService.loadSmsFromDevice(0);
      setSmsMessages(messages);
      setFilteredSmsMessages(messages);
      
      if (messages.length === 0) {
        toast({
          title: "No SMS Found",
          description: "No SMS messages were found on your device or permission was denied",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading SMS messages:', error);
      toast({
        title: "Error Loading SMS",
        description: "Failed to load SMS messages from your device",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSms(false);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSelectSms = (message: any) => {
    setSmsText(message.body);
    setSender(message.address);
    setIsSmsSelectorOpen(false);
    
    // Clear previous test results
    setTestResult(null);
    setError(null);
  };
  
  const handleRuleUpdated = async (updatedRule: SmsParserRule) => {
    try {
      // Create a deep copy of the updated rule
      const ruleCopy = JSON.parse(JSON.stringify(updatedRule));
      
      // Save the updated rule
      await updateSmsParserRule(ruleCopy);
      
      // Refresh rules list
      await loadRules();
      dbEvents.emit(DatabaseEvent.SMS_RULES_REFRESH);
      
      // Re-test with the updated rule
      if (smsText && sender) {
        // Test with just the updated rule
        const result = await testSmsWithRules(
          smsText, 
          sender, 
          undefined, 
          undefined,
          [ruleCopy]
        );
        
        if (result.expense) {
          setTestResult({
            expense: result.expense,
            matchedRule: ruleCopy
          });
          
          toast({
            title: "Rule Updated",
            description: "The rule has been updated and tested successfully",
          });
        } else {
          setTestResult(null);
          setError('The updated rule did not match the SMS');
        }
      }
      
      // Exit editing mode
      setEditingRuleId(null);
      setCreatingNewRule(false);
    } catch (error) {
      console.error('Error updating rule:', error);
      toast({
        title: "Error Updating Rule",
        description: "Failed to update the rule",
        variant: "destructive"
      });
    }
  };
  
  const handleCreateRule = async (newRule: SmsParserRule) => {
    try {
      // Create a deep copy of the new rule
      const ruleCopy = JSON.parse(JSON.stringify(newRule));
      
      // Add ID and timestamps
      const ruleWithId = {
        ...ruleCopy,
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModified: new Date().toISOString()
      };
      
      // Save the new rule
      await createSmsParserRule(ruleWithId);
      
      // Refresh rules list
      await loadRules();
      dbEvents.emit(DatabaseEvent.SMS_RULES_REFRESH);
      
      // Test with the new rule
      if (smsText && sender) {
        const result = await testSmsWithRules(
          smsText, 
          sender, 
          undefined, 
          undefined,
          [ruleWithId]
        );
        
        if (result.expense) {
          setTestResult({
            expense: result.expense,
            matchedRule: ruleWithId
          });
          
          toast({
            title: "Rule Created",
            description: "The new rule has been created and tested successfully",
          });
        } else {
          setTestResult(null);
          setError('The new rule did not match the SMS');
        }
      }
      
      // Exit creating mode
      setCreatingNewRule(false);
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: "Error Creating Rule",
        description: "Failed to create the rule",
        variant: "destructive"
      });
    }
  };
  
  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setCreatingNewRule(false);
  };
  
  const handleInitNewRule = () => {
    // Create default rule template
    const newRuleTemplate: SmsParserRule = {
      id: 'temp-new-rule',
      name: 'New Rule',
      enabled: true,
      senderMatch: sender ? [sender] : [],
      amountRegex: ['Rs\\.?\\s*(\\d+(?:[.,]\\d+)?)'],
      merchantConditions: [
  {
    startText: 'at\\s+',
    endTexts: ['\\s+', '\\s+on\\s+', '\\s+ref\\s+']
  }
],
      merchantCommonPatterns: [],
      paymentBank: 'Unknown',
      priority: 50,
      transactionType: 'expense',
      lastModified: new Date().toISOString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setEditingRuleId(null); // Ensure we're not in edit mode
    setCreatingNewRule(true);
    setTestResult({
      matchedRule: newRuleTemplate
    });
  };
  
  const handleSaveTransaction = async () => {
    if (!testResult?.expense) {
      toast({
        title: "No Transaction",
        description: "No transaction data to save",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSavingTransaction(true);
      
      const transaction = testResult.expense;
      
      // Save the transaction based on its type
      if (transaction.type === 'expense') {
        await addExpense(transaction as Expense);
        toast({
          title: "Expense Saved",
          description: `Expense of ${transaction.amount} saved successfully`,
        });
      } else if (transaction.type === 'income') {
        await addIncome(transaction as Income);
        toast({
          title: "Income Saved",
          description: `Income of ${transaction.amount} saved successfully`,
        });
      }
      
      // Notify that transaction list should refresh
      dbEvents.emit(DatabaseEvent.TRANSACTION_LIST_REFRESH);
      
      // Clear the result to prevent double-saves
      setTestResult(null);
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Error Saving Transaction",
        description: "Failed to save the transaction",
        variant: "destructive"
      });
    } finally {
      setIsSavingTransaction(false);
    }
  };

  // Real-time, case-insensitive SMS search/filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSmsMessages(smsMessages);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    // Filter by sender or message body, case-insensitive
    setFilteredSmsMessages(
      smsMessages.filter(
        (msg) =>
          (msg.address && msg.address.toLowerCase().includes(q)) ||
          (msg.body && msg.body.toLowerCase().includes(q))
      )
    );
  }, [searchQuery, smsMessages]);

  // Handler to auto-generate patterns from SMS
  const handleAutoGeneratePatterns = useCallback(() => {
    if (!smsText.trim()) return;
    const suggestions = suggestPatternsFromSms(smsText);
    setAutoGenPatterns(suggestions);
    setAutoGenTriggered(true);
  }, [smsText]);

  // When error is 'No expense could be extracted...' and not already triggered, auto-generate
  useEffect(() => {
    if (
      error === 'No expense could be extracted from this SMS with current rules' &&
      !autoGenTriggered &&
      smsText.trim()
    ) {
      handleAutoGeneratePatterns();
    }
  }, [error, autoGenTriggered, smsText, handleAutoGeneratePatterns]);

  // When autoGenPatterns is set, show InlineRuleEditor with those patterns pre-filled
  const getAutoGenRule = () => {
    if (!autoGenPatterns) return null;
    return {
      id: 'auto-gen-rule',
      name: 'Auto-Generated Rule',
      enabled: true,
      senderMatch: sender ? [sender] : [],
      amountRegex: autoGenPatterns.amountPatterns,
      merchantCondition: autoGenPatterns.merchantPatterns,
      merchantCommonPatterns: autoGenPatterns.merchantCleaningPatterns,
      paymentBank: 'Unknown',
      priority: 50,
      transactionType: 'expense' as 'expense',
      lastModified: new Date().toISOString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-xl">SMS Parser Tester</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sender">SMS Sender</Label>
              {isNative && (
                <Button 
                  onClick={handleOpenSmsSelectorModal} 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                >
                  <Smartphone className="h-4 w-4" />
                  Load from Device
                </Button>
              )}
            </div>
            <Textarea 
              id="sender" 
              placeholder="Enter the SMS sender (e.g. HDFC-Bank)" 
              value={sender} 
              onChange={e => setSender(e.target.value)} 
              className="resize-none" 
              rows={1} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sms">SMS Content</Label>
            <Textarea 
              id="sms" 
              placeholder="Paste SMS content here to test against your rules" 
              value={smsText} 
              onChange={e => setSmsText(e.target.value)} 
              className="resize-none" 
              rows={5} 
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleTest} 
              disabled={isTesting || !smsText.trim() || !sender.trim()} 
              className="flex-1"
            >
              {isTesting ? 'Testing...' : 'Test SMS Against Rules'}
            </Button>
            
            <Button
              onClick={handleInitNewRule}
              variant="outline"
              disabled={creatingNewRule}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Create New Rule
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-Generated Patterns Section */}
      {error === 'No expense could be extracted from this SMS with current rules' && autoGenPatterns && (
        <div className="my-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-medium text-destructive">No expense could be extracted from this SMS with current rules.</span>
            <Button type="button" variant="outline" size="sm" onClick={handleAutoGeneratePatterns}>
              Re-Generate Patterns
            </Button>
          </div>
          <InlineRuleEditor
            rule={getAutoGenRule()}
            onSave={handleCreateRule}
            onCancel={() => { setAutoGenPatterns(null); setAutoGenTriggered(false); }}
            smsText={smsText}
            smsSender={sender}
            showPreview={true}
            isNewRule={true}
          />
        </div>
      )}

      {/* Inline Rule Editor for Matched Rule */}
      {testResult?.matchedRule && (
        <div className="space-y-4">
          {creatingNewRule ? (
            <>
              <h3 className="text-lg font-medium">Create New Rule</h3>
              <InlineRuleEditor
                rule={testResult.matchedRule}
                onSave={handleCreateRule}
                onCancel={handleCancelEdit}
                smsText={smsText}
                smsSender={sender}
                showPreview={true}
              />
            </>
          ) : (
            <>
              {editingRuleId ? (
                // Show inline editor for the matched rule
                <InlineRuleEditor
                  rule={testResult.matchedRule}
                  onSave={handleRuleUpdated}
                  onCancel={handleCancelEdit}
                  smsText={smsText}
                  smsSender={sender}
                  showPreview={true}
                />
              ) : (
                // Show result with rule details
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg flex justify-between items-center">
                      <span>Match Result</span>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setEditingRuleId(testResult.matchedRule.id || null)}
                          variant="outline"
                          size="sm"
                          className="gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Rule
                        </Button>
                        <Button
                          onClick={handleSaveTransaction}
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={isSavingTransaction || !testResult.expense}
                        >
                          <Tag className="h-4 w-4" />
                          Save as Transaction
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="font-medium">Amount:</div>
                        <div className={`font-bold ${testResult.expense?.type === 'expense' ? 'text-destructive' : 'text-green-500'}`}>
                          {testResult.expense ? new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: testResult.expense.currency || 'INR',
                            maximumFractionDigits: 0
                          }).format(testResult.expense.amount) : 'N/A'}
                        </div>
                        
                        <div className="font-medium">Merchant:</div>
                        <div>{testResult.expense?.merchantName || 'Unknown'}</div>
                        
                        <div className="font-medium">Transaction Type:</div>
                        <div className="capitalize">{testResult.expense?.type || 'expense'}</div>
                        
                        <div className="font-medium">Rule Name:</div>
                        <div>{testResult.matchedRule?.name || 'Unknown Rule'}</div>
                        
                        <div className="font-medium">Bank:</div>
                        <div>{testResult.matchedRule?.paymentBank || 'Unknown'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
      
      {/* SMS message selector modal with search */}
      <Dialog open={isSmsSelectorOpen} onOpenChange={setIsSmsSelectorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Select SMS Message</DialogTitle>
          </DialogHeader>
          
          {/* Search input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search SMS by content or sender..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          
          {isLoadingSms ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <ScrollArea className="h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Sender</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[20%]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSmsMessages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        {searchQuery ? "No matching SMS messages found" : "No SMS messages found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSmsMessages.map((message, index) => (
                      <TableRow 
                        key={index} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSelectSms(message)}
                      >
                        <TableCell className="align-top font-medium">{message.address}</TableCell>
                        <TableCell className="align-top">
                          <div className="line-clamp-3">{message.body}</div>
                        </TableCell>
                        <TableCell className="align-top text-muted-foreground">
                          {new Date(parseInt(message.date)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmsParserRuleTester;