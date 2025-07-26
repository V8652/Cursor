import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expense, Transaction } from '@/types';
import { SmsParserRule } from '@/types/sms-parser';
import { Edit } from 'lucide-react';
import { updateSmsParserRule } from '@/lib/sms-parser-rules';
import { toast } from '@/hooks/use-toast';
import InlineRuleEditor from './InlineRuleEditor';

interface RuleMatchDetailsProps {
  expense: Transaction | Expense;
  details?: SmsParserRule;
  matchedRuleId?: string;
  smsText?: string;
  smsSender?: string;
  onRuleUpdated?: () => void;
}

const RuleMatchDetails: React.FC<RuleMatchDetailsProps> = ({ 
  expense, 
  details, 
  matchedRuleId,
  smsText,
  smsSender,
  onRuleUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleEditRule = () => {
    setIsEditing(true);
  };
  
  const handleSaveRule = async (updatedRule: SmsParserRule) => {
    try {
      setIsSaving(true);
      // Create a deep copy of the updated rule
      const ruleCopy = JSON.parse(JSON.stringify(updatedRule));
      await updateSmsParserRule(ruleCopy);
      
      toast({
        title: "Rule Updated",
        description: "Parser rule has been updated successfully",
      });
      
      setIsEditing(false);
      
      // Notify parent component that rule was updated
      if (onRuleUpdated) {
        onRuleUpdated();
      }
    } catch (error) {
      console.error('Error updating rule:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update parser rule",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  
  // Format amount for display based on transaction type
  const formatAmount = (amount: number, type: 'expense' | 'income' = 'expense') => {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
    
    return type === 'expense' ? `-${formattedAmount}` : formattedAmount;
  };
  
  if (isEditing && details) {
    return (
      <InlineRuleEditor
        rule={details}
        onSave={handleSaveRule}
        onCancel={handleCancelEdit}
        smsText={smsText}
        smsSender={smsSender}
        showPreview={true}
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Match Result</span>
          {details && (
            <Button 
              onClick={handleEditRule} 
              variant="outline" 
              size="sm"
              disabled={isSaving}
              className="gap-1"
            >
              <Edit className="h-4 w-4" />
              Edit Rule
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="font-medium">Amount:</div>
            <div className={`font-bold ${expense.type === 'expense' ? 'text-destructive' : 'text-green-500'}`}>
              {formatAmount(expense.amount, expense.type)}
            </div>
            
            <div className="font-medium">Merchant:</div>
            <div>{expense.merchantName}</div>
            
            <div className="font-medium">Transaction Type:</div>
            <div className="capitalize">{expense.type || 'expense'}</div>
            
            {details && (
              <>
                <div className="font-medium">Rule Name:</div>
                <div>{details.name}</div>
                
                <div className="font-medium">Bank:</div>
                <div>{details.paymentBank}</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RuleMatchDetails;
