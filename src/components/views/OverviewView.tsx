import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  Store,
  Users,
  Scissors,
  Receipt,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Search,
  ExternalLink,
  ChevronRight,
  Shield,
  CreditCard,
  Building2,
  Activity,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '../common/KPICard';
import { ExportButton } from '../common/ExportButton';
import { StatusBadge } from '../common/StatusBadge';
import { useDateFilter } from '../../context/DateFilterContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, formatDateTime, filterByDateRange } from '../../utils/dateUtils';
import {
  Shop,
  Profile,
  Staff,
  Customer,
  Bill,
  Payment,
  Appointment,
  AccountDeletion,
  SupportMessage,
} from '../../types/database';
import { DateFilterOption, NavView } from '../../types/dashboard';

interface OverviewViewProps {
  shops: Shop[];
  profiles: Profile[];
  staff: Staff[];
  customers: Customer[];
  bills: Bill[];
  payments: Payment[];
  appointments: Appointment[];
  deletions: AccountDeletion[];
  supportMessages: SupportMessage[];
  subscriptions?: any[];
  loading?: boolean;
  onNavigate: (view: NavView) => void;
  onSelectSalon?: (shop: Shop, initialTab?: 'overview' | 'billing') => void;
}

const PALETTE = ['#000000', '#27272a', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'];

export const OverviewView: React.FC<OverviewViewProps> = ({
  shops,
  profiles,
  staff,
  customers,
  bills,
  payments,
  appointments,
  deletions,
  supportMessages,
  loading = false,
  onNavigate,
  onSelectSalon,
}) => {
  const { dateRange, selectedOption, setSelectedOption } = useDateFilter();
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');

  // Filter by active dateRange (Today by default, or Yesterday / 7D / 30D / All Time / Custom)
  const scopedBills = useMemo(() => {
    return filterByDateRange(bills, 'issued_at', dateRange);
  }, [bills, dateRange]);

  const scopedPayments = useMemo(() => {
    return filterByDateRange(payments, 'paid_at', dateRange);
  }, [payments, dateRange]);

  const scopedCustomers = useMemo(() => {
    return filterByDateRange(customers, 'created_at', dateRange);
  }, [customers, dateRange]);

  // Total Billed and Collected in selected date range
  const totalBilledMinor = useMemo(() => {
    return scopedBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
  }, [scopedBills]);

  const totalCollectedMinor = useMemo(() => {
    return scopedPayments
      .filter((p) => p.status === 'completed' || p.status === 'paid' || p.status === 'settled')
      .reduce((acc, p) => acc + (p.amount_minor || 0), 0);
  }, [scopedPayments]);

  const avgTicketMinor = useMemo(() => {
    return scopedBills.length > 0 ? Math.round(totalBilledMinor / scopedBills.length) : 0;
  }, [scopedBills, totalBilledMinor]);

  const pendingBills = useMemo(() => {
    return scopedBills.filter((b) => b.status === 'pending');
  }, [scopedBills]);

  const pendingAmountMinor = useMemo(() => {
    return pendingBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
  }, [pendingBills]);

  // City breakdown
  const cityDistribution = useMemo(() => {
    const map = new Map<string, number>();
    shops.forEach((s) => {
      const city = s.city?.trim() || 'Other';
      map.set(city, (map.get(city) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / (shops.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [shops]);

  // Salon list with performance stats (scoped to active date range, with lifetime quota metrics)
  const salonPerformance = useMemo(() => {
    return shops.map((s) => {
      const allowedIds = s.duplicate_ids && s.duplicate_ids.length > 0 ? s.duplicate_ids : [s.id];
      const salonBills = scopedBills.filter((b) => allowedIds.includes(b.shop_id));
      const salonPayments = scopedPayments.filter(
        (p) => allowedIds.includes(p.shop_id) && (p.status === 'completed' || p.status === 'paid' || p.status === 'settled')
      );
      const salonStaff = staff.filter((st) => allowedIds.includes(st.shop_id));
      const salonCustomers = scopedCustomers.filter((c) => allowedIds.includes(c.shop_id));

      const billed = salonBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
      const collected = salonPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);

      // Quota: 100 free lifetime sales logic
      const lifetimeBills = bills.filter((b) => allowedIds.includes(b.shop_id));
      const salesCount = salonBills.length;
      const lifetimeSalesCount = lifetimeBills.length;
      const quotaRemaining = Math.max(0, 100 - lifetimeSalesCount);
      const quotaPercent = Math.min(100, Math.round((lifetimeSalesCount / 100) * 100));

      let quotaStatus: 'free' | 'warning' | 'limit' = 'free';
      if (lifetimeSalesCount >= 100) quotaStatus = 'limit';
      else if (lifetimeSalesCount >= 50) quotaStatus = 'warning';

      return {
        ...s,
        billed,
        collected,
        salesCount,
        lifetimeSalesCount,
        quotaRemaining,
        quotaPercent,
        quotaStatus,
        staffCount: salonStaff.length,
        customerCount: salonCustomers.length,
      };
    });
  }, [shops, scopedBills, scopedPayments, staff, scopedCustomers, bills]);

  // Filtered Salons
  const filteredSalons = useMemo(() => {
    return salonPerformance.filter((s) => {
      const matchesSearch =
        searchQuery === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.city && s.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.phone && s.phone.includes(searchQuery));

      const matchesCity = cityFilter === 'all' || s.city?.toLowerCase() === cityFilter.toLowerCase();

      return matchesSearch && matchesCity;
    });
  }, [salonPerformance, searchQuery, cityFilter]);

  // Available unique cities
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.city) set.add(s.city.trim());
    });
    return Array.from(set);
  }, [shops]);

  return (
    <div className="space-y-6">
      {/* Overview Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-black text-white shadow-xs">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Overview
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black text-white">
                LIVE
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              High-level operational overview across all connected salons, stylists, customer footfall, and ecosystem health.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* IronDrobe Segmented Date Range Controls */}
          <div className="segmented-control">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last_7_days', label: '7D' },
              { id: 'last_30_days', label: '30D' },
              { id: 'all_time', label: 'All Time' },
            ].map((p) => {
              const isSelected = selectedOption === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedOption(p.id as DateFilterOption)}
                  className={`segment ${isSelected ? 'active' : ''}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <ExportButton
            data={filteredSalons.map((s) => ({
              'Salon Name': s.name,
              Location: s.city || 'Kalugumalai',
              Phone: s.phone || '—',
              'Sales in Period': s.salesCount,
              'Invoiced (INR)': Number((s.billed / 100).toFixed(2)),
              'Collected (INR)': Number((s.collected / 100).toFixed(2)),
              'Outstanding (INR)': Number(((s.billed - s.collected) / 100).toFixed(2)),
              'Lifetime Sales': s.lifetimeSalesCount,
              '100 Quota Remaining': s.quotaRemaining,
              'Quota Status': s.quotaStatus === 'limit' ? 'Limit Reached' : `${s.quotaRemaining} free left`,
              Stylists: s.staffCount,
              'Tracked Clients': s.customerCount,
            }))}
            filename={`stylefleet_platform_overview_${selectedOption}_${new Date().toISOString().split('T')[0]}`}
            label="Export Excel"
          />
        </div>
      </div>

      {/* DOMAIN SECTION 1: PLATFORM ECOSYSTEM SUMMARY */}
      <div className="overview-section overview-section--live">
        <div className="flex items-center justify-between">
          <span className="overview-section-title">Ecosystem Footprint</span>
          <span className="text-[11px] font-mono font-medium text-neutral-600">
            Window: <strong className="text-neutral-900">{dateRange.label}</strong> (Real-time Supabase sync)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            title="Connected Salons"
            value={formatNumber(shops.length)}
            subtitle="Registered partner salons"
            tone="usage"
            icon={Store}
            onClick={() => onNavigate('salons_360')}
          />
          <KPICard
            title="Sales Invoices"
            value={formatNumber(scopedBills.length)}
            subtitle={`${scopedBills.filter((b) => b.status === 'paid').length} settled • ${dateRange.label}`}
            tone="order-good"
            icon={Receipt}
            onClick={() => onNavigate('daily_bills')}
          />
          <KPICard
            title="Active Stylists"
            value={formatNumber(staff.length)}
            subtitle={`${staff.filter((s) => s.invitation_status === 'active').length} active on mobile app`}
            tone="brand"
            icon={Scissors}
            onClick={() => onNavigate('staff_access')}
          />
          <KPICard
            title="Customer Footfall"
            value={formatNumber(scopedCustomers.length)}
            subtitle={`${selectedOption === 'all_time' ? 'Total client profiles' : `Tracked in ${dateRange.label}`}`}
            tone="signup"
            icon={Users}
            onClick={() => onNavigate('customer_tracking')}
          />
        </div>
      </div>

      {/* DOMAIN SECTION 2: FINANCIAL VELOCITY & QUOTA HEALTH */}
      <div className="overview-section overview-section--revenue">
        <div className="flex items-center justify-between">
          <span className="overview-section-title">Financial Velocity &amp; Quota Health</span>
          <span className="text-[11px] font-mono font-medium text-neutral-600">
            Window: <strong className="text-neutral-900">{dateRange.label}</strong>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            title="Invoiced Sales"
            value={formatCurrency(totalBilledMinor)}
            subtitle={`Gross sales in ${dateRange.label}`}
            tone="revenue"
            icon={DollarSign}
            onClick={() => onNavigate('revenue_trend')}
          />
          <KPICard
            title="Collections Settled"
            value={formatCurrency(totalCollectedMinor)}
            subtitle={`${scopedPayments.length} verified transactions • ${dateRange.label}`}
            tone="brand"
            icon={TrendingUp}
            onClick={() => onNavigate('revenue_trend')}
          />
          <KPICard
            title="Average Ticket Size"
            value={formatCurrency(avgTicketMinor)}
            subtitle={`Per invoice • ${dateRange.label}`}
            tone="conversion"
            icon={Receipt}
            onClick={() => onNavigate('daily_bills')}
          />
          <KPICard
            title="In 100-Trial Quota"
            value={salonPerformance.filter((s) => s.quotaStatus === 'free').length}
            subtitle={`${salonPerformance.filter((s) => s.quotaStatus === 'limit').length} reached 100 sales limit`}
            tone="trial"
            icon={CheckCircle2}
            onClick={() => onNavigate('subscription_plans')}
          />
        </div>
      </div>

      {/* TWO-COLUMN GRID: DIRECTORY LEDGER + PLATFORM INTELLIGENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: SALON DIRECTORY & QUOTA LEDGER */}
        <div className="lg:col-span-2 panel space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-black" />
                <span>Partner Salon Directory &amp; Quota Consumption</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Live performance ranking, completed sales, and 100 free sales quota tracker.
              </p>
            </div>

            <div className="text-xs font-mono text-neutral-600">
              {filteredSalons.length} salon(s) in scope
            </div>
          </div>

          {/* Search & City Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by salon name, city, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50/70 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50/70 text-neutral-900 font-semibold focus:outline-none focus:border-black"
            >
              <option value="all">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">Salon Business</th>
                  <th className="px-3.5 py-3">Location</th>
                  <th className="px-3.5 py-3">Sales Done ({dateRange.label})</th>
                  <th className="px-3.5 py-3">100 Quota Usage</th>
                  <th className="px-3.5 py-3">Invoiced Volume ({dateRange.label})</th>
                  <th className="px-3.5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredSalons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                      No salons match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSalons.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-3.5">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {s.phone || 'No phone'}
                        </div>
                      </td>

                      <td className="px-3.5 py-3.5">
                        <div className="flex items-center gap-1 text-slate-700">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{s.city || 'Kalugumalai'}</span>
                        </div>
                      </td>

                      <td className="px-3.5 py-3.5">
                        <span className="font-mono font-bold text-slate-900">
                          {s.salesCount} sales
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5">
                        <div className="space-y-1 max-w-[140px]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-semibold text-slate-600">
                              {s.lifetimeSalesCount} / 100
                            </span>
                            <span
                              className={`font-bold ${
                                s.quotaStatus === 'limit'
                                  ? 'text-rose-600'
                                  : s.quotaStatus === 'warning'
                                  ? 'text-amber-600'
                                  : 'text-neutral-900'
                              }`}
                            >
                              {s.quotaStatus === 'limit' ? 'Limit Reached' : `${s.quotaRemaining} free left`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                s.quotaStatus === 'limit'
                                  ? 'bg-rose-500'
                                  : s.quotaStatus === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-[#1c1f26]'
                              }`}
                              style={{ width: `${s.quotaPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-3.5 py-3.5 font-mono font-bold text-neutral-900">
                        {formatCurrency(s.billed)}
                      </td>

                      <td className="px-3.5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            if (onSelectSalon) onSelectSalon(s, 'billing');
                            else onNavigate('daily_bills');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-neutral-100 hover:bg-[#1c1f26] text-neutral-800 hover:text-white transition-all cursor-pointer shadow-2xs"
                          title="View Date-wise Billing & Payments"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK LAUNCH & GEOGRAPHY */}
        <div className="space-y-6">
          {/* Quick Hub Navigation Cards */}
          <div className="panel space-y-3.5">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-black" />
              <span>Workspace Navigation</span>
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  title: 'Founder Dashboard',
                  desc: 'Executive KPIs, cadence & date filters',
                  view: 'dashboard' as NavView,
                  icon: Activity,
                },
                {
                  title: 'Daily Sales Metrics',
                  desc: 'Date-by-date sales volume matrix',
                  view: 'daily_bills' as NavView,
                  icon: Receipt,
                },
                {
                  title: 'Revenue Trend',
                  desc: 'Monthly collections vs invoiced trends',
                  view: 'revenue_trend' as NavView,
                  icon: TrendingUp,
                },
                {
                  title: 'Subscription & 100 Quotas',
                  desc: '100 free sales tracking & Pro plans',
                  view: 'subscription_plans' as NavView,
                  icon: CheckCircle2,
                },
                {
                  title: 'Customer Tracking',
                  desc: 'Client profiles & visit history',
                  view: 'customer_tracking' as NavView,
                  icon: Users,
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onNavigate(item.view)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-neutral-200/80 hover:border-black bg-neutral-50/50 hover:bg-neutral-100 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white border border-neutral-200 text-black group-hover:bg-black group-hover:text-white transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-900 group-hover:text-black transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-neutral-500">{item.desc}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="panel space-y-3.5">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-black" />
              <span>Geographic Distribution</span>
            </h3>

            <div className="space-y-2.5">
              {cityDistribution.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-800">{item.name}</span>
                    <span className="font-mono text-neutral-500 text-[11px]">
                      {item.count} salon(s) ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
