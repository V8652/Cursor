
import { useState } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import * as Icons from 'lucide-react';
import { categoryIconMap, CategoryIconName, getAllCategoryIcons } from '@/lib/category-icons';
import { ScrollArea } from './ui/scroll-area';

interface CategoryIconSelectorProps {
  value: CategoryIconName;
  onChange: (value: CategoryIconName) => void;
}

export default function CategoryIconSelector({ value, onChange }: CategoryIconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const icons = getAllCategoryIcons();
  
  // Ensure we have a valid icon
  const safeIconName = value && value in categoryIconMap ? value : 'DollarSign';
  const SelectedIcon = categoryIconMap[safeIconName];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="h-10 w-10"
          onClick={() => setIsOpen(true)}
        >
          <SelectedIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <ScrollArea className="h-80 px-1">
          <div className="grid grid-cols-5 gap-2">
            {icons.map((iconName) => {
              const Icon = categoryIconMap[iconName];
              return (
                <Button
                  key={iconName}
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 ${value === iconName ? 'bg-primary/20' : ''}`}
                  onClick={() => {
                    onChange(iconName);
                    setIsOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
