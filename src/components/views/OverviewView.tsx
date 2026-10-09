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
  ChevronDown,
  Shield,
  CreditCard,
  Building2,
  Activity,
  ArrowRight,
  Sparkles,
  Phone,
  User,
  Hash,
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
  const [expandedSalonId, setExpandedSalonId] = useState<string | null>(null);

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

  // Filtered Salons with complete field search
  const filteredSalons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return salonPerformance.filter((s) => {
      const matchesSearch =
        q === '' ||
        s.name.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(q)) ||
        (s.ownerPhone && s.ownerPhone.includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q)) ||
        (s.invoice_prefix && s.invoice_prefix.toLowerCase().includes(q));

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
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Operations Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            High-level operational overview across all connected salons, stylists, customer footfall, and ecosystem health.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Segmented Date Range Controls */}
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
              'Registered Date': s.created_at ? formatDate(s.created_at) : '—',
              'Owner Name': s.ownerName,
              'Contact Phone': s.phone || s.ownerPhone || '—',
              'Street Address': s.address || '—',
              'City': s.city || 'Kalugumalai',
              'PIN Code': s.pin_code || '—',
              'GSTIN': s.gstin || 'Non-GST',
              'GST Rate (%)': s.gst_rate ?? 0,
              'Invoice Prefix': s.invoice_prefix || 'INV',
              'Stylists': s.staffCount,
              'Tracked Clients': s.totalCustomerCount,
              'Sales in Period': s.salesCount,
              'Invoiced (INR)': Number((s.billed / 100).toFixed(2)),
              'Collected (INR)': Number((s.collected / 100).toFixed(2)),
              'Outstanding (INR)': Number(((s.billed - s.collected) / 100).toFixed(2)),
              'Lifetime Sales': s.lifetimeSalesCount,
              'Free Quota Limit': s.freeLimit,
              'Quota Remaining': s.quotaRemaining,
              'Quota Status': s.quotaStatus === 'limit' ? 'Limit Reached' : `${s.quotaRemaining} free left`,
            }))}
            filename={`stylefleet_salon_directory_${selectedOption}_${new Date().toISOString().split('T')[0]}`}
            label="Export Directory"
          />
        </div>
      </div>

      {/* DOMAIN SECTION 1: PLATFORM ECOSYSTEM SUMMARY */}
      <div className="overview-section">
        <div className="flex items-center justify-between">
          <span className="overview-section-title">Ecosystem Footprint</span>
          <span className="text-[11px] text-slate-500">
            Window: <span className="font-medium text-slate-800">{dateRange.label}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <KPICard
            title="Connected Salons"
            value={formatNumber(shops.length)}
            subtitle="Registered partner salons"
            icon={Store}
            size="sm"
            onClick={() => onNavigate('salons_360')}
          />
          <KPICard
            title="Sales Invoices"
            value={formatNumber(scopedBills.length)}
            subtitle={`${scopedBills.filter((b) => b.status === 'paid').length} settled • ${dateRange.label}`}
            icon={Receipt}
            size="sm"
            onClick={() => onNavigate('daily_bills')}
          />
          <KPICard
            title="Active Stylists"
            value={formatNumber(staff.length)}
            subtitle={`${staff.filter((s) => s.invitation_status === 'active').length} active stylists`}
            icon={Scissors}
            size="sm"
            onClick={() => onNavigate('staff_access')}
          />
          <KPICard
            title="Customer Footfall"
            value={formatNumber(scopedCustomers.length)}
            subtitle={`${selectedOption === 'all_time' ? 'Total client profiles' : `Tracked in ${dateRange.label}`}`}
            icon={Users}
            size="sm"
            onClick={() => onNavigate('customer_tracking')}
          />
        </div>
      </div>

      {/* DOMAIN SECTION 2: FINANCIAL VELOCITY & QUOTA HEALTH */}
      <div className="overview-section">
        <div className="flex items-center justify-between">
          <span className="overview-section-title">Financial Velocity &amp; Quota Health</span>
          <span className="text-[11px] text-slate-500">
            Window: <span className="font-medium text-slate-800">{dateRange.label}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <KPICard
            title="Invoiced Sales"
            value={formatCurrency(totalBilledMinor)}
            subtitle={`Gross sales in ${dateRange.label}`}
            icon={DollarSign}
            size="sm"
            onClick={() => onNavigate('revenue_trend')}
          />
          <KPICard
            title="Collections Settled"
            value={formatCurrency(totalCollectedMinor)}
            subtitle={`${scopedPayments.length} verified transactions • ${dateRange.label}`}
            icon={TrendingUp}
            size="sm"
            onClick={() => onNavigate('revenue_trend')}
          />
          <KPICard
            title="Average Ticket Size"
            value={formatCurrency(avgTicketMinor)}
            subtitle={`Per invoice • ${dateRange.label}`}
            icon={Receipt}
            size="sm"
            onClick={() => onNavigate('daily_bills')}
          />
          <KPICard
            title="In 100-Trial Quota"
            value={salonPerformance.filter((s) => s.quotaStatus === 'free').length}
            subtitle={`${salonPerformance.filter((s) => s.quotaStatus === 'limit').length} reached 100 sales limit`}
            icon={CheckCircle2}
            size="sm"
            onClick={() => onNavigate('subscription_plans')}
          />
        </div>
      </div>

      {/* COMPLETE PARTNER SALON DIRECTORY */}
      <div className="panel space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Partner Salon Directory &amp; Complete Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive directory of connected salons including registration date, owner profile, full address, contact, tax identifier, team size, and sales quota.
            </p>
          </div>

          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-900">{filteredSalons.length}</span> of {shops.length} salons
          </div>
        </div>

        {/* Search & City Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search salon name, owner, city, address, phone, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
            />
          </div>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
          >
            <option value="all">All Cities ({uniqueCities.length})</option>
            {uniqueCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Complete Details Directory Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Salon Business</th>
                <th className="px-3.5 py-2.5">Registered Date</th>
                <th className="px-3.5 py-2.5">Owner &amp; Contact</th>
                <th className="px-3.5 py-2.5">Complete Address</th>
                <th className="px-3.5 py-2.5">GSTIN / Tax</th>
                <th className="px-3.5 py-2.5">Team &amp; Clients</th>
                <th className="px-3.5 py-2.5">Sales &amp; Quota</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredSalons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">
                    No salons match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredSalons.map((s) => {
                  const isExpanded = expandedSalonId === s.id;
                  const regDateFormatted = s.created_at ? formatDate(s.created_at) : '—';
                  const regTimeFormatted = s.created_at ? new Date(s.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

                  return (
                    <React.Fragment key={s.id}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`}>
                        {/* 1. Salon Business */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: s.accent_color || '#0F4C5C' }}
                              title={`Accent: ${s.accent_color || '#0F4C5C'}`}
                            />
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">{s.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                                  {s.invoice_prefix || 'INV'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Registered Date */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <div>
                              <div className="font-medium text-slate-800">{regDateFormatted}</div>
                              {regTimeFormatted && (
                                <div className="text-[10.5px] text-slate-400 font-mono">{regTimeFormatted}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Owner & Contact */}
                        <td className="px-3.5 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-medium text-slate-800">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{s.ownerName}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{s.phone || s.ownerPhone || 'No phone'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Complete Address */}
                        <td className="px-3.5 py-3 max-w-[200px]">
                          <div className="flex items-start gap-1 text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-tight">
                              <div className="font-medium text-slate-800">{s.city || 'Kalugumalai'}</div>
                              <div className="text-slate-500 line-clamp-1" title={s.address || undefined}>
                                {s.address || 'Address not listed'}
                              </div>
                              {s.pin_code && (
                                <div className="text-[10px] text-slate-400 font-mono">PIN: {s.pin_code}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 5. GSTIN / Tax */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                                s.gstin
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                              }`}
                            >
                              {s.gstin || 'Non-GST'}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              GST Rate: <span className="font-semibold text-slate-600">{s.gst_rate ?? 0}%</span>
                            </div>
                          </div>
                        </td>

                        {/* 6. Team & Clients */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="space-y-0.5 text-[11px]">
                            <div className="flex items-center gap-1 text-slate-700">
                              <Scissors className="w-3 h-3 text-slate-400" />
                              <span className="font-medium">{s.staffCount} Stylists</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>{s.totalCustomerCount || s.customerCount} Clients</span>
                            </div>
                          </div>
                        </td>

                        {/* 7. Sales & Quota */}
                        <td className="px-3.5 py-3">
                          <div className="space-y-1 min-w-[130px]">
                            <div className="flex items-center justify-between text-[10.5px]">
                              <span className="font-medium text-slate-700 tabular-nums">
                                {s.lifetimeSalesCount} / {s.freeLimit}
                              </span>
                              <span
                                className={`font-semibold text-[10px] ${
                                  s.quotaStatus === 'limit'
                                    ? 'text-rose-600'
                                    : s.quotaStatus === 'warning'
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {s.quotaStatus === 'limit' ? 'Limit Reached' : `${s.quotaRemaining} free left`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  s.quotaStatus === 'limit'
                                    ? 'bg-rose-500'
                                    : s.quotaStatus === 'warning'
                                    ? 'bg-amber-500'
                                    : 'bg-[#0F4C5C]'
                                }`}
                                style={{ width: `${s.quotaPercent}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Period: <span className="font-semibold text-slate-700">{formatCurrency(s.billed)}</span>
                            </div>
                          </div>
                        </td>

                        {/* 8. Actions */}
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                if (onSelectSalon) onSelectSalon(s, 'overview');
                                else onNavigate('salons_360');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-[#0F4C5C] bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/60 transition-colors cursor-pointer"
                              title="View Complete Salon 360"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Manage</span>
                            </button>

                            <button
                              onClick={() => setExpandedSalonId(isExpanded ? null : s.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title={isExpanded ? 'Hide Details' : 'Show Complete Details'}
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Complete Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                              {/* Metadata Card 1: Identity & System */}
                              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                                <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">
                                  System Identifiers
                                </div>
                                <div className="space-y-1 text-[11px]">
                                  <div>
                                    <span className="text-slate-400">Shop ID:</span>{' '}
                                    <span className="font-mono text-slate-700 select-all">{s.id}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Owner Profile ID:</span>{' '}
                                    <span className="font-mono text-slate-700 select-all">
                                      {s.owner_profile_id || 'Direct Shop'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Registered:</span>{' '}
                                    <span className="text-slate-800 font-medium">
                                      {s.created_at ? formatDateTime(s.created_at) : '—'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Last Updated:</span>{' '}
                                    <span className="text-slate-800">
                                      {s.updated_at ? formatDateTime(s.updated_at) : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Metadata Card 2: Premises & Location */}
                              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                                <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">
                                  Premises &amp; Location
                                </div>
                                <div className="space-y-1 text-[11px]">
                                  <div>
                                    <span className="text-slate-400">Address:</span>{' '}
                                    <span className="text-slate-800 font-medium">{s.address || 'Not specified'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">City / District:</span>{' '}
                                    <span className="text-slate-800 font-medium">{s.city || 'Kalugumalai'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">PIN Code:</span>{' '}
                                    <span className="font-mono text-slate-700">{s.pin_code || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Phone:</span>{' '}
                                    <span className="font-mono text-slate-700">{s.phone || '—'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Metadata Card 3: Tax & Invoicing */}
                              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                                <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">
                                  Tax &amp; Invoicing
                                </div>
                                <div className="space-y-1 text-[11px]">
                                  <div>
                                    <span className="text-slate-400">Invoice Prefix:</span>{' '}
                                    <span className="font-mono font-bold text-slate-800">{s.invoice_prefix || 'INV'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">GSTIN:</span>{' '}
                                    <span className="font-mono text-slate-800 font-medium">{s.gstin || 'Non-GST'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">GST Rate:</span>{' '}
                                    <span className="text-slate-800 font-medium">{s.gst_rate ?? 0}%</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Accent Color:</span>{' '}
                                    <span className="font-mono text-slate-700">{s.accent_color || '#000000'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Metadata Card 4: Ecosystem & Quotas */}
                              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                                <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">
                                  Ecosystem &amp; Quotas
                                </div>
                                <div className="space-y-1 text-[11px]">
                                  <div>
                                    <span className="text-slate-400">Free Sales Limit:</span>{' '}
                                    <span className="font-semibold text-slate-800">{s.freeLimit} sales</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Lifetime Bills:</span>{' '}
                                    <span className="font-mono text-slate-800 font-semibold">{s.lifetimeSalesCount}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Invoiced ({dateRange.label}):</span>{' '}
                                    <span className="font-mono text-slate-800 font-semibold">{formatCurrency(s.billed)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Collected ({dateRange.label}):</span>{' '}
                                    <span className="font-mono text-emerald-700 font-semibold">{formatCurrency(s.collected)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TWO-COLUMN GRID: WORKSPACE NAVIGATION + GEOGRAPHY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Hub Navigation Cards */}
        <div className="panel space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Workspace Navigation
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
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-100/70 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 group-hover:text-[#0F4C5C] transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 group-hover:text-[#0F4C5C] transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F4C5C] group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="panel space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Geographic Distribution
          </h3>

          <div className="space-y-2.5">
            {cityDistribution.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="text-slate-500 text-[11px] tabular-nums">
                    {item.count} salon(s) ({item.percent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#0F4C5C] rounded-full"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
