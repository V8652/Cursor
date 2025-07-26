import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Check, X, Save, RefreshCcw, GripVertical } from 'lucide-react';
import { SmsParserRule } from '@/types/sms-parser';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EditablePatternList from '@/components/parser/EditablePatternList';
import { testSmsWithRules } from '@/lib/sms-transaction-processor';
import { motion } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface InlineRuleEditorProps {
  rule: SmsParserRule;
  onSave: (updatedRule: SmsParserRule) => void;
  onCancel: () => void;
  smsText?: string;
  smsSender?: string;
  showPreview?: boolean;
  isNewRule?: boolean;
}

const SortableMerchantExtraction = ({ extraction, index, onUpdate, onDelete }: { 
  extraction: { startText?: string; endText?: string; startIndex?: number }; 
  index: number;
  onUpdate: (index: number, field: string, value: string | number) => void;
  onDelete: (index: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-1 items-center mb-1">
      <Button
        variant="ghost"
        size="icon"
        className="cursor-grab p-0 w-6 h-6 min-w-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      <Input
        placeholder="Start Text"
        value={extraction.startText || ''}
        onChange={e => onUpdate(index, 'startText', e.target.value)}
        className="flex-1"
      />
      <Input
        placeholder="End Text"
        value={extraction.endText || ''}
        onChange={e => onUpdate(index, 'endText', e.target.value)}
        className="flex-1"
      />
      <Input
        placeholder="Start Index"
        type="number"
        min={1}
        value={extraction.startIndex ?? 1}
        onChange={e => onUpdate(index, 'startIndex', parseInt(e.target.value, 10) || 1)}
        className="w-24"
      />
      <Button
        type="button"
        variant="ghost"
        onClick={() => onDelete(index)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const InlineRuleEditor: React.FC<InlineRuleEditorProps> = ({
  rule,
  onSave,
  onCancel,
  smsText,
  smsSender,
  showPreview = false,
  isNewRule = false
}) => {
  // Create a deep copy of the rule for local state
  const [editedRule, setEditedRule] = useState<SmsParserRule>(() => {
    let ruleCopy = JSON.parse(JSON.stringify(rule));
    // If merchantExtractions is missing but flat fields are present, populate it
    if (!ruleCopy.merchantExtractions || ruleCopy.merchantExtractions.length === 0) {
      if (ruleCopy.merchantStartText || ruleCopy.merchantEndText || ruleCopy.merchantStartIndex) {
        ruleCopy.merchantExtractions = [{
          startText: ruleCopy.merchantStartText || '',
          endText: ruleCopy.merchantEndText || '',
          startIndex: ruleCopy.merchantStartIndex || 1
        }];
      } else {
        ruleCopy.merchantExtractions = [{ startText: '', endText: '', startIndex: 1 }];
      }
    }
    return ruleCopy;
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewTimeout, setPreviewTimeout] = useState<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle simple field changes
  const handleChange = (fieldName: keyof SmsParserRule, value: any) => {
    setEditedRule(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle array type fields
  const handleArrayFieldChange = (fieldName: keyof SmsParserRule, values: string[]) => {
    setEditedRule(prev => ({
      ...prev,
      [fieldName]: values
    }));
  };

  // Preview extraction logic with debounce
  useEffect(() => {
    if (showPreview && smsText && smsSender) {
      // Clear previous timeout
      if (previewTimeout) {
        clearTimeout(previewTimeout);
      }
      
      // Set new timeout to delay execution
      const timeout = setTimeout(() => {
        previewExtraction();
      }, 500);
      
      setPreviewTimeout(timeout);
      
      // Cleanup on unmount
      return () => {
        if (previewTimeout) clearTimeout(previewTimeout);
      };
    }
  }, [editedRule, showPreview, smsText, smsSender]);

  const previewExtraction = async () => {
    if (!smsText || !smsSender) return;
    
    setIsProcessing(true);
    
    try {
      console.log('Running preview extraction with edited rule');
      
      // Create a temporary rule for testing with the latest edited state
      const tempRule: SmsParserRule = {
        ...editedRule,
        id: editedRule.id || 'temp-preview-rule',
        lastModified: new Date().toISOString(),
        updatedAt: Date.now(),
        createdAt: editedRule.createdAt || Date.now()
      };
      
      // Use the testSmsWithRules function which has been updated to use case-insensitive
      // matching for merchant patterns and to properly apply skip conditions
      const result = await testSmsWithRules(
        smsText,
        smsSender,
        undefined, // No fromDate needed
        undefined, // No toDate needed
        [tempRule]  // This is the custom rules parameter
      );
      
      if (result && result.expense) {
        setPreviewResult({
          success: true,
          amount: result.expense.amount,
          merchantName: result.expense.merchantName,
          date: result.expense.date,
          transactionType: result.expense.type || 'expense'
        });
      } else {
        setPreviewResult({
          success: false,
          error: 'No match found'
        });
      }
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewResult({
        success: false,
        error: 'Error in preview: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Force refresh the preview - using current unsaved edited rule
  const forceRefreshPreview = () => {
    if (previewTimeout) clearTimeout(previewTimeout);
    // Immediately run the preview extraction with current unsaved edits
    previewExtraction();
  };

  // Validate rule before saving
  const validateRule = (): boolean => {
    if (!editedRule.name.trim()) {
      setValidationError('Rule name is required');
      return false;
    }
    
    if (!editedRule.paymentBank.trim()) {
      setValidationError('Payment bank is required');
      return false;
    }
    
    // Check if sender match is empty
    if (!editedRule.senderMatch || 
        (Array.isArray(editedRule.senderMatch) && editedRule.senderMatch.length === 0) ||
        (typeof editedRule.senderMatch === 'string' && !editedRule.senderMatch.trim())) {
      setValidationError('At least one sender pattern is required');
      return false;
    }
    
    // Validate regex patterns
    try {
      const amountRegexArray = Array.isArray(editedRule.amountRegex) 
        ? editedRule.amountRegex 
        : [editedRule.amountRegex];
      
      for (const pattern of amountRegexArray) {
        if (pattern) new RegExp(pattern);
      }
    } catch (e) {
      setValidationError('Invalid amount regex pattern');
      return false;
    }
    
    setValidationError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateRule()) return;
    
    const updatedRule: SmsParserRule = {
      ...editedRule,
      lastModified: new Date().toISOString(),
      updatedAt: Date.now()
    };
    
    if (editedRule.merchantExtractions && editedRule.merchantExtractions.length > 0) {
      const first = editedRule.merchantExtractions[0];
      updatedRule.merchantStartText = first.startText || '';
      updatedRule.merchantEndText = first.endText || '';
      updatedRule.merchantStartIndex = first.startIndex || 1;
    }
    
    onSave(updatedRule);
  };

  // Format amount for display based on transaction type
  const formatAmount = (amount: number, transactionType: 'expense' | 'income' = 'expense') => {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
    
    return transactionType === 'expense' ? `-${formattedAmount}` : formattedAmount;
  };

  const handleMerchantExtractionsChange = (extractions: { startText?: string; endText?: string; startIndex?: number }[]) => {
    setEditedRule(prev => ({
      ...prev,
      merchantExtractions: extractions
    }));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setEditedRule(prev => ({
        ...prev,
        merchantExtractions: arrayMove(
          prev.merchantExtractions || [],
          active.id,
          over.id
        )
      }));
    }
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader className="bg-muted/30 pb-4 pt-4">
        <CardTitle className="text-lg flex justify-between items-center">
          <Input 
            value={editedRule.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
            className="font-semibold"
            placeholder="Rule Name"
          />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4 px-5">
        {validationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enabled</Label>
              <Switch 
                id="enabled"
                checked={editedRule.enabled} 
                onCheckedChange={(checked) => handleChange('enabled', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentBank">Payment Bank</Label>
              <Input 
                id="paymentBank"
                value={editedRule.paymentBank} 
                onChange={(e) => handleChange('paymentBank', e.target.value)}
                placeholder="Bank name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input 
                id="priority"
                type="number" 
                min="1" 
                max="100"
                value={editedRule.priority} 
                onChange={(e) => handleChange('priority', parseInt(e.target.value, 10) || 1)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="typeExpense" 
                    checked={editedRule.transactionType !== 'income'} 
                    onChange={() => handleChange('transactionType', 'expense')}
                    className="rounded-full w-4 h-4"
                  />
                  <label htmlFor="typeExpense">Expense</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="typeIncome" 
                    checked={editedRule.transactionType === 'income'} 
                    onChange={() => handleChange('transactionType', 'income')}
                    className="rounded-full w-4 h-4"
                  />
                  <label htmlFor="typeIncome">Income</label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sender Match</Label>
              <EditablePatternList
                patterns={Array.isArray(editedRule.senderMatch) ? editedRule.senderMatch : [editedRule.senderMatch]}
                type="sender"
                onChange={(patterns) => handleArrayFieldChange('senderMatch', patterns)}
                placeholder="Add sender pattern"
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-md font-medium">Extraction Patterns</h3>
          
          <div className="space-y-2">
            <Label>Amount Regex</Label>
            <EditablePatternList
              patterns={Array.isArray(editedRule.amountRegex) ? editedRule.amountRegex : [editedRule.amountRegex]}
              type="regex"
              onChange={(patterns) => handleArrayFieldChange('amountRegex', patterns)}
              placeholder="Add amount regex pattern"
            />
          </div>
          <div className="space-y-2">
            <Label>Merchant Extractions</Label>
            {Array.isArray(editedRule.merchantExtractions) && editedRule.merchantExtractions.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={editedRule.merchantExtractions.map((_, index) => index)}
                  strategy={verticalListSortingStrategy}
                >
                  {editedRule.merchantExtractions.map((extraction, idx) => (
                    <SortableMerchantExtraction
                      key={idx}
                      extraction={extraction}
                      index={idx}
                      onUpdate={(index, field, value) => {
                        const updated = [...editedRule.merchantExtractions!];
                        updated[index] = { ...updated[index], [field]: value };
                        handleMerchantExtractionsChange(updated);
                      }}
                      onDelete={(index) => {
                        const updated = [...editedRule.merchantExtractions!];
                        updated.splice(index, 1);
                        handleMerchantExtractionsChange(updated);
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-muted-foreground text-xs">No merchant extraction patterns defined.</div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleMerchantExtractionsChange([...(editedRule.merchantExtractions || []), { startText: '', endText: '', startIndex: 1 }])}
            >
              Add Extraction
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Merchant Cleaning Patterns</Label>
            <EditablePatternList
              patterns={Array.isArray(editedRule.merchantCommonPatterns) ? editedRule.merchantCommonPatterns : (editedRule.merchantCommonPatterns ? [editedRule.merchantCommonPatterns] : [])}
              type="regex"
              onChange={(patterns) => handleArrayFieldChange('merchantCommonPatterns', patterns)}
              placeholder="Add merchant cleaning pattern"
            />
          </div>
          <div className="space-y-2">
            <Label>Skip Conditions</Label>
            <EditablePatternList
              patterns={Array.isArray(editedRule.skipCondition) ? editedRule.skipCondition : (editedRule.skipCondition ? [editedRule.skipCondition] : [])}
              type="skip"
              onChange={(patterns) => handleArrayFieldChange('skipCondition', patterns)}
              placeholder="Add skip condition pattern"
            />
          </div>
        </div>
        
        {showPreview && (
          <div className="mt-4 p-3 border rounded-md bg-muted/20">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Live Preview</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={forceRefreshPreview} 
                disabled={isProcessing}
                className="h-7 px-2"
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            
            {isProcessing ? (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                <span className="ml-2 text-sm">Processing...</span>
              </div>
            ) : previewResult ? (
              previewResult.success ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Amount:</div>
                  <div className={`font-medium ${previewResult.transactionType === 'expense' ? 'text-destructive' : 'text-green-500'}`}>
                    {formatAmount(previewResult.amount, previewResult.transactionType)}
                  </div>
                  <div>Merchant:</div>
                  <div className="font-medium">{previewResult.merchantName}</div>
                  <div>Type:</div>
                  <div className="font-medium capitalize">{previewResult.transactionType || 'expense'}</div>
                </div>
              ) : (
                <p className="text-destructive text-sm">{previewResult.error}</p>
              )
            ) : (
              <p className="text-muted-foreground text-sm italic">
                {smsText ? "Edit patterns to see extraction results" : "No SMS text available for preview"}
              </p>
            )}
          </div>
        )}
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            {isNewRule ? 'Create Rule' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InlineRuleEditor;
