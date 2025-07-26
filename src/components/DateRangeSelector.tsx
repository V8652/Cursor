import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, startOfWeek, endOfWeek, endOfDay } from 'date-fns';
import { CalendarRange, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRange {
  from: Date;
  to?: Date;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type PresetRange = 'custom' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear' | 'all' | 'last7' | 'last30';

const defaultDateRange = { from: new Date(), to: new Date() };

const DateRangeSelector = ({ value, onChange, className }: DateRangeSelectorProps) => {
  // Defensive: ensure value and value.from are always defined
  const safeValue = value && value.from instanceof Date ? value : defaultDateRange;
  const safeFrom = safeValue.from instanceof Date && !isNaN(safeValue.from.getTime()) ? safeValue.from : new Date();
  const safeTo = safeValue.to instanceof Date && !isNaN(safeValue.to.getTime()) ? safeValue.to : undefined;
  const [date, setDate] = useState<DateRange>({
    from: safeFrom,
    to: safeTo,
  });
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('custom');
  
  const now = new Date();
  
  useEffect(() => {
    // Detect if current range matches any preset
    detectPreset();
  }, [value]);
  
  // Sync local date state with value prop
  useEffect(() => {
    const safeValue = value && value.from instanceof Date ? value : defaultDateRange;
    setDate({
      from: safeValue.from instanceof Date && !isNaN(safeValue.from.getTime()) ? safeValue.from : new Date(),
      to: safeValue.to instanceof Date && !isNaN(safeValue.to.getTime()) ? safeValue.to : undefined,
    });
  }, [value && value.from, value && value.to]);
  
  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
  const detectPreset = () => {
    if (!isValidDate(value.from) || !isValidDate(value.to)) {
      setSelectedPreset('custom');
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    // Check each preset
    if (
      format(value.from, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('today');
      return;
    }
    if (
      format(value.from, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('yesterday');
      return;
    }
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    if (
      format(value.from, 'yyyy-MM-dd') === format(thisWeekStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(thisWeekEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('thisWeek');
      return;
    }
    const lastWeekStart = startOfWeek(new Date(thisWeekStart.getTime() - 86400000), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(new Date(thisWeekStart.getTime() - 86400000), { weekStartsOn: 1 });
    if (
      format(value.from, 'yyyy-MM-dd') === format(lastWeekStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(lastWeekEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('lastWeek');
      return;
    }
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    if (
      format(value.from, 'yyyy-MM-dd') === format(thisMonthStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(thisMonthEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('thisMonth');
      return;
    }
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));
    if (
      format(value.from, 'yyyy-MM-dd') === format(lastMonthStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(lastMonthEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('lastMonth');
      return;
    }
    const thisYearStart = startOfYear(today);
    const thisYearEnd = endOfYear(today);
    if (
      format(value.from, 'yyyy-MM-dd') === format(thisYearStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(thisYearEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('thisYear');
      return;
    }
    const lastYearStart = startOfYear(subYears(today, 1));
    const lastYearEnd = endOfYear(subYears(today, 1));
    if (
      format(value.from, 'yyyy-MM-dd') === format(lastYearStart, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(lastYearEnd, 'yyyy-MM-dd')
    ) {
      setSelectedPreset('lastYear');
      return;
    }
    // If no preset matches
    setSelectedPreset('custom');
  };
  
  const handlePresetChange = (preset: PresetRange) => {
    setSelectedPreset(preset);
    let newRange: DateRange;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (preset) {
      case 'today':
        newRange = { from: today, to: today };
        break;
        
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        newRange = { from: yesterday, to: yesterday };
        break;
        
      case 'thisWeek':
        newRange = {
          from: startOfWeek(today, { weekStartsOn: 1 }),
          to: endOfWeek(today, { weekStartsOn: 1 }),
        };
        break;
        
      case 'lastWeek':
        const lastWeekStart = startOfWeek(new Date(today.getTime() - 7 * 86400000), { weekStartsOn: 1 });
        newRange = {
          from: lastWeekStart,
          to: endOfWeek(lastWeekStart, { weekStartsOn: 1 }),
        };
        break;
        
      case 'thisMonth':
        newRange = {
          from: startOfMonth(today),
          to: endOfMonth(today),
        };
        break;
        
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        newRange = {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
        break;
        
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        newRange = {
          from: quarterStart,
          to: quarterEnd,
        };
        break;
        
      case 'lastQuarter':
        const prevQuarter = Math.floor(subMonths(today, 3).getMonth() / 3);
        const prevQuarterStart = new Date(today.getFullYear(), prevQuarter * 3, 1);
        const prevQuarterEnd = new Date(today.getFullYear(), prevQuarter * 3 + 3, 0);
        newRange = {
          from: prevQuarterStart,
          to: prevQuarterEnd,
        };
        break;
        
      case 'thisYear':
        newRange = {
          from: startOfYear(today),
          to: endOfYear(today),
        };
        break;
        
      case 'lastYear':
        const lastYear = subYears(today, 1);
        newRange = {
          from: startOfYear(lastYear),
          to: endOfYear(lastYear),
        };
        break;
        
      case 'all':
        // Go back 10 years as a reasonable "all time" default
        newRange = {
          from: new Date(today.getFullYear() - 10, 0, 1),
          to: today,
        };
        break;
        
      case 'last7':
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        newRange = {
          from: last7Days,
          to: today,
        };
        break;
        
      case 'last30':
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        newRange = {
          from: last30Days,
          to: today,
        };
        break;
        
      case 'custom':
      default:
        // Keep current selection for custom
        newRange = { ...value };
    }
    
    setDate(newRange);
    // Ensure 'to' is end of day
    const adjustedRange = { ...newRange, to: newRange.to ? endOfDay(newRange.to) : undefined };
    onChange(adjustedRange);
  };
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    setSelectedPreset('custom');
    
    const newRange = { ...date };
    
    if (!date.from || date.to) {
      // Start a new range
      newRange.from = selectedDate;
      newRange.to = selectedDate;
    } else if (selectedDate < date.from) {
      // Selected date is before current start
      newRange.from = selectedDate;
      newRange.to = date.from;
    } else {
      // Selected date is after current start
      newRange.to = selectedDate;
    }
    
    setDate(newRange);
  };
  
  const handleCalendarClose = () => {
    if (date.from && date.to) {
      // Ensure 'to' is end of day
      onChange({ ...date, to: endOfDay(date.to) });
    }
    setIsCalendarOpen(false);
  };

  return (
    <div className={cn("flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2", className)}>
      <Select value={selectedPreset} onValueChange={(value) => handlePresetChange(value as PresetRange)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Custom Range</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="last7">Last 7 Days</SelectItem>
          <SelectItem value="last30">Last 30 Days</SelectItem>
          <SelectItem value="thisWeek">This Week</SelectItem>
          <SelectItem value="lastWeek">Last Week</SelectItem>
          <SelectItem value="thisMonth">This Month</SelectItem>
          <SelectItem value="lastMonth">Last Month</SelectItem>
          <SelectItem value="thisQuarter">This Quarter</SelectItem>
          <SelectItem value="lastQuarter">Last Quarter</SelectItem>
          <SelectItem value="thisYear">This Year</SelectItem>
          <SelectItem value="lastYear">Last Year</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
      
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[300px]",
              className
            )}
          >
            <CalendarRange className="mr-2 h-4 w-4" />
            {date.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border bg-background" align="start">
          <div className="p-3 flex justify-between border-b bg-accent/10 rounded-t-xl">
            <div className="text-sm font-medium">
              {date.from && format(date.from, "MMMM yyyy")}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-sm px-2"
                onClick={() => {
                  // Ensure 'to' is end of day
                  onChange({ ...date, to: date.to ? endOfDay(date.to) : undefined });
                  setIsCalendarOpen(false);
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                Apply
              </Button>
            </div>
          </div>
          <Calendar
            mode="range"
            selected={date}
            onSelect={(range) => {
              setDate(range as DateRange);
            }}
            className="rounded-xl border p-2 pointer-events-auto shadow-md transition-all duration-200"
            modifiers={{
              selected: (day) => {
                return date.from && date.to && day >= date.from && day <= date.to;
              },
            }}
            modifiersStyles={{
              selected: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 0 0 2px hsl(var(--primary)/0.2)'
              },
              range_start: {
                borderRadius: '0.5rem',
                backgroundColor: 'hsl(var(--primary))',
                color: 'white',
                boxShadow: '0 0 0 2px hsl(var(--primary)/0.2)'
              },
              range_end: {
                borderRadius: '0.5rem',
                backgroundColor: 'hsl(var(--primary))',
                color: 'white',
                boxShadow: '0 0 0 2px hsl(var(--primary)/0.2)'
              },
              range_middle: {
                backgroundColor: 'hsl(var(--primary)/0.1)'
              }
            }}
            numberOfMonths={1}
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "hidden",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 focus:ring-2 focus:ring-primary/50 transition"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
              row: "flex w-full mt-2 justify-center",
              cell: "h-9 w-9 flex items-center justify-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent/50 hover:bg-accent/20 focus:bg-accent/30 transition",
              day: cn(
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 focus:bg-primary/20 transition"
              ),
              day_today: "bg-accent/20 text-accent-foreground border border-primary/30",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent/50 [&:not([aria-selected])]:bg-accent/50",
              day_hidden: "invisible",
              day_range_start: "aria-selected:bg-primary aria-selected:text-primary-foreground [&:not([aria-selected])]:bg-primary [&:not([aria-selected])]:text-primary-foreground rounded-l-md",
              day_range_end: "aria-selected:bg-primary aria-selected:text-primary-foreground [&:not([aria-selected])]:bg-primary [&:not([aria-selected])]:text-primary-foreground rounded-r-md",
              caption_dropdowns: "flex gap-2 mb-2 w-full justify-center items-center",
              dropdown: "rounded-md border px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition w-full max-w-[120px]",
              dropdown_month: "mr-2",
              dropdown_year: "ml-2",
            }}
            captionLayout="dropdown"
          />
          {/* Range summary and clear button */}
          <div className="flex flex-row items-center justify-center gap-2 mt-2 w-full">
            <div className="text-xs text-muted-foreground text-center">
              {date.from && date.to ? (
                <>Selected: <span className="font-medium">{format(date.from, 'LLL dd, y')}</span> - <span className="font-medium">{format(date.to, 'LLL dd, y')}</span></>
              ) : date.from ? (
                <>Selected: <span className="font-medium">{format(date.from, 'LLL dd, y')}</span></>
              ) : (
                <>No range selected</>
              )}
            </div>
            {(date.from || date.to) && (
              <Button size="sm" variant="ghost" className="text-xs px-2 py-1 rounded hover:bg-accent/30 transition" onClick={() => { setDate({ from: undefined, to: undefined } as any); onChange({ from: undefined, to: undefined } as any); }}>
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeSelector;