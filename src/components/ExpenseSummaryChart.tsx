import { useMemo, useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getUserCategories } from '@/lib/db';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { getCategoryColor, getCategoryIconName, getCategoryLabel, DEFAULT_CATEGORY_COLORS, COLORBLIND_PALETTE, exportChartDataAsCSV } from '@/lib/utils/chartUtils';
import { categoryIconMap, CategoryIconName } from '@/lib/category-icons';
import { Tooltip as UiTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import html2canvas from 'html2canvas'; // TODO: Ensure this is installed in your project
import { forceDownloadCSV } from '@/lib/csv-utils';

// Remove broken imports and define minimal local types
// type Expense, Income, and CategorySummary are defined here for local use

type Expense = {
  amount: number;
  category: string;
  // add other fields as needed
};

type Income = {
  amount: number;
  category: string;
  // add other fields as needed
};

type CategorySummary = {
  category: string;
  total: number;
  count: number;
  color: string;
};

interface ExpenseSummaryChartProps {
  expenses: Expense[];
  incomes?: Income[];
  chartType?: 'pie' | 'bar';
  currency?: string;
}

const ExpenseSummaryChart = ({
  expenses,
  incomes = [],
  chartType: initialChartType = 'pie',
  currency
}: ExpenseSummaryChartProps) => {
  const [customCategoryColors, setCustomCategoryColors] = useState<Record<string, string>>({});
  const [customCategoryIcons, setCustomCategoryIcons] = useState<Record<string, CategoryIconName>>({});
  const [animateKey, setAnimateKey] = useState(0);
  const [chartType, setChartType] = useState<'pie' | 'bar'>(initialChartType);
  const [colorblind, setColorblind] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [showDataTable, setShowDataTable] = useState(false);
  const [showType, setShowType] = useState<'expenses' | 'incomes'>('expenses');

  // Listen to database events to refresh chart data
  useEffect(() => {
    const handleDatabaseChange = () => {
      setAnimateKey(prev => prev + 1);
    };
    
    const unsubscribeAdded = dbEvents.subscribe(DatabaseEvent.TRANSACTION_ADDED, handleDatabaseChange);
    const unsubscribeUpdated = dbEvents.subscribe(DatabaseEvent.TRANSACTION_UPDATED, handleDatabaseChange);
    const unsubscribeDeleted = dbEvents.subscribe(DatabaseEvent.TRANSACTION_DELETED, handleDatabaseChange);
    const unsubscribeImported = dbEvents.subscribe(DatabaseEvent.DATA_IMPORTED, handleDatabaseChange);
    
    return () => {
      unsubscribeAdded();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeImported();
    };
  }, []);

  useEffect(() => {
    const loadCustomCategoryColors = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.categoryColors) {
          setCustomCategoryColors(userCategories.categoryColors);
        }
        if (userCategories.categoryIcons && typeof userCategories.categoryIcons === 'object') {
          const icons = userCategories.categoryIcons;
          const validIcons: Record<string, CategoryIconName> = {};
          let allValid = true;
          Object.entries(icons).forEach(([key, value]) => {
            if (typeof value === 'string' && value in categoryIconMap) {
              validIcons[key] = value as CategoryIconName;
            } else {
              allValid = false;
            }
          });
          if (allValid) {
            setCustomCategoryIcons(validIcons);
          }
        }
      } catch (error) {
        console.error('Error loading custom category colors:', error);
      }
    };
    loadCustomCategoryColors();
  }, []);

  // Trigger animation update when expenses change
  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [expenses]);

  // Use the correct data based on toggle
  const data = showType === 'expenses' ? expenses : incomes;

  // Add fullCategorySummaries before categorySummaries
  const fullCategorySummaries = useMemo(() => {
    const summaryMap = new Map<string, CategorySummary>();
    data.forEach((item) => {
      if (!item.category || !item.category.trim()) return;
      const category = item.category;
      const value = showType === 'incomes' ? Math.abs(item.amount) : item.amount;
      if (!summaryMap.has(category)) {
        const index = summaryMap.size;
        const color = getCategoryColor(category, customCategoryColors, index);
        summaryMap.set(category, {
          category,
          total: 0,
          count: 0,
          color: color,
        });
      }
      const summary = summaryMap.get(category)!;
      summary.total += value;
      summary.count += 1;
    });
    return Array.from(summaryMap.values())
      .filter((summary) => summary.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [data, customCategoryColors, showType]);

  // Update categorySummaries to only filter hidden categories
  const categorySummaries = useMemo(() => {
    return fullCategorySummaries.filter(
      (summary) => !hiddenCategories.has(summary.category)
    );
  }, [fullCategorySummaries, hiddenCategories]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return data.reduce((sum, item) => sum + (showType === 'incomes' ? Math.abs(item.amount) : item.amount), 0);
  }, [data, showType]);

  // Custom legend renderer with improved spacing, overflow, icons, and click-to-hide
  const renderLegend = ({ payload }: any) => (
    <div className="overflow-auto max-h-32 scrollbar-thin">
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 py-2">
        {payload.map((entry: any, index: number) => {
          const isHidden = hiddenCategories.has(entry.value);
          const iconName = getCategoryIconName(entry.value, customCategoryIcons);
          const Icon = categoryIconMap[iconName];
          return (
            <li
              key={`legend-${index}`}
              className={`flex items-center text-xs cursor-pointer select-none transition-opacity ${isHidden ? 'opacity-40' : 'opacity-100'}`}
              onClick={() => {
                setHiddenCategories((prev) => {
                  const next = new Set(prev);
                  if (next.has(entry.value)) next.delete(entry.value);
                  else next.add(entry.value);
                  return next;
                });
              }}
              aria-pressed={isHidden}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setHiddenCategories((prev) => {
                    const next = new Set(prev);
                    if (next.has(entry.value)) next.delete(entry.value);
                    else next.add(entry.value);
                    return next;
                  });
                }
              }}
            >
              <Icon className="w-3 h-3 mr-1.5" />
              <UiTooltip>
                <TooltipTrigger asChild>
                  <span className="capitalize whitespace-nowrap" style={{ color: entry.color }}>
                    {entry.value.length > 10 ? entry.value.slice(0, 10) + '…' : entry.value.replace(/-/g, ' ')}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{getCategoryLabel(entry.value)}</TooltipContent>
              </UiTooltip>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // Custom label formatter for pie chart
  const renderCustomLabel = ({ percent }: { percent: number }) => {
    if (percent < 0.05) return null;
    return `${(percent * 100).toFixed(0)}%`;
  };

  // Value label for bar chart
  const renderBarLabel = (props: any) => {
    const { x, y, width, value, fill, index } = props;
    // Alternate offset to reduce overlap
    const offset = (index % 2 === 0) ? -10 : 10;
    return (
      <text
        x={x + width / 2 + offset}
        y={y - 12}
        fill={fill}
        textAnchor="middle"
        fontSize={10} // smaller font size
        fontWeight="bold"
        aria-label={formatCurrency(value, currency || 'INR')}
      >
        {formatCurrency(value, currency || 'INR')}
      </text>
    );
  };

  // Tooltip with icon, value, percent, and count
  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percent = ((data.total / totalAmount) * 100).toFixed(1);
      const iconName = getCategoryIconName(data.category, customCategoryIcons);
      const Icon = categoryIconMap[iconName];
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-md shadow-md flex items-center gap-2 min-w-[160px]">
          <Icon className="w-5 h-5 mr-2" />
          <div>
            <div className="font-medium capitalize">{getCategoryLabel(data.category)}</div>
            <div className="text-sm">{formatCurrency(data.total, currency || 'INR')}</div>
            <div className="text-xs text-muted-foreground">{percent}% of total</div>
            <div className="text-xs text-muted-foreground">{data.count} transactions</div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Add export handlers
  const chartRef = useRef<HTMLDivElement>(null);
  const handleExportImage = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'chart.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };
  const handleExportCSV = () => {
    const columns = ['category', 'total', 'count', 'color'];
    const csv = exportChartDataAsCSV(fullCategorySummaries, columns);
    forceDownloadCSV(csv, `chart-data-${showType}.csv`);
  };

  return (
    <div key={`chart-${animateKey}`} aria-label="Expense Breakdown Chart" role="region" ref={chartRef}>
      <div className="p-0 px-[0px] py-[0px]">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-lg font-semibold whitespace-nowrap">
            {showType === 'expenses' ? 'Expense Breakdown' : 'Income Breakdown'}
          </h3>
          <div className="flex gap-2 items-center">

          </div>
        </div>
        <div className="flex gap-2 items-center mb-2">
          <button
            className={`text-xs px-3 py-1 rounded font-semibold transition-colors ${showType === 'expenses' ? 'bg-red-600 text-white shadow' : 'bg-slate-200 text-slate-700'}`}
            onClick={() => setShowType('expenses')}
            aria-pressed={showType === 'expenses'}
          >
            Expenses
          </button>
          <button
            className={`text-xs px-3 py-1 rounded font-semibold transition-colors ${showType === 'incomes' ? 'bg-green-600 text-white shadow' : 'bg-slate-200 text-slate-700'}`}
            onClick={() => setShowType('incomes')}
            aria-pressed={showType === 'incomes'}
          >
            Incomes
          </button>
        </div>
        <p className="text-center text-gray-300 text-sm mb-4">
          Total: {formatCurrency(totalAmount, currency || 'INR')}
        </p>
        {categorySummaries.length > 0 ? <div className="w-full">
            {chartType === 'pie' ?
            <div className="w-full h-[370px] md:h-[400px]" aria-label="Pie chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }}>
                    <Pie 
                      data={categorySummaries} 
                      dataKey="total" 
                      nameKey="category" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={100} 
                      innerRadius={50} 
                      paddingAngle={3} 
                      label={renderCustomLabel} 
                      labelLine={false}
                      animationDuration={800}
                      animationBegin={0}
                    >
                      {categorySummaries.map((entry, index) => <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="#1e293b" 
                        strokeWidth={1.5}
                      />)}
                    </Pie>
                    <Tooltip content={renderTooltip} />
                    <Legend 
                    content={(props) => renderLegend({ ...props, payload: fullCategorySummaries.map(s => ({ value: s.category, color: s.color })) })} 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{
                      paddingTop: "30px",
                        color: "#e2e8f0"
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div> :
            <div className="w-full h-[370px] md:h-[400px]" aria-label="Bar chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categorySummaries} 
                    margin={{
                      top: 10,
                      right: 10,
                    bottom: 90,
                      left: 20
                    }} 
                    barSize={24}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="category"
                      interval={0}
                    tick={({ x, y, payload: axisPayload }: any) => (
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <text
                                x={x}
                            y={y + 16}
                                fontSize={12}
                                fill="#e2e8f0"
                            textAnchor="end"
                            transform={`rotate(-30,${x},${y + 16})`}
                                style={{ cursor: 'pointer', maxWidth: 80, whiteSpace: 'pre', overflow: 'visible' }}
                              >
                                {axisPayload.value.length > 14 ? axisPayload.value.slice(0, 12) + '…' : axisPayload.value}
                              </text>
                            </TooltipTrigger>
                            <TooltipContent>{getCategoryLabel(axisPayload.value)}</TooltipContent>
                          </UiTooltip>
                    )}
                    />
                    <YAxis 
                      tick={{
                        fontSize: 12,
                        fill: "#e2e8f0"
                      }} 
                    />
                    <Tooltip content={renderTooltip} />
                    <Bar dataKey="total" label={renderBarLabel}>
                      {categorySummaries.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          style={{
                            filter: 'drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.3))'
                          }}
                        />
                      ))}
                    </Bar>
                    <Legend
                    content={(props) => renderLegend({ ...props, payload: fullCategorySummaries.map(s => ({ value: s.category, color: s.color })) })}
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                    wrapperStyle={{
                      paddingTop: "30px",
                      color: "#e2e8f0"
                    }}
                    />
                  </BarChart>
                </ResponsiveContainer>
            </div>
          }
        </div> : <div className="text-center text-muted-foreground py-8">No data available for this period.</div>}
        <div className="flex justify-between items-center mt-4 px-2">
            <button
            className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white"
            onClick={() => setShowDataTable((v) => !v)}
            >
              {showDataTable ? 'Hide Data Table' : 'Show Data Table'}
            </button>
        </div>
        {showDataTable && (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-xs text-left text-white bg-slate-800 rounded">
              <thead>
                <tr>
                  <th className="px-2 py-1">Category</th>
                  <th className="px-2 py-1">Total</th>
                  <th className="px-2 py-1">Count</th>
                </tr>
              </thead>
              <tbody>
                {fullCategorySummaries.map((row) => (
                  <tr key={row.category}>
                    <td className="px-2 py-1 capitalize">{getCategoryLabel(row.category)}</td>
                    <td className="px-2 py-1">{formatCurrency(row.total, currency || 'INR')}</td>
                    <td className="px-2 py-1">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseSummaryChart;
