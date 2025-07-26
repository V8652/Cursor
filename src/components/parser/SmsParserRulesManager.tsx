
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlusCircle, Search, AlertCircle } from 'lucide-react';
import { getSmsParserRules, addSmsParserRule, updateSmsParserRule, deleteSmsParserRule } from '@/lib/sms-parser-rules';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { SmsParserRule, SmsParserRuleFormData } from '@/types/sms-parser';
import SmsParserRuleItem from './SmsParserRuleItem';
import EmptyRulesState from './EmptyRulesState';
import SmsParserRuleForm from './SmsParserRuleForm';
import SmsParserRulesImportExport from './SmsParserRulesImportExport';
import SmsParserRuleTester from './SmsParserRuleTester';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const SmsParserRulesManager = () => {
  const [rules, setRules] = useState<SmsParserRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SmsParserRule | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('rules');

  const loadRules = async () => {
    try {
      setLoading(true);
      const loadedRules = await getSmsParserRules();
      setRules(loadedRules);
    } catch (error) {
      console.error('Error loading SMS parser rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SMS parser rules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
    const handleDbEvent = () => loadRules();
    const unsubscribe = dbEvents.subscribe(DatabaseEvent.SMS_RULES_REFRESH, handleDbEvent);
    return () => unsubscribe();
  }, []);

  const handleCreateRule = () => {
    setEditingRule(undefined);
    setIsFormOpen(true);
  };

  const handleEditRule = (rule: SmsParserRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    if (!id) return;
    setDeleteRuleId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDuplicateRule = async (rule: SmsParserRule) => {
    try {
      // Create a duplicate rule with slight modifications
      const duplicatedRuleData: SmsParserRuleFormData = {
        name: `${rule.name} (Copy)`,
        enabled: rule.enabled,
        senderMatch: rule.senderMatch,
        amountRegex: rule.amountRegex,
        merchantCondition: rule.merchantCondition,
        merchantCommonPatterns: rule.merchantCommonPatterns,
        paymentBank: rule.paymentBank,
        skipCondition: rule.skipCondition,
        priority: rule.priority,
        pattern: rule.pattern,
        merchantNameRegex: rule.merchantNameRegex,
        transactionType: rule.transactionType,
      };

      // Add the duplicated rule
      const newRule = await addSmsParserRule(duplicatedRuleData);
      setRules(prevRules => [...prevRules, newRule]);
      
      toast({
        title: 'Rule Duplicated',
        description: `A copy of "${rule.name}" has been created successfully.`
      });
    } catch (error) {
      console.error('Error duplicating rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate the rule',
        variant: 'destructive'
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteRuleId) return;
    
    try {
      await deleteSmsParserRule(deleteRuleId);
      setRules(prevRules => prevRules.filter(r => r.id !== deleteRuleId));
      toast({
        title: 'Rule Deleted',
        description: 'The parser rule has been successfully deleted'
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the parser rule',
        variant: 'destructive'
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteRuleId(null);
    }
  };

  const handleSaveRule = async (formData: SmsParserRuleFormData) => {
    try {
      if (editingRule?.id) {
        const updatedRule = await updateSmsParserRule({
          ...editingRule,
          ...formData
        } as SmsParserRule);
        
        setRules(prevRules => prevRules.map(r => r.id === updatedRule.id ? updatedRule : r));
        
        toast({
          title: 'Rule Updated',
          description: 'Parser rule has been updated successfully'
        });
      } else {
        const newRule = await addSmsParserRule(formData);
        setRules(prevRules => [...prevRules, newRule]);
        
        toast({
          title: 'Rule Created',
          description: 'New parser rule has been created successfully'
        });
      }
      
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save the parser rule',
        variant: 'destructive'
      });
    }
  };

  const filteredRules = rules.filter(rule => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return rule.name && rule.name.toLowerCase().includes(search) || rule.paymentBank && rule.paymentBank.toLowerCase().includes(search);
  });

  const sortedRules = [...filteredRules].sort((a, b) => {
    if (a.enabled !== b.enabled) {
      return a.enabled ? -1 : 1;
    }
    
    if (a.priority !== b.priority) {
      return (b.priority || 0) - (a.priority || 0); // Higher priority first
    }
    
    return a.name && b.name ? a.name.localeCompare(b.name) : 0;
  });

  const handleDataChanged = () => {
    loadRules();
  };

  return <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
          <Button onClick={handleCreateRule} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
        <p className="text-muted-foreground mx-[15px]">
          Configure rules to extract expenses from SMS messages
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="tester">Rule Tester</TabsTrigger>
          <TabsTrigger value="import-export">Import/Export</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules" className="space-y-4">
          {rules.length > 0 && <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center mb-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search rules..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground ml-auto mr-4 mx-[15px]">
                Duplicate a rule to create a similar one
              </p>
            </div>}

          {loading ? <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="bg-muted/30 rounded-lg h-20 animate-pulse" />)}
            </div> : rules.length === 0 ? <EmptyRulesState onCreateRule={handleCreateRule} title="No SMS Parser Rules Yet" description="SMS Parser rules help identify expenses in your messages. Create your first rule to start scanning SMS messages for expenses." buttonText="Create Your First Rule" /> : filteredRules.length === 0 ? <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No rules match your search term "{searchTerm}"
              </AlertDescription>
            </Alert> : <div className="space-y-2">
              <div className="grid grid-cols-12 text-sm font-medium text-muted-foreground px-4 py-2 border-b">
                <div className="col-span-1">Status</div>
                <div className="col-span-7 mx-[53px]">Name</div>
                <div className="col-span-1">Duplicate</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>
              {sortedRules.map(rule => <SmsParserRuleItem 
                key={rule.id} 
                rule={rule} 
                onEdit={handleEditRule} 
                onDelete={handleDeleteRule}
                onDuplicate={handleDuplicateRule} 
              />)}
            </div>}
        </TabsContent>
        
        <TabsContent value="tester">
          <SmsParserRuleTester />
        </TabsContent>

        <TabsContent value="import-export">
          <SmsParserRulesImportExport onDataChanged={handleDataChanged} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this SMS parser rule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SmsParserRuleForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveRule} initialRule={editingRule} />
    </div>;
};

export default SmsParserRulesManager;
