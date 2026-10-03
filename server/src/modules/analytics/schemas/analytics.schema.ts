export type AnalyticsDatePreset =
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'custom';

export interface AnalyticsDateRange {
  from: string;
  to: string;
}
