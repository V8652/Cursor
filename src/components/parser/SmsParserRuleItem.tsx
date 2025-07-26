
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SmsParserRule } from '@/types/sms-parser';
import { Pencil, Trash2, Copy } from 'lucide-react';
import { toggleSmsParserRuleEnabled } from '@/lib/sms-parser-rules';
import { toast } from '@/hooks/use-toast';

interface SmsParserRuleItemProps {
  rule: SmsParserRule;
  onEdit: (rule: SmsParserRule) => void;
  onDelete: (id: string) => void;
  onDuplicate: (rule: SmsParserRule) => void;
}

const SmsParserRuleItem: React.FC<SmsParserRuleItemProps> = ({
  rule,
  onEdit,
  onDelete,
  onDuplicate
}) => {
  const handleToggle = async (checked: boolean) => {
    try {
      await toggleSmsParserRuleEnabled(rule.id, checked);
      toast({
        title: checked ? 'Rule Enabled' : 'Rule Disabled',
        description: `Rule "${rule.name}" has been ${checked ? 'enabled' : 'disabled'}.`
      });
    } catch (error) {
      console.error('Error toggling rule enabled state:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rule status',
        variant: 'destructive'
      });
    }
  };

  return <div className="grid grid-cols-12 items-center gap-1 bg-card rounded-lg border shadow-sm px-0 py-[5px]">
      <div className="col-span-1">
        <Switch checked={rule.enabled} onCheckedChange={handleToggle} aria-label={`${rule.enabled ? 'Disable' : 'Enable'} rule`} />
      </div>
      <div className="col-span-7">
        <div className="flex flex-col mx-[30px] px-0 py-0 my-0">
          <span className="font-medium truncate">{rule.name}</span>
          <span className="text-xs text-muted-foreground truncate">
            {rule.paymentBank}
          </span>
        </div>
      </div>
      <div className="col-span-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onDuplicate(rule)} 
          aria-label="Duplicate rule"
          title="Duplicate rule"
          className="hover:bg-muted rounded"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="col-span-3 flex justify-end gap-2 mx-[6px]">
        <Button variant="ghost" size="icon" onClick={() => onEdit(rule)} aria-label="Edit rule">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(rule.id)} aria-label="Delete rule">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>;
};

export default SmsParserRuleItem;
