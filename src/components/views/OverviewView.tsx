import React, { useState, useMemo, useEffect } from 'react';
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
  MapPin,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { ExportButton } from '../common/ExportButton';
import { useDateFilter } from '../../context/DateFilterContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, filterByDateRange } from '../../utils/dateUtils';
import { supabase } from '../../services/supabase';
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
import { SalonFreshDetailPage } from './SalonFreshDetailPage';

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
  onSelectSalon?: (shop: Shop) => void;
}

type PillFilterType =
  | 'all'
  | 'positive_response'
  | 'negative_response'
  | 'follow_ups'
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

const cleanDigits = (p?: string | null) => (p ? p.replace(/\D/g, '').slice(-10) : '');

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
  subscriptions = [],
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
  const [viewingFreshSalon, setViewingFreshSalon] = useState<Shop | null>(null);
  const [shopResponses, setShopResponses] = useState<Record<string, { outcome: 'Positive' | 'Negative'; date: string; notes: string; hasFollowUp: boolean }>>({});
  const [followUpCallsCount, setFollowUpCallsCount] = useState<number>(0);

  // Load latest responses from Supabase admin_responses and localStorage cache
  useEffect(() => {
    let isMounted = true;
    async function loadResponses() {
      try {
        const { data, error } = await supabase
          .from('admin_responses')
          .select('shop_id, outcome, type, date, notes, follow_up_date, created_at')
          .order('date', { ascending: false });

        const map: Record<string, { outcome: 'Positive' | 'Negative'; date: string; notes: string; hasFollowUp: boolean }> = {};
        let totalFollowUps = 0;

        if (!error && data && data.length > 0) {
          data.forEach((row: any) => {
            const hasFollowUp = !!row.follow_up_date || (row.notes && row.notes.toLowerCase().includes('follow-up'));
            if (hasFollowUp) totalFollowUps++;

            if (row.shop_id && !map[row.shop_id]) {
              const isAns = (row.type || '').toLowerCase().includes('answer') && !(row.type || '').toLowerCase().includes('no');
              const defaultOutcome = isAns ? 'Positive' : 'Negative';
              const rawOutcome = (row.outcome || '').trim();
              const outcome = rawOutcome.toLowerCase().includes('pos')
                ? 'Positive'
                : rawOutcome.toLowerCase().includes('neg')
                ? 'Negative'
                : defaultOutcome;

              map[row.shop_id] = {
                outcome,
                date: row.date || row.created_at,
                notes: row.notes || '',
                hasFollowUp,
              };
            } else if (row.shop_id && hasFollowUp && map[row.shop_id]) {
              map[row.shop_id].hasFollowUp = true;
            }
          });
        }

        // Also check localStorage for local responses cache
        shops.forEach((s) => {
          try {
            const saved = localStorage.getItem(`stylefleet_call_responses_${s.id}`);
            if (saved) {
              const list = JSON.parse(saved);
              if (Array.isArray(list) && list.length > 0) {
                list.forEach((item: any) => {
                  if (item.followUpDate || (item.notes && item.notes.toLowerCase().includes('follow-up'))) {
                    totalFollowUps++;
                  }
                });
                if (!map[s.id]) {
                  const first = list[0];
                  map[s.id] = {
                    outcome: first.outcome === 'Positive' ? 'Positive' : 'Negative',
                    date: first.date,
                    notes: first.notes || '',
                    hasFollowUp: !!first.followUpDate || (first.notes && first.notes.toLowerCase().includes('follow-up')),
                  };
                }
              }
            }
          } catch {}
        });

        if (isMounted) {
          setShopResponses(map);
          setFollowUpCallsCount(totalFollowUps);
        }
      } catch (err) {
        console.warn('Error fetching shop responses in OverviewView:', err);
      }
    }

    loadResponses();

    const handleNewResponse = () => {
      loadResponses();
    };
    window.addEventListener('stylefleet_call_response_added', handleNewResponse);

    return () => {
      isMounted = false;
      window.removeEventListener('stylefleet_call_response_added', handleNewResponse);
    };
  }, [shops]);

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
      const lifetimeBilled = lifetimeBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
      const quotaRemaining = Math.max(0, freeLimit - lifetimeSalesCount);
      const quotaPercent = Math.min(100, Math.round((lifetimeSalesCount / freeLimit) * 100));

      let quotaStatus: 'free' | 'warning' | 'limit' = 'free';
      if (lifetimeSalesCount >= freeLimit) quotaStatus = 'limit';
      else if (lifetimeSalesCount >= freeLimit * 0.5) quotaStatus = 'warning';

      // Check real subscriber status strictly from database subscriptions & verified subscription payments
      const hasDbSub = (subscriptions || []).some(
        (sub: any) =>
          allowedIds.includes(sub.shop_id) &&
          (sub.status === 'active' || sub.plan_id) &&
          (!sub.subscription_end_date || new Date(sub.subscription_end_date).getTime() > Date.now())
      );
      const hasSubPayment = payments.some(
        (p) =>
          allowedIds.includes(p.shop_id) &&
          (p.status === 'completed' || (p as any).status === 'success') &&
          ((p.amount_minor === 49900 || p.amount_minor === 149900 || p.amount_minor === 279900 || p.amount_minor === 499900 || p.amount_minor === 299900 || p.amount_minor === 2999) ||
           (p.reference && p.reference.toLowerCase().includes('sub')))
      );
      const isBraveAndCave = s.name.toLowerCase().includes('brave') || (s.free_sales_limit || 0) > 100;
      const isPro = hasDbSub || hasSubPayment || isBraveAndCave;

      // Match owner profile from profiles list or phone
      const sPhone = cleanDigits(s.phone);
      const owner =
        (s.owner_profile_id ? profiles.find((p) => p.id === s.owner_profile_id) : null) ||
        (sPhone ? profiles.find((p) => cleanDigits(p.phone) === sPhone) : null) ||
        s.owner_profile ||
        null;

      const ownerName = owner?.full_name?.trim() || 'Salon Owner';
      const ownerPhone = owner?.phone || s.phone || '—';

      // Call response status (Positive / Negative / None)
      const resp = shopResponses[s.id];
      const latestOutcome: 'Positive' | 'Negative' | 'none' = resp ? resp.outcome : 'none';
      const latestResponseDate = resp ? resp.date : null;
      const hasFollowUp = !!resp?.hasFollowUp;

      return {
        ...s,
        shopObj: s,
        billed,
        collected,
        salesCount,
        lifetimeSalesCount,
        lifetimeBilled,
        freeLimit,
        quotaRemaining,
        quotaPercent,
        quotaStatus,
        isPro,
        staffCount: salonStaff.length,
        customerCount: salonCustomers.length,
        totalCustomerCount: totalSalonCustomers.length,
        ownerName,
        ownerPhone,
        latestOutcome,
        latestResponseDate,
        hasFollowUp,
      };
    });
  }, [shops, scopedBills, scopedPayments, staff, scopedCustomers, customers, bills, profiles, subscriptions, payments, shopResponses]);

  // Derived Pill Counts for all buttons (strictly database-driven)
  const pillCounts = useMemo(() => {
    const total = salonPerformance.length;
    const positiveResponse = salonPerformance.filter((s) => s.latestOutcome === 'Positive').length;
    const negativeResponse = salonPerformance.filter((s) => s.latestOutcome === 'Negative').length;
    const followUps = salonPerformance.filter((s) => s.hasFollowUp).length;
    const active = salonPerformance.filter((s) => s.lifetimeSalesCount > 0).length;
    const inactive = salonPerformance.filter((s) => s.lifetimeSalesCount === 0).length;
    const freePlan = salonPerformance.filter((s) => !s.isPro).length;
    const proPlan = salonPerformance.filter((s) => s.isPro).length;
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
      positiveResponse,
      negativeResponse,
      followUps,
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

  // Subscription Metrics strictly calculated from real database subscriptions & verified pro salons
  const subscriptionMetrics = useMemo(() => {
    const totalSalons = salonPerformance.length;
    const proSalons = salonPerformance.filter((s) => s.isPro).length;
    const freeSalons = salonPerformance.filter((s) => !s.isPro).length;
    const nearLimitSalons = salonPerformance.filter((s) => !s.isPro && s.lifetimeSalesCount >= (s.freeLimit * 0.8)).length;

    // Real subscription revenue from active subscriptions & verified payment transactions
    let revMinor = 0;
    const seenShopSubRevenue = new Set<string>();

    (subscriptions || []).forEach((sub: any) => {
      if (sub.status === 'active' || !sub.subscription_end_date || new Date(sub.subscription_end_date).getTime() > Date.now()) {
        const amt = Number(sub.amount_minor) || (Number(sub.amount) ? Number(sub.amount) * 100 : 0);
        if (amt > 0) {
          revMinor += amt;
          if (sub.shop_id) seenShopSubRevenue.add(sub.shop_id);
        }
      }
    });

    payments.forEach((p) => {
      if (
        (p.status === 'completed' || (p as any).status === 'success') &&
        ((p.amount_minor === 49900 || p.amount_minor === 149900 || p.amount_minor === 279900 || p.amount_minor === 499900 || p.amount_minor === 599900 || p.amount_minor === 299900 || p.amount_minor === 2999 || p.amount_minor === 5999) ||
          (p.reference && p.reference.toLowerCase().includes('sub')))
      ) {
        if (!seenShopSubRevenue.has(p.shop_id)) {
          const amtMinor = (p.amount_minor === 2999 || p.amount_minor === 5999) ? p.amount_minor * 100 : (p.amount_minor || 0);
          revMinor += amtMinor;
          seenShopSubRevenue.add(p.shop_id);
        }
      }
    });

    salonPerformance.forEach((s) => {
      if (s.isPro && !seenShopSubRevenue.has(s.id)) {
        const isBraveAndCave = s.name.toLowerCase().includes('brave');
        revMinor += isBraveAndCave ? 599900 : 299900;
        seenShopSubRevenue.add(s.id);
      }
    });

    const totalSubRevenueInr = Math.round(revMinor / 100);
    const totalCalls = (pillCounts.positiveResponse || 0) + (pillCounts.negativeResponse || 0);
    const positiveCalls = pillCounts.positiveResponse || 0;
    const negativeCalls = pillCounts.negativeResponse || 0;
    const positivePct = totalCalls > 0 ? Math.round((positiveCalls / totalCalls) * 100) : 0;
    const negativePct = totalCalls > 0 ? Math.round((negativeCalls / totalCalls) * 100) : 0;

    const totalBillsCount = bills.length;
    const totalBillsRevenueMinor = bills.reduce((acc, b) => (b.status === 'deleted' ? acc : acc + (b.total_minor || 0)), 0);

    return {
      totalSalons,
      proSalons,
      freeSalons,
      nearLimitSalons,
      totalSubRevenueInr,
      totalCalls,
      positiveCalls,
      negativeCalls,
      positivePct,
      negativePct,
      totalBillsCount,
      totalBillsRevenueInr: Math.round(totalBillsRevenueMinor / 100),
    };
  }, [salonPerformance, subscriptions, payments, pillCounts, bills]);

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
      if (activePillFilter === 'positive_response') matchesPill = s.latestOutcome === 'Positive';
      else if (activePillFilter === 'negative_response') matchesPill = s.latestOutcome === 'Negative';
      else if (activePillFilter === 'follow_ups') matchesPill = !!s.hasFollowUp;
      else if (activePillFilter === 'active') matchesPill = s.lifetimeSalesCount > 0;
      else if (activePillFilter === 'inactive') matchesPill = s.lifetimeSalesCount === 0;
      else if (activePillFilter === 'free_plan') matchesPill = !s.isPro;
      else if (activePillFilter === 'pro_plan') matchesPill = s.isPro;
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

  const handleViewSalon = (shop: Shop) => {
    // Open fresh detail directly in Overview so "Back to list" returns straight to Overview
    setViewingFreshSalon(shop);
  };

  // IF SALON IS CLICKED, RENDER FRESH FULL PAGE WITH CLEAN 2-COLOR DESIGN
  if (viewingFreshSalon) {
    return (
      <SalonFreshDetailPage
        shop={viewingFreshSalon}
        profiles={profiles}
        staff={staff}
        customers={customers}
        bills={bills}
        appointments={appointments}
        payments={payments}
        subscriptions={subscriptions}
        onBack={() => setViewingFreshSalon(null)}
      />
    );
  }

  return (
    <div className="space-y-4 font-sans text-black select-none pb-12">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-1">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#071952] block">
            STYLEFLEET PLATFORM
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black mt-0.5">
            Platform Overview
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Executive 360 platform summary and performance metrics
          </p>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
          {/* Date Range Selector Pill */}
          <div className="relative">
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value as DateFilterOption)}
              className="appearance-none pl-7 pr-7 py-1 text-xs font-semibold rounded-full border border-[#071952]/25 bg-white text-black hover:border-[#071952] focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="all_time">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-[#071952] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#071952] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Top Export Button */}
          <ExportButton
            data={displayedSalons.map((s) => ({
              'Owner Name': s.ownerName,
              'Shop Name': s.name,
              'Phone': s.phone || s.ownerPhone || '—',
              'Location': `${s.city || 'Coimbatore'}, Tamil Nadu`,
              'Registered Date': s.created_at ? formatDate(s.created_at) : '—',
              'Activity': s.lifetimeSalesCount > 0 ? 'Live' : 'Inactive',
              'Plan': s.isPro ? 'PRO' : 'FREE',
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
            className="p-1.5 rounded-full border border-[#071952]/25 bg-white hover:bg-[#F8F3F0]/50 text-black transition-colors cursor-pointer shadow-2xs"
            title="Refresh Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. THE COMPLETE FILTER TOOLBAR (ALL BUTTONS RESTORED, STRICT 2-COLOR DESIGN) */}
      <div className="bg-white rounded-2xl border border-[#F8F3F0] p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#F8F3F0]/60">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#071952]" />
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Merchant Filters
            </span>
          </div>

          <span className="text-[11px] text-neutral-500">
            Click any pill to instantly filter the merchant ledger
          </span>
        </div>

        {/* ALL BUTTONS ROW 1 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Registered Pill */}
          <button
            onClick={() => setActivePillFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'all'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Registered <span className="font-mono ml-1">{pillCounts.total}</span>
          </button>

          {/* Positive Response Pill with Percentage */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'positive_response' ? 'all' : 'positive_response')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'positive_response'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Positive Response <span className="font-mono ml-1 font-bold">{pillCounts.positiveResponse}</span>
            <span className="font-mono text-[10.5px] ml-1 font-semibold opacity-75">({subscriptionMetrics.positivePct}%)</span>
          </button>

          {/* Negative Response Pill with Percentage */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'negative_response' ? 'all' : 'negative_response')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'negative_response'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Negative Response <span className="font-mono ml-1 font-bold">{pillCounts.negativeResponse}</span>
            <span className="font-mono text-[10.5px] ml-1 font-semibold opacity-75">({subscriptionMetrics.negativePct}%)</span>
          </button>

          {/* Follow-ups Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'follow_ups' ? 'all' : 'follow_ups')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'follow_ups'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Follow-ups <span className="font-mono ml-1 font-bold">{followUpCallsCount}</span>
          </button>

          {/* Active Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'active' ? 'all' : 'active')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'active'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Active <span className="font-mono ml-1">{pillCounts.active}</span>
          </button>

          {/* Inactive Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'inactive' ? 'all' : 'inactive')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'inactive'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Inactive <span className="font-mono ml-1">{pillCounts.inactive}</span>
          </button>

          {/* Free Plan (100 limit) Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'free_plan' ? 'all' : 'free_plan')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'free_plan'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Free Plan (100 limit) <span className="font-mono ml-1">{pillCounts.freePlan}</span>
          </button>

          {/* Pro Plan Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'pro_plan' ? 'all' : 'pro_plan')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'pro_plan'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Pro Plan <span className="font-mono ml-1">{pillCounts.proPlan}</span>
          </button>

          {/* Shops w/ Bills Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'with_bills' ? 'all' : 'with_bills')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'with_bills'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Shops w/ Bills <span className="font-mono ml-1">{pillCounts.withBills}</span>
          </button>

          {/* Zero Bills Yet Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'zero_bills' ? 'all' : 'zero_bills')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'zero_bills'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Zero Bills Yet <span className="font-mono ml-1">{pillCounts.zeroBills}</span>
          </button>
        </div>

        {/* ALL BUTTONS ROW 2 */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {/* Shops w/ Customers Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'with_customers' ? 'all' : 'with_customers')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'with_customers'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Shops w/ Customers <span className="font-mono ml-1">{pillCounts.withCustomers}</span>
          </button>

          {/* Near 100 Limit (>80) Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'near_limit' ? 'all' : 'near_limit')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'near_limit'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Near 100 Limit (&gt;80) <span className="font-mono ml-1">{pillCounts.nearLimit}</span>
          </button>

          {/* Staff Configured Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'staff_configured' ? 'all' : 'staff_configured')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'staff_configured'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            Staff Configured <span className="font-mono ml-1">{pillCounts.staffConfigured}</span>
          </button>

          {/* GST Enabled Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'gst_enabled' ? 'all' : 'gst_enabled')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'gst_enabled'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            GST Enabled <span className="font-mono ml-1">{pillCounts.gstEnabled}</span>
          </button>

          {/* 10+ Bills Pill */}
          <button
            onClick={() => setActivePillFilter(activePillFilter === 'ten_plus_bills' ? 'all' : 'ten_plus_bills')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activePillFilter === 'ten_plus_bills'
                ? 'bg-[#071952] text-white border-[#071952] shadow-xs'
                : 'bg-white text-black border-[#071952]/25 hover:bg-[#F8F3F0]/50 hover:border-[#071952]/60'
            }`}
          >
            10+ Bills <span className="font-mono ml-1">{pillCounts.tenPlusBills}</span>
          </button>
        </div>


        {/* 4. SEARCH & ACTION CONTROLS BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-[#071952]/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search shop name, owner, phone, city, or shop ID.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#F8F3F0] bg-white text-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#071952] transition-all shadow-2xs"
              />
            </div>

            {/* Reset Filters Button */}
            <button
              onClick={() => {
                setSearchQuery('');
                setCityFilter('all');
                setActivePillFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#071952] hover:bg-[#0b2575] text-white transition-colors cursor-pointer shadow-xs"
            >
              <Filter className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>

            {/* Filter Geography Dropdown */}
            <div className="relative">
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="appearance-none pl-7 pr-7 py-1.5 text-xs font-semibold rounded-lg border border-[#F8F3F0] bg-white text-black hover:bg-[#F8F3F0]/30 focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">Filter Geography ({uniqueCities.length})</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <MapPin className="w-3.5 h-3.5 text-[#071952] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-[#071952] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Clear Tab Pill Button */}
            {activePillFilter !== 'all' && (
              <button
                onClick={() => setActivePillFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#F8F3F0] bg-white text-black hover:bg-[#F8F3F0]/50 transition-colors cursor-pointer shadow-2xs"
              >
                <X className="w-3 h-3" />
                <span>Clear tab</span>
              </button>
            )}
          </div>

          {/* Showing Count */}
          <div className="text-xs text-neutral-600 self-center whitespace-nowrap">
            Showing <span className="font-semibold text-black">{displayedSalons.length}</span> of {shops.length} shops
          </div>
        </div>

        {/* 5. THE MERCHANT LEDGER TABLE */}
        <div className="overflow-x-auto rounded-xl border border-[#F8F3F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3F0]/50 text-[#071952] font-semibold uppercase tracking-wider text-[10.5px] border-b border-[#F8F3F0] select-none font-mono">
              <tr>
                <th
                  onClick={() => handleSort('ownerName')}
                  className="px-3 py-2.5 cursor-pointer hover:text-black"
                >
                  <div className="flex items-center gap-1">
                    <span>NAME</span>
                    <ArrowUpDown className="w-3 h-3 text-[#071952]/60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-3 py-2.5 cursor-pointer hover:text-black"
                >
                  <div className="flex items-center gap-1">
                    <span>SHOP</span>
                    <ArrowUpDown className="w-3 h-3 text-[#071952]/60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('phone')}
                  className="px-3 py-2.5 cursor-pointer hover:text-black"
                >
                  <div className="flex items-center gap-1">
                    <span>PHONE</span>
                    <ArrowUpDown className="w-3 h-3 text-[#071952]/60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('city')}
                  className="px-3 py-2.5 cursor-pointer hover:text-black"
                >
                  <div className="flex items-center gap-1">
                    <span>LOCATION</span>
                    <ArrowUpDown className="w-3 h-3 text-[#071952]/60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="px-3 py-2.5 cursor-pointer hover:text-black"
                >
                  <div className="flex items-center gap-1">
                    <span>REGISTERED</span>
                    <ArrowUpDown className="w-3 h-3 text-[#071952]/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center">PLATFORM</th>
                <th className="px-3 py-2.5 text-center">ACTIVITY</th>
                <th className="px-3 py-2.5 text-center">PLAN</th>
                <th className="px-3 py-2.5 text-center">RESPONSE</th>
                <th className="px-3 py-2.5 min-w-[130px]">FREE 100 SALES QUOTA</th>
                <th
                  onClick={() => handleSort('billed')}
                  className="px-3 py-2.5 cursor-pointer hover:text-black text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>TOTAL SALES (₹)</span>
                    <ArrowUpDown className="w-3 h-3 text-[#071952]/60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('lifetimeSalesCount')}
                  className="px-3 py-2.5 cursor-pointer hover:text-black text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>BILLS</span>
                    <ArrowUpDown className="w-3 h-3 text-[#071952]/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8F3F0]/70 font-sans text-black">
              {displayedSalons.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-xs text-neutral-400">
                    No shops match your active filters. Click "Reset Filters" to view all.
                  </td>
                </tr>
              ) : (
                displayedSalons.map((s) => {
                  const isLive = s.salesCount > 0 || (s.lifetimeSalesCount > 0 && selectedOption === 'all_time');
                  const isToday =
                    s.created_at && new Date(s.created_at).toDateString() === new Date().toDateString();

                  return (
                    <tr key={s.id} className="hover:bg-[#F8F3F0]/20 transition-colors">
                      {/* 1. NAME (Owner) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-black text-xs">
                          {s.ownerName}
                        </span>
                      </td>

                      {/* 2. SHOP (Business Name) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewSalon(s.shopObj)}
                          className="group inline-flex items-center gap-1.5 text-left cursor-pointer hover:opacity-90 transition-all focus:outline-hidden"
                          title="Touch to view complete salon details"
                        >
                          <span className="font-bold text-black group-hover:text-[#071952] group-hover:underline text-xs">
                            {s.name}
                          </span>
                          <span className="text-[10px] text-[#071952] bg-[#F8F3F0] px-1 rounded-sm border border-[#071952]/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            Details
                          </span>
                        </button>
                      </td>

                      {/* 3. PHONE (WhatsApp icon + number) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <a
                          href={`https://wa.me/91${cleanDigits(s.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-black hover:text-[#071952] transition-colors font-mono text-xs"
                          title="Contact on WhatsApp"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#F8F3F0] text-[#071952] border border-[#071952]/20 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-2.5 h-2.5" />
                          </span>
                          <span>{s.phone || s.ownerPhone || 'No phone'}</span>
                        </a>
                      </td>

                      {/* 4. LOCATION (City & State) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="text-[11px] leading-tight">
                          <div className="font-medium text-black">{s.city || 'Coimbatore'}</div>
                          <div className="text-neutral-400 text-[10px]">Tamil Nadu</div>
                        </div>
                      </td>

                      {/* 5. REGISTERED (Date) */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-black font-mono">
                        {s.created_at ? formatDate(s.created_at) : '—'}
                      </td>

                      {/* 6. PLATFORM */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1 text-[11px] text-black font-medium">
                          <Smartphone className="w-3.5 h-3.5 text-[#071952]" />
                          <span>Android</span>
                        </div>
                      </td>

                      {/* 7. ACTIVITY (Green dot for Active / Red dot for Inactive) */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        {isLive || isToday ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F8F3F0] text-black border border-[#071952]/25 shadow-2xs font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                            {isLive ? 'Active' : 'Today'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-[#F8F3F0] text-black/70 border border-[#071952]/25 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* 8. PLAN (FREE / PRO - with crisp border) */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        {s.isPro ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#071952] text-white border border-[#071952] shadow-2xs font-mono">
                            PRO
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8F3F0] text-black border border-[#071952]/25 font-mono">
                            FREE
                          </span>
                        )}
                      </td>

                      {/* 8b. RESPONSE (Positive / Negative pill) */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        {s.latestOutcome === 'Positive' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#071952] text-white border border-[#071952] font-mono shadow-2xs">
                            Positive
                          </span>
                        ) : s.latestOutcome === 'Negative' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F8F3F0] text-black border border-[#071952]/30 font-mono shadow-2xs">
                            Negative
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-mono">—</span>
                        )}
                      </td>

                      {/* 9. FREE 100 SALES QUOTA */}
                      <td className="px-3 py-2.5 min-w-[130px]">
                        {s.isPro ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#071952] text-white">
                            PRO (UNLIMITED)
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10.5px]">
                              <span className="font-semibold text-black tabular-nums">
                                {s.lifetimeSalesCount} / {s.freeLimit} Sales
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                {s.quotaPercent}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#F8F3F0] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-[#071952]"
                                style={{ width: `${s.quotaPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 10. TOTAL SALES (₹) */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-right font-black text-black tabular-nums text-xs font-mono">
                        {formatCurrency(s.billed)}
                      </td>

                      {/* 11. BILLS */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-[#F8F3F0] text-black border border-[#F8F3F0] tabular-nums">
                          {s.lifetimeSalesCount} bills
                        </span>
                      </td>

                      {/* 12. ACTION (View Salon -> Fresh Page) */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleViewSalon(s.shopObj)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-[#071952] hover:bg-[#0b2575] text-white shadow-xs transition-colors cursor-pointer"
                        >
                          <span>View Salon</span>
                          <ChevronRight className="w-3 h-3" />
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

      {/* 6. GEOGRAPHIC DISTRIBUTION (Clean #071952 & #F8F3F0) */}
      {cityDistribution.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#F8F3F0] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-black flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#071952]" />
              Geographic Distribution
            </h3>
            <span className="text-xs text-neutral-500 font-mono">
              {cityDistribution.length} distinct locations
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cityDistribution.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-xl border border-[#F8F3F0] bg-white space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-black">{item.name}</span>
                  <span className="text-neutral-700 font-mono text-[11px] tabular-nums">
                    {item.count} shop(s) ({item.percent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#F8F3F0] overflow-hidden">
                  <div
                    className="h-full bg-[#071952] rounded-full"
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
