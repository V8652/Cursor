
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Button } from './button';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleCardProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  elevated?: boolean;
  hoverEffect?: boolean;
  glassmorphism?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function CollapsibleCard({
  title,
  description,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
  children,
  footer,
  icon,
  elevated = false,
  hoverEffect = true,
  glassmorphism = false,
  autoRefresh = false,
  refreshInterval = 5000
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [key, setKey] = useState(0); // For forcing re-render

  // Auto refresh logic
  React.useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(() => {
      setKey(prevKey => prevKey + 1);
    }, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval]);

  return (
    <Card 
      className={cn(
        'overflow-hidden transition-all duration-300 rounded-xl',
        elevated ? 'shadow-premium' : 'shadow-card border-0',
        hoverEffect && (elevated ? 'hover:shadow-premium-hover' : 'hover:shadow-card-hover'),
        glassmorphism && 'glass-card',
        className
      )}
    >
      <CardHeader 
        className={cn(
          'flex flex-row items-center justify-between space-y-0 gap-4 cursor-pointer group transition-colors',
          isOpen ? 'pb-3' : 'pb-6',
          headerClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div className="overflow-hidden">
            <CardTitle className="text-xl font-medium group-hover:text-primary transition-colors truncate">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-0.5 text-sm line-clamp-2">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full"
          onClick={e => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </Button>
      </CardHeader>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={key} // Force re-render when key changes
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <CardContent className={cn("px-0 py-0", contentClassName)}>
              {children}
            </CardContent>
            
            {footer && (
              <CardFooter className="flex justify-between pt-0">
                {footer}
              </CardFooter>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
