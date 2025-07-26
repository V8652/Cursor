import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SmsParserRule, SmsParserRuleFormData } from '@/types/sms-parser';
import InlineRuleEditor from './InlineRuleEditor';

interface SmsParserRuleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: SmsParserRuleFormData) => void;
  initialRule?: SmsParserRule;
}

const SmsParserRuleForm: React.FC<SmsParserRuleFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRule
}) => {
  const handleSave = (updatedRule: SmsParserRule) => {
    onSave(updatedRule);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl px-1">
        <DialogHeader>
          <DialogTitle>
            {initialRule ? 'Edit Parser Rule' : 'Create New Parser Rule'}
          </DialogTitle>
          <DialogDescription>
            {initialRule 
              ? 'Modify the existing SMS parser rule to change how it extracts information from messages.'
              : 'Create a new SMS parser rule to extract transaction information from your messages.'}
          </DialogDescription>
        </DialogHeader>
        
        <InlineRuleEditor
          rule={initialRule || {
            id: '',
            name: '',
            enabled: true,
            senderMatch: [],
            amountRegex: [],
            merchantCondition: [],
            merchantCommonPatterns: [],
            paymentBank: '',
            priority: 50,
            transactionType: 'expense',
            lastModified: new Date().toISOString(),
            createdAt: Date.now(),
            updatedAt: Date.now()
          }}
          onSave={handleSave}
          onCancel={onClose}
          showPreview={false}
          isNewRule={!initialRule}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SmsParserRuleForm;
