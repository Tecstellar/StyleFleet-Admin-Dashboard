export type DateFilterOption =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'previous_month'
  | 'this_year'
  | 'all_time'
  | 'custom';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
}

export type NavView =
  | 'dashboard'
  | 'salons_360'
  | 'staff_access'
  | 'reports_bi'
  | 'support_messages'
  | 'app_telemetry'
  | 'platform_audit'
  | 'system_health'
  | 'account_deletions'
  | 'system_governance';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  isDateFilterable?: boolean;
  isUnavailable?: boolean;
  unavailableReason?: string;
  icon?: any;
  trendData?: number[];
  onClick?: () => void;
}
