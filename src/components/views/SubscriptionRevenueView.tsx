import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Search,
  Filter,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Shop, Payment, Bill } from '../../types/database';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { KPICard } from '../common/KPICard';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDateTime, formatDate } from '../../utils/dateUtils';

interface SalonRevenueSummary {
  shop: Shop;
  id: string;
  name: string;
  city: string;
  phone: string;
  totalCollectedMinor: number;
  totalInvoicedMinor: number;
  transactionCount: number;
  paidBillsCount: number;
  latestPaidAt: string | null;
  latestRef: string;
  methodsUsed: string[];
}

interface SubscriptionRevenueViewProps {
  payments: Payment[];
  bills: Bill[];
  shops: Shop[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
}

export const SubscriptionRevenueView: React.FC<SubscriptionRevenueViewProps> = ({
  payments,
  bills,
  shops,
  loading = false,
  onSelectSalon,
}) => {
  // Multi-Attribute Filter States
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [exactDate, setExactDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSalonDrilldown, setSelectedSalonDrilldown] = useState<string | null>(null);

  // Deduplicate shops
  const deduplicatedShops = useMemo(() => {
    const seen = new Set<string>();
    return shops
      .filter((s) => {
        const norm = s.name.trim().toLowerCase();
        if (seen.has(norm)) return false;
        seen.add(norm);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shops]);

  // Shop Map
  const shopMap = useMemo(() => {
    const map = new Map<string, Shop>();
    shops.forEach((s) => {
      map.set(s.id, s);
      if (s.duplicate_ids) {
        s.duplicate_ids.forEach((dupId) => map.set(dupId, s));
      }
    });
    return map;
  }, [shops]);

  // Unique Cities
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.city && s.city.trim()) set.add(s.city.trim());
    });
    return Array.from(set).sort();
  }, [shops]);

  // Unique Payment Methods from real data
  const uniqueMethods = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.method) set.add(p.method);
    });
    return Array.from(set);
  }, [payments]);

  // Handle Preset Click
  const handlePreset = (preset: 'all' | 'today' | 'yesterday' | '7d' | '30d') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setExactDate(now.toISOString().split('T')[0]);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setExactDate(y.toISOString().split('T')[0]);
    } else {
      setExactDate('');
    }
  };

  // TRUE FILTERED PAYMENTS: strictly based on real Supabase records
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Status: completed only
      if (p.status !== 'completed') return false;

      // 2. Salon Filter
      if (salonFilter !== 'all') {
        const selectedShop = shops.find((s) => s.id === salonFilter);
        const allowedIds = selectedShop?.duplicate_ids && selectedShop.duplicate_ids.length > 0
          ? selectedShop.duplicate_ids
          : [salonFilter];
        if (!allowedIds.includes(p.shop_id)) return false;
      }

      // 3. City Filter
      if (cityFilter !== 'all') {
        const shop = shopMap.get(p.shop_id);
        if (!shop || shop.city?.toLowerCase() !== cityFilter.toLowerCase()) return false;
      }

      // 4. Method Filter
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;

      // 5. Exact Date
      if (exactDate) {
        if (!p.paid_at) return false;
        const d = new Date(p.paid_at).toISOString().split('T')[0];
        if (d !== exactDate) return false;
      }

      // 6. Presets
      if (!exactDate && datePreset !== 'all') {
        if (!p.paid_at) return false;
        const t = new Date(p.paid_at).getTime();
        const now = Date.now();
        if (datePreset === '7d' && now - t > 7 * 86400000) return false;
        if (datePreset === '30d' && now - t > 30 * 86400000) return false;
      }

      // 7. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const shop = shopMap.get(p.shop_id);
        const shopMatch = shop ? shop.name.toLowerCase().includes(q) : false;
        const refMatch = (p.reference || '').toLowerCase().includes(q);
        const idMatch = p.id.toLowerCase().includes(q);
        const methodMatch = (p.method || '').toLowerCase().includes(q);
        if (!shopMatch && !refMatch && !idMatch && !methodMatch) return false;
      }

      return true;
    });
  }, [payments, salonFilter, cityFilter, methodFilter, exactDate, datePreset, searchQuery, shopMap]);

  // Aggregate Real Revenue Trajectory by Calendar Date (True Supabase data)
  const dailyRevenueTrend = useMemo(() => {
    const map = new Map<string, { date: string; displayDate: string; revenue: number; txnCount: number }>();

    filteredPayments.forEach((p) => {
      if (!p.paid_at) return;
      const d = new Date(p.paid_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      const entry = map.get(key) || { date: key, displayDate, revenue: 0, txnCount: 0 };
      entry.revenue += Math.round((p.amount_minor || 0) / 100);
      entry.txnCount += 1;
      map.set(key, entry);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredPayments]);

  // Aggregate Real Salon Revenue Contribution (True data only - no random durations)
  const salonRevenueSummaries: SalonRevenueSummary[] = useMemo(() => {
    const map = new Map<string, { totalMinor: number; txnCount: number; latestPaidAt: string | null; latestRef: string; methods: Set<string> }>();

    // Aggregate from filtered payments grouping by primary salon ID
    filteredPayments.forEach((p) => {
      const primaryShop = shopMap.get(p.shop_id);
      const primaryId = primaryShop?.id || p.shop_id;

      const entry = map.get(primaryId) || {
        totalMinor: 0,
        txnCount: 0,
        latestPaidAt: null,
        latestRef: '',
        methods: new Set<string>(),
      };

      entry.totalMinor += p.amount_minor || 0;
      entry.txnCount += 1;
      if (!entry.latestPaidAt || new Date(p.paid_at).getTime() > new Date(entry.latestPaidAt).getTime()) {
        entry.latestPaidAt = p.paid_at;
        entry.latestRef = p.reference || p.id.slice(0, 10);
      }
      if (p.method) entry.methods.add(p.method);
      map.set(primaryId, entry);
    });

    const list: SalonRevenueSummary[] = [];

    // Only include salons that have real payment collections
    map.forEach((data, shopId) => {
      const shop = shopMap.get(shopId);
      if (!shop) return;

      const allowedShopIds = shop.duplicate_ids && shop.duplicate_ids.length > 0 ? shop.duplicate_ids : [shopId];
      const shopBills = bills.filter((b) => allowedShopIds.includes(b.shop_id) && b.status === 'paid');
      const invoicedMinor = shopBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);

      list.push({
        shop,
        id: shop.id,
        name: shop.name,
        city: shop.city || 'Tamil Nadu',
        phone: shop.phone || shop.owner_profile?.phone || '—',
        totalCollectedMinor: data.totalMinor,
        totalInvoicedMinor: invoicedMinor,
        transactionCount: data.txnCount,
        paidBillsCount: shopBills.length,
        latestPaidAt: data.latestPaidAt,
        latestRef: data.latestRef,
        methodsUsed: Array.from(data.methods),
      });
    });

    return list.sort((a, b) => b.totalCollectedMinor - a.totalCollectedMinor);
  }, [filteredPayments, bills, shopMap]);

  // Overall Totals from True Data
  const totalRevenueCollectedMinor = filteredPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);
  const totalCompletedTransactions = filteredPayments.length;
  const activeContributingSalons = salonRevenueSummaries.length;
  const avgTransactionAmountMinor = totalCompletedTransactions > 0 ? Math.round(totalRevenueCollectedMinor / totalCompletedTransactions) : 0;

  // Selected salon's specific payment entries for drilldown
  const drilldownPayments = useMemo(() => {
    if (!selectedSalonDrilldown) return [];
    const selectedShop = shops.find((s) => s.id === selectedSalonDrilldown);
    const allowedIds = selectedShop?.duplicate_ids && selectedShop.duplicate_ids.length > 0
      ? selectedShop.duplicate_ids
      : [selectedSalonDrilldown];
    return filteredPayments.filter((p) => allowedIds.includes(p.shop_id));
  }, [filteredPayments, selectedSalonDrilldown, shops]);

  const resetFilters = () => {
    setSalonFilter('all');
    setCityFilter('all');
    setMethodFilter('all');
    setExactDate('');
    setDatePreset('all');
    setSearchQuery('');
    setSelectedSalonDrilldown(null);
  };

  const isAnyFilterActive =
    salonFilter !== 'all' ||
    cityFilter !== 'all' ||
    methodFilter !== 'all' ||
    exactDate !== '' ||
    datePreset !== 'all' ||
    searchQuery.trim() !== '' ||
    selectedSalonDrilldown !== null;

  // Columns for True Salon Revenue Table
  const salonColumns: Column<SalonRevenueSummary>[] = [
    {
      key: 'name',
      header: 'Salon Business & City',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center shrink-0">
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-neutral-900">{s.name}</div>
            <div className="text-[11px] text-neutral-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>{s.city}</span>
              <span>•</span>
              <span className="font-mono">{s.phone}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'collected',
      header: 'Actual Collected Revenue',
      render: (s) => (
        <div>
          <div className="font-mono font-black text-neutral-900 text-sm">
            {formatCurrency(s.totalCollectedMinor)}
          </div>
          <div className="text-[10px] text-neutral-400">
            {s.transactionCount} completed settlements
          </div>
        </div>
      ),
    },
    {
      key: 'invoiced',
      header: 'Invoiced Bills Volume',
      render: (s) => (
        <div className="font-mono text-xs text-neutral-700">
          <div className="font-bold">{formatCurrency(s.totalInvoicedMinor)}</div>
          <div className="text-[10px] text-neutral-400">{s.paidBillsCount} paid invoices</div>
        </div>
      ),
    },
    {
      key: 'methods',
      header: 'Payment Methods Used',
      render: (s) => (
        <div className="flex items-center gap-1 flex-wrap">
          {s.methodsUsed.map((m) => (
            <span
              key={m}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-300"
            >
              {m}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'latestPaidAt',
      header: 'Latest Settlement',
      render: (s) => (
        <div className="font-mono text-xs text-neutral-600">
          <div>{s.latestPaidAt ? formatDateTime(s.latestPaidAt) : '—'}</div>
          {s.latestRef && (
            <div className="text-[10px] text-neutral-400 truncate max-w-[120px]">{s.latestRef}</div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Drilldown',
      render: (s) => (
        <button
          onClick={() => setSelectedSalonDrilldown(selectedSalonDrilldown === s.id ? null : s.id)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            selectedSalonDrilldown === s.id
              ? 'bg-[#1D4ED8] text-white shadow-xs'
              : 'text-[#1D4ED8] hover:text-[#093540] hover:bg-blue-50'
          }`}
        >
          <span>{selectedSalonDrilldown === s.id ? 'Hide Payments' : 'View Payments'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  // Columns for Individual Transaction Drilldown
  const transactionColumns: Column<Payment>[] = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (p) => (
        <span className="font-mono text-xs font-semibold text-neutral-900">
          {p.id.slice(0, 10)}...
        </span>
      ),
    },
    {
      key: 'amount_minor',
      header: 'Amount Collected',
      render: (p) => (
        <span className="font-mono font-bold text-neutral-900 text-sm">
          {formatCurrency(p.amount_minor)}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (p) => (
        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
          {p.method}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference Note',
      render: (p) => (
        <span className="text-xs text-neutral-700 font-mono">
          {p.reference || 'Salon billing invoice payment'}
        </span>
      ),
    },
    {
      key: 'paid_at',
      header: 'Settled At',
      render: (p) => (
        <span className="font-mono text-xs text-neutral-500">
          {formatDateTime(p.paid_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-[#1D4ED8] border border-blue-100 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Revenue Trend &amp; Collections
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified transactional settlements from database table <code className="text-[#1D4ED8] font-semibold font-mono">public.payments</code>.
              </p>
            </div>
          </div>
        </div>

        <ExportButton
          data={filteredPayments.map((p) => ({
            'Payment ID': p.id,
            'Salon Name': shopMap.get(p.shop_id)?.name || p.shop_id,
            'Amount (INR)': Number(((p.amount_minor || 0) / 100).toFixed(2)),
            Method: p.method,
            Status: p.status,
            Reference: p.reference || '—',
            'Settled Timestamp': formatDateTime(p.paid_at),
          }))}
          filename={`stylefleet_revenue_report_${exactDate || 'all'}`}
          label="Export Excel"
        />
      </div>

      {/* Database Reality Banner */}
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-blue-200/60 bg-blue-50/50 text-xs text-[#1D4ED8]">
        <ShieldCheck className="w-4 h-4 shrink-0 text-[#1D4ED8]" />
        <span className="font-semibold">Verified Supabase Data Only:</span>
        <span className="text-slate-600">
          Rendering exact settlement records from {filteredPayments.length} transactions across {activeContributingSalons} salons. Zero artificial tiers.
        </span>
      </div>

      {/* True KPI Cards - Clean White & Emerald/Teal Modern Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Real Revenue Collected"
          value={formatCurrency(totalRevenueCollectedMinor)}
          subtitle="Completed payment settlements"
          tone="revenue"
          icon={DollarSign}
        />
        <KPICard
          title="Transactions Settled"
          value={formatNumber(totalCompletedTransactions)}
          subtitle="Verified records in public.payments"
          tone="order-good"
          icon={CheckCircle2}
        />
        <KPICard
          title="Contributing Salons"
          value={formatNumber(activeContributingSalons)}
          subtitle="Salons with completed settlements"
          tone="brand"
          icon={Building2}
        />
        <KPICard
          title="Average Settlement"
          value={formatCurrency(avgTransactionAmountMinor)}
          subtitle="Average collected per transaction"
          tone="conversion"
          icon={TrendingUp}
        />
      </div>

      {/* True Revenue Trend Chart */}
      <div className="panel space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Daily Revenue Trend &amp; Collections Velocity
            </h3>
            <p className="text-xs text-slate-500">
              Financial inflow calculated directly from timestamps in public.payments
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {dailyRevenueTrend.length} Settlement Days
          </span>
        </div>

        <div className="h-64 w-full">
          {dailyRevenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#0f172a',
                  }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Collected Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1D4ED8"
                  strokeWidth={2}
                  fill="#1D4ED8"
                  fillOpacity={0.08}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No payment transactions match the active date or filter window.
            </div>
          )}
        </div>
      </div>

      {/* Multi-Attribute Filter Toolbar */}
      <div className="panel space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Revenue Filters (Region, Salon, Method &amp; Exact Date)</span>
          </div>

          {/* Quick Date Presets */}
          <div className="segmented-control">
            {(['all', 'today', 'yesterday', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`segment capitalize ${datePreset === p && !exactDate ? 'active' : ''}`}
              >
                {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. Omni Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Search Reference / ID
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID, reference note..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 2. City Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#1D4ED8]" />
              <span>City / Region</span>
            </label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#1D4ED8] transition-all"
            >
              <option value="all">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Salon Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#1D4ED8]" />
              <span>Filter by Salon</span>
            </label>
            <select
              value={salonFilter}
              onChange={(e) => setSalonFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#1D4ED8] transition-all"
            >
              <option value="all">All Salons ({deduplicatedShops.length})</option>
              {deduplicatedShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city || 'Tamil Nadu'})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Payment Method */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-[#1D4ED8]" />
              <span>Payment Mode</span>
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#1D4ED8] transition-all"
            >
              <option value="all">All Payment Modes</option>
              {uniqueMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Exact Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#1D4ED8]" />
              <span>Exact Date</span>
            </label>
            <input
              type="date"
              value={exactDate}
              onChange={(e) => {
                setExactDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#1D4ED8] transition-all"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100">
            <span className="text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-900">{filteredPayments.length}</span> matching settlements
              {cityFilter !== 'all' && ` in ${cityFilter}`}
              {salonFilter !== 'all' && ` for ${shopMap.get(salonFilter)?.name}`}
            </span>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Salon-Wise Real Revenue Summary Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900">
            Salon Revenue Contribution Breakdown ({salonRevenueSummaries.length} Salons with Settlements)
          </h2>
        </div>

        <DataTable
          columns={salonColumns}
          data={salonRevenueSummaries}
          loading={loading}
          emptyTitle="No revenue records found"
          emptyDescription="No completed payment entries recorded for the active filter scope."
          searchPlaceholder="Filter salons..."
          defaultSortField="collected"
          defaultSortOrder="desc"
        />
      </div>

      {/* Drilldown Section: Specific Payments for Selected Salon */}
      {selectedSalonDrilldown && (
        <div className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-black" />
              <h3 className="text-sm font-bold text-neutral-900">
                Detailed Settlements for {shopMap.get(selectedSalonDrilldown)?.name} ({drilldownPayments.length} Payments)
              </h3>
            </div>
            <button
              onClick={() => setSelectedSalonDrilldown(null)}
              className="text-xs text-neutral-500 hover:text-black font-semibold"
            >
              Close Drilldown
            </button>
          </div>

          <DataTable
            columns={transactionColumns}
            data={drilldownPayments}
            loading={loading}
            emptyTitle="No transactions found"
            emptyDescription="No transactions found for this salon in the active date scope."
            searchPlaceholder="Filter transaction entries..."
            defaultSortField="paid_at"
            defaultSortOrder="desc"
          />
        </div>
      )}
    </div>
  );
};
