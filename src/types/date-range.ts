
export interface DateRange {
  from: Date;
  to: Date;
}

export const createDefaultDateRange = (days: number = 30): DateRange => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  
  return { from, to };
};
