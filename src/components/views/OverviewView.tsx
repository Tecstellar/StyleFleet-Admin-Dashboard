import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  ChevronDown,
  Calendar,
  Filter,
  Smartphone,
  MessageCircle,
  ArrowUpDown,
  X,
  Activity,
  MapPin,
} from 'lucide-react';
import { ExportButton } from '../common/ExportButton';
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

type PillFilterType =
  | 'all'
  | 'active'
  | 'inactive'
  | 'free_plan'
  | 'pro_plan'
  | 'with_bills'
  | 'zero_bills'
  | 'with_customers'
  | 'near_limit'
  | 'staff_configured'
  | 'gst_enabled'
  | 'ten_plus_bills';

type SortField =
  | 'ownerName'
  | 'name'
  | 'phone'
  | 'city'
  | 'created_at'
  | 'lifetimeSalesCount'
  | 'billed';

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
  const [activePillFilter, setActivePillFilter] = useState<PillFilterType>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter scoped data by selected date range
  const scopedBills = useMemo(() => {
    return filterByDateRange(bills, 'issued_at', dateRange);
  }, [bills, dateRange]);

  const scopedPayments = useMemo(() => {
    return filterByDateRange(payments, 'paid_at', dateRange);
  }, [payments, dateRange]);

  const scopedCustomers = useMemo(() => {
    return filterByDateRange(customers, 'created_at', dateRange);
  }, [customers, dateRange]);

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

  // Salon list with performance stats, owner details, and complete operational metadata
  const salonPerformance = useMemo(() => {
    const cleanDigits = (p?: string | null) => (p ? p.replace(/\D/g, '').slice(-10) : '');

    return shops.map((s) => {
      const allowedIds = s.duplicate_ids && s.duplicate_ids.length > 0 ? s.duplicate_ids : [s.id];
      const salonBills = scopedBills.filter((b) => allowedIds.includes(b.shop_id));
      const salonPayments = scopedPayments.filter(
        (p) => allowedIds.includes(p.shop_id) && (p.status === 'completed' || p.status === 'paid' || p.status === 'settled')
      );
      const salonStaff = staff.filter((st) => allowedIds.includes(st.shop_id));
      const salonCustomers = scopedCustomers.filter((c) => allowedIds.includes(c.shop_id));
      const totalSalonCustomers = customers.filter((c) => allowedIds.includes(c.shop_id));

      const billed = salonBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
      const collected = salonPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);

      // Quota: Free sales limit logic (supports per-salon override, defaults to 100)
      const freeLimit = s.free_sales_limit || 100;
      const lifetimeBills = bills.filter((b) => allowedIds.includes(b.shop_id));
      const salesCount = salonBills.length;
      const lifetimeSalesCount = lifetimeBills.length;
      const quotaRemaining = Math.max(0, freeLimit - lifetimeSalesCount);
      const quotaPercent = Math.min(100, Math.round((lifetimeSalesCount / freeLimit) * 100));

      let quotaStatus: 'free' | 'warning' | 'limit' = 'free';
      if (lifetimeSalesCount >= freeLimit) quotaStatus = 'limit';
      else if (lifetimeSalesCount >= freeLimit * 0.5) quotaStatus = 'warning';

      // Match owner profile from profiles list or phone
      const sPhone = cleanDigits(s.phone);
      const owner =
        (s.owner_profile_id ? profiles.find((p) => p.id === s.owner_profile_id) : null) ||
        (sPhone ? profiles.find((p) => cleanDigits(p.phone) === sPhone) : null) ||
        s.owner_profile ||
        null;

      const ownerName = owner?.full_name?.trim() || 'Salon Owner';
      const ownerPhone = owner?.phone || s.phone || '—';

      return {
        ...s,
        billed,
        collected,
        salesCount,
        lifetimeSalesCount,
        freeLimit,
        quotaRemaining,
        quotaPercent,
        quotaStatus,
        staffCount: salonStaff.length,
        customerCount: salonCustomers.length,
        totalCustomerCount: totalSalonCustomers.length,
        ownerName,
        ownerPhone,
      };
    });
  }, [shops, scopedBills, scopedPayments, staff, scopedCustomers, customers, bills, profiles]);

  // Derived Pill Counts
  const pillCounts = useMemo(() => {
    const total = salonPerformance.length;
    const active = salonPerformance.filter((s) => s.lifetimeSalesCount > 0).length;
    const inactive = salonPerformance.filter((s) => s.lifetimeSalesCount === 0).length;
    const freePlan = salonPerformance.filter((s) => s.quotaStatus !== 'limit').length;
    const proPlan = salonPerformance.filter((s) => s.quotaStatus === 'limit').length;
    const withBills = salonPerformance.filter((s) => s.lifetimeSalesCount > 0).length;
    const zeroBills = salonPerformance.filter((s) => s.lifetimeSalesCount === 0).length;
    const withCustomers = salonPerformance.filter((s) => s.totalCustomerCount > 0).length;
    const totalShoppers = customers.length;
    const nearLimit = salonPerformance.filter((s) => s.lifetimeSalesCount >= 80 && s.lifetimeSalesCount < s.freeLimit).length;
    const staffConfigured = salonPerformance.filter((s) => s.staffCount > 0).length;
    const gstEnabled = salonPerformance.filter((s) => s.gstin && s.gstin.trim().length > 0).length;
    const tenPlusBills = salonPerformance.filter((s) => s.lifetimeSalesCount >= 10).length;

    return {
      total,
      active,
      inactive,
      freePlan,
      proPlan,
      withBills,
      zeroBills,
      withCustomers,
      totalShoppers,
      nearLimit,
      staffConfigured,
      gstEnabled,
      tenPlusBills,
    };
  }, [salonPerformance, customers]);

  // Filtered and Sorted Salons
  const displayedSalons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filtered = salonPerformance.filter((s) => {
      // 1. Search Query Match
      const matchesSearch =
        q === '' ||
        s.name.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(q)) ||
        (s.ownerPhone && s.ownerPhone.includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q);

      // 2. City Filter Match
      const matchesCity = cityFilter === 'all' || s.city?.toLowerCase() === cityFilter.toLowerCase();

      // 3. Pill Filter Match
      let matchesPill = true;
      if (activePillFilter === 'active') matchesPill = s.lifetimeSalesCount > 0;
      else if (activePillFilter === 'inactive') matchesPill = s.lifetimeSalesCount === 0;
      else if (activePillFilter === 'free_plan') matchesPill = s.quotaStatus !== 'limit';
      else if (activePillFilter === 'pro_plan') matchesPill = s.quotaStatus === 'limit';
      else if (activePillFilter === 'with_bills') matchesPill = s.lifetimeSalesCount > 0;
      else if (activePillFilter === 'zero_bills') matchesPill = s.lifetimeSalesCount === 0;
      else if (activePillFilter === 'with_customers') matchesPill = s.totalCustomerCount > 0;
      else if (activePillFilter === 'near_limit') matchesPill = s.lifetimeSalesCount >= 80 && s.lifetimeSalesCount < s.freeLimit;
      else if (activePillFilter === 'staff_configured') matchesPill = s.staffCount > 0;
      else if (activePillFilter === 'gst_enabled') matchesPill = !!(s.gstin && s.gstin.trim().length > 0);
      else if (activePillFilter === 'ten_plus_bills') matchesPill = s.lifetimeSalesCount >= 10;

      return matchesSearch && matchesCity && matchesPill;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'created_at') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (typeof valA === 'string') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [salonPerformance, searchQuery, cityFilter, activePillFilter, sortField, sortDirection]);

  // Unique cities list
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.city) set.add(s.city.trim());
    });
    return Array.from(set);
  }, [shops]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const cleanDigits = (p?: string | null) => (p ? p.replace(/\D/g, '').slice(-10) : '');

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER (Matches Counter365 Platform Overview Header) */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-1">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#ea580c] block">
            STYLEFLEET PLATFORM
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Executive 360 platform summary and performance metrics
          </p>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
          {/* Live Sync Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </div>

          {/* Date Range Selector Pill */}
          <div className="relative">
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value as DateFilterOption)}
              className="appearance-none pl-7 pr-7 py-1 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs"
            >
              <option value="all_time">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Top Quick Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search shops, bills, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-full border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 w-48 sm:w-56 shadow-2xs"
            />
          </div>

          {/* Top Export Button */}
          <ExportButton
            data={displayedSalons.map((s) => ({
              'Owner Name': s.ownerName,
              'Shop Name': s.name,
              'Phone': s.phone || s.ownerPhone || '—',
              'Location': `${s.city || 'Kalugumalai'}, Tamil Nadu`,
              'Registered Date': s.created_at ? formatDate(s.created_at) : '—',
              'Activity': s.lifetimeSalesCount > 0 ? 'Live' : 'Inactive',
              'Plan': s.quotaStatus === 'limit' ? 'PRO' : 'FREE',
              '100 Sales Quota': `${s.lifetimeSalesCount} / ${s.freeLimit} Sales (${s.quotaPercent}%)`,
              'Completed Bills': s.lifetimeSalesCount,
              'Total Sales (INR)': Number((s.billed / 100).toFixed(2)),
            }))}
            filename={`stylefleet_overview_${selectedOption}_${new Date().toISOString().split('T')[0]}`}
            label="Export"
          />

          {/* Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
            title="Refresh Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. SHOPS DIRECTORY & PILL-SIZE STAT MATRIX */}
      <div className="panel space-y-3.5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Shops Directory
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-[#ea580c] border border-orange-200">
              {pillCounts.total} Enrolled
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Click any pill to instantly filter the merchant ledger
          </span>
        </div>

        {/* PILL SIZE METRICS - ROW 1 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Registered Pill */}
          <button
            onClick={() => setActivePillFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            Registered <span className="font-mono ml-1">{pillCounts.total}</span>
          </button>

          {/* Active Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'active' ? 'all' : 'active')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'active'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50/60 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            Active <span className="font-mono ml-1">{pillCounts.active}</span>
          </button>

          {/* Inactive Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'inactive' ? 'all' : 'inactive')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'inactive'
                ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Inactive <span className="font-mono ml-1">{pillCounts.inactive}</span>
          </button>

          {/* Free Plan (100 limit) Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'free_plan' ? 'all' : 'free_plan')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'free_plan'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50/60 text-amber-800 border-amber-200 hover:bg-amber-100/60'
            }`}
          >
            Free Plan (100 limit) <span className="font-mono ml-1">{pillCounts.freePlan}</span>
          </button>

          {/* Pro Plan Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'pro_plan' ? 'all' : 'pro_plan')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'pro_plan'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-orange-50/60 text-orange-800 border-orange-200 hover:bg-orange-100/60'
            }`}
          >
            Pro Plan <span className="font-mono ml-1">{pillCounts.proPlan}</span>
          </button>

          {/* Shops w/ Bills Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'with_bills' ? 'all' : 'with_bills')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'with_bills'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-blue-50/60 text-blue-700 border-blue-200 hover:bg-blue-100/60'
            }`}
          >
            Shops w/ Bills <span className="font-mono ml-1">{pillCounts.withBills}</span>
          </button>

          {/* Zero Bills Yet Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'zero_bills' ? 'all' : 'zero_bills')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'zero_bills'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-purple-50/60 text-purple-700 border-purple-200 hover:bg-purple-100/60'
            }`}
          >
            Zero Bills Yet <span className="font-mono ml-1">{pillCounts.zeroBills}</span>
          </button>
        </div>

        {/* PILL SIZE METRICS - ROW 2 */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {/* Shops w/ Customers Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'with_customers' ? 'all' : 'with_customers')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'with_customers'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-indigo-50/60 text-indigo-700 border-indigo-200 hover:bg-indigo-100/60'
            }`}
          >
            Shops w/ Customers <span className="font-mono ml-1">{pillCounts.withCustomers}</span>
          </button>

          {/* Total Shoppers Captured Pill */}
          <div className="px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-800">
            Total Shoppers Captured <span className="font-mono ml-1 font-bold">{formatNumber(pillCounts.totalShoppers)}</span>
          </div>

          {/* Near 100 Limit (>80) Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'near_limit' ? 'all' : 'near_limit')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'near_limit'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50/60 text-rose-700 border-rose-200 hover:bg-rose-100/60'
            }`}
          >
            Near 100 Limit (&gt;80) <span className="font-mono ml-1">{pillCounts.nearLimit}</span>
          </button>

          {/* Staff Configured Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'staff_configured' ? 'all' : 'staff_configured')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'staff_configured'
                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                : 'bg-teal-50/60 text-teal-700 border-teal-200 hover:bg-teal-100/60'
            }`}
          >
            Staff Configured <span className="font-mono ml-1">{pillCounts.staffConfigured}</span>
          </button>

          {/* GST Enabled Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'gst_enabled' ? 'all' : 'gst_enabled')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'gst_enabled'
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                : 'bg-cyan-50/60 text-cyan-700 border-cyan-200 hover:bg-cyan-100/60'
            }`}
          >
            GST Enabled <span className="font-mono ml-1">{pillCounts.gstEnabled}</span>
          </button>
        </div>

        {/* 3. FILTER TABS ROW (All shops, Active, Inactive, etc.) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 border-t border-slate-100 text-xs">
          {[
            { id: 'all' as PillFilterType, label: `All shops (${pillCounts.total})` },
            { id: 'active' as PillFilterType, label: `Active (${pillCounts.active})` },
            { id: 'inactive' as PillFilterType, label: `Inactive (${pillCounts.inactive})` },
            { id: 'free_plan' as PillFilterType, label: `Free Plan (100 Limit)` },
            { id: 'pro_plan' as PillFilterType, label: `Pro Plan (${pillCounts.proPlan})` },
            { id: 'with_bills' as PillFilterType, label: `With Completed Bills (${pillCounts.withBills})` },
            { id: 'zero_bills' as PillFilterType, label: `Zero Bills (${pillCounts.zeroBills})` },
            { id: 'ten_plus_bills' as PillFilterType, label: `10+ Bills (${pillCounts.tenPlusBills})` },
            { id: 'with_customers' as PillFilterType, label: `With Customers (${pillCounts.withCustomers})` },
            { id: 'staff_configured' as PillFilterType, label: `Staff Setup (${pillCounts.staffConfigured})` },
          ].map((tab) => {
            const isActive = activePillFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePillFilter(tab.id)}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap font-medium text-xs ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 bg-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 4. SEARCH & ACTION CONTROLS BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search shop name, owner, phone, city, or shop ID.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Reset Filters Pill Button */}
            <button
              onClick={() => {
                setSearchQuery('');
                setCityFilter('all');
                setActivePillFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
            >
              <Filter className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>

            {/* Export Excel Button */}
            <ExportButton
              data={displayedSalons.map((s) => ({
                'Owner Name': s.ownerName,
                'Shop Name': s.name,
                'Phone': s.phone || s.ownerPhone || '—',
                'Location': `${s.city || 'Kalugumalai'}, Tamil Nadu`,
                'Registered Date': s.created_at ? formatDate(s.created_at) : '—',
                'Platform': 'Android POS',
                'Activity': s.lifetimeSalesCount > 0 ? 'Live' : 'Inactive',
                'Plan': s.quotaStatus === 'limit' ? 'PRO' : 'FREE',
                'Quota Usage': `${s.lifetimeSalesCount} / ${s.freeLimit} Sales`,
                'Quota %': `${s.quotaPercent}%`,
                'Completed Bills': s.lifetimeSalesCount,
                'Total Sales (INR)': Number((s.billed / 100).toFixed(2)),
              }))}
              filename={`stylefleet_merchant_ledger_${selectedOption}_${new Date().toISOString().split('T')[0]}`}
              label="Export Excel"
            />

            {/* Filter Geography Dropdown Button */}
            <div className="relative">
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="appearance-none pl-7 pr-7 py-1.5 text-xs font-semibold rounded-lg border border-teal-200 bg-teal-50/50 text-teal-800 hover:bg-teal-100/60 focus:outline-none cursor-pointer"
              >
                <option value="all">Filter Geography ({uniqueCities.length})</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <MapPin className="w-3.5 h-3.5 text-teal-600 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-teal-600 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Clear Tab Pill Button */}
            {activePillFilter !== 'all' && (
              <button
                onClick={() => setActivePillFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Clear tab</span>
              </button>
            )}
          </div>

          {/* Showing Count */}
          <div className="text-xs text-slate-500 self-center whitespace-nowrap">
            Showing <span className="font-semibold text-slate-900">{displayedSalons.length}</span> of {shops.length} shops
          </div>
        </div>

        {/* 5. THE MERCHANT LEDGER TABLE (Matches Screenshot Columns Exactly) */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px] border-b border-slate-200 select-none">
              <tr>
                <th
                  onClick={() => handleSort('ownerName')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>NAME</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>SHOP</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('phone')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>PHONE</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('city')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>LOCATION</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>REGISTERED</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-2.5">PLATFORM</th>
                <th className="px-3 py-2.5">ACTIVITY</th>
                <th className="px-3 py-2.5">PLAN</th>
                <th className="px-3 py-2.5 min-w-[130px]">FREE 100 SALES QUOTA</th>
                <th
                  onClick={() => handleSort('lifetimeSalesCount')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>BILLS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('billed')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>TOTAL SALES (₹)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {displayedSalons.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-xs text-slate-400">
                    No shops match your active filters. Click "Reset Filters" to view all.
                  </td>
                </tr>
              ) : (
                displayedSalons.map((s) => {
                  const isLive = s.salesCount > 0 || (s.lifetimeSalesCount > 0 && selectedOption === 'all_time');
                  const isToday =
                    s.created_at && new Date(s.created_at).toDateString() === new Date().toDateString();

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. NAME (Owner) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 text-xs">
                          {s.ownerName}
                        </span>
                      </td>

                      {/* 2. SHOP (Business Name) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-medium text-slate-800 text-xs">
                          {s.name}
                        </span>
                      </td>

                      {/* 3. PHONE (WhatsApp icon + number) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <a
                          href={`https://wa.me/91${cleanDigits(s.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 transition-colors font-mono text-xs"
                          title="Contact on WhatsApp"
                        >
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-2.5 h-2.5 fill-emerald-600" />
                          </span>
                          <span>{s.phone || s.ownerPhone || 'No phone'}</span>
                        </a>
                      </td>

                      {/* 4. LOCATION (City & State) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="text-[11px] leading-tight">
                          <div className="font-medium text-slate-800">{s.city || 'Kalugumalai'}</div>
                          <div className="text-slate-400 text-[10px]">Tamil Nadu</div>
                        </div>
                      </td>

                      {/* 5. REGISTERED (Date) */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-700">
                        {s.created_at ? formatDate(s.created_at) : '—'}
                      </td>

                      {/* 6. PLATFORM */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Android POS</span>
                        </div>
                      </td>

                      {/* 7. ACTIVITY (Live / Today / Inactive) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Live
                          </span>
                        ) : isToday ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Today
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* 8. PLAN (FREE / PRO) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {s.quotaStatus === 'limit' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            PRO
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            FREE
                          </span>
                        )}
                      </td>

                      {/* 9. FREE 100 SALES QUOTA */}
                      <td className="px-3 py-2.5 min-w-[130px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="font-semibold text-slate-700 tabular-nums">
                              {s.lifetimeSalesCount} / {s.freeLimit} Sales
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {s.quotaPercent}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                s.quotaStatus === 'limit'
                                  ? 'bg-rose-500'
                                  : s.quotaStatus === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-[#ff7a00]'
                              }`}
                              style={{ width: `${s.quotaPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 10. BILLS */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
                          {s.lifetimeSalesCount} bills
                        </span>
                      </td>

                      {/* 11. TOTAL SALES (₹) */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-right font-bold text-slate-900 tabular-nums text-xs">
                        {formatCurrency(s.billed)}
                      </td>

                      {/* 12. ACTION */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            if (onSelectSalon) onSelectSalon(s, 'overview');
                            else onNavigate('salons_360');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md text-[#0F4C5C] bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. GEOGRAPHIC DISTRIBUTION */}
      {cityDistribution.length > 0 && (
        <div className="panel space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-500" />
              Geographic Distribution
            </h3>
            <span className="text-xs text-slate-500">
              {cityDistribution.length} distinct locations
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cityDistribution.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{item.name}</span>
                  <span className="text-slate-600 font-mono text-[11px] tabular-nums">
                    {item.count} shop(s) ({item.percent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
