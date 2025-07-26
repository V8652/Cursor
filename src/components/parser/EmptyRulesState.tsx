
import { Button } from '@/components/ui/button';
import { Mail, PlusCircle, MessageCircle } from 'lucide-react';

interface EmptyRulesStateProps {
  onCreateRule: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
  isEmailParser?: boolean;
}

const EmptyRulesState = ({ 
  onCreateRule, 
  title = "No Parser Rules Yet", 
  description = "Parser rules help identify expenses in your emails. Create your first rule to start scanning emails for expenses.", 
  buttonText = "Create Your First Rule",
  isEmailParser = true
}: EmptyRulesStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
      <div className="bg-primary/10 rounded-full p-6">
        {isEmailParser ? (
          <Mail className="h-12 w-12 text-primary" />
        ) : (
          <MessageCircle className="h-12 w-12 text-primary" />
        )}
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-muted-foreground">
          {description}
        </p>
      </div>
      <Button onClick={onCreateRule} size="lg" className="gap-2">
        <PlusCircle className="h-5 w-5" />
        {buttonText}
      </Button>
    </div>
  );
};

export default EmptyRulesState;
