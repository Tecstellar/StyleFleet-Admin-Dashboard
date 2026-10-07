import React, { useMemo, useState } from 'react';
import { CreditCard, Filter, X, Calendar, Building2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { UnavailableBanner } from '../common/UnavailableBanner';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';
import { Payment, Shop } from '../../types/database';

interface PurchasesViewProps {
  payments: Payment[];
  shops?: Shop[];
  loading?: boolean;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ payments, shops = [], loading = false }) => {
  const { dateRange } = useDateFilter();
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const [exactDate, setExactDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Deduplicate shops for dropdown selector
  const deduplicatedShops = useMemo(() => {
    const seen = new Set<string>();
    return shops.filter(s => {
      const norm = s.name.trim().toLowerCase();
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [shops]);

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

  // Base range filter
  const baseFiltered = useMemo(() => {
    return filterByDateRange(payments, 'paid_at', dateRange);
  }, [payments, dateRange]);

  const uniqueMethods = useMemo(() => {
    const set = new Set<string>();
    payments.forEach(p => {
      if (p.method) set.add(p.method);
    });
    return Array.from(set);
  }, [payments]);

  // Combined Multi-Attribute Filtering
  const filteredPayments = useMemo(() => {
    return baseFiltered.filter(p => {
      // 1. Salon-wise filter
      if (salonFilter !== 'all') {
        const matchesShopId = p.shop_id === salonFilter;
        const matchesShopName = p.shop?.name?.toLowerCase() === salonFilter.toLowerCase();
        if (!matchesShopId && !matchesShopName) return false;
      }

      // 2. Exact single-date filter
      if (exactDate) {
        if (!p.paid_at) return false;
        const pDate = new Date(p.paid_at).toISOString().split('T')[0];
        if (pDate !== exactDate) return false;
      }

      // 3. Date Presets (7d, 30d) if no exact single date set
      if (!exactDate && datePreset !== 'all') {
        if (!p.paid_at) return false;
        const pTime = new Date(p.paid_at).getTime();
        const now = Date.now();
        if (datePreset === '7d' && now - pTime > 7 * 86400000) return false;
        if (datePreset === '30d' && now - pTime > 30 * 86400000) return false;
      }

      // 4. Payment Method
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;

      // 5. Status
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // 6. Omni-search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = p.id.toLowerCase().includes(q);
        const shopMatch = (p.shop?.name || p.shop_id || '').toLowerCase().includes(q);
        const refMatch = (p.reference || '').toLowerCase().includes(q);
        const billMatch = (p.bill?.invoice_number || '').toLowerCase().includes(q);
        if (!idMatch && !shopMatch && !refMatch && !billMatch) return false;
      }

      return true;
    });
  }, [baseFiltered, salonFilter, exactDate, datePreset, methodFilter, statusFilter, searchQuery]);

  const totalAmountMinor = filteredPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);
  const completedCount = filteredPayments.filter(p => p.status === 'completed').length;
  const pendingCount = filteredPayments.filter(p => p.status === 'pending').length;

  const resetAllFilters = () => {
    setSalonFilter('all');
    setExactDate('');
    setDatePreset('all');
    setMethodFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const isAnyFilterActive =
    salonFilter !== 'all' ||
    exactDate !== '' ||
    datePreset !== 'all' ||
    methodFilter !== 'all' ||
    statusFilter !== 'all' ||
    searchQuery.trim() !== '';

  const columns: Column<Payment>[] = [
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
      key: 'shop',
      header: 'Salon Business',
      render: (p) => (
        <span className="font-semibold text-neutral-900">
          {p.shop?.name || p.shop_id}
        </span>
      ),
    },
    {
      key: 'bill',
      header: 'Invoice Reference',
      render: (p) => (
        <div>
          <div className="font-mono text-xs text-neutral-800 font-medium">
            {p.bill?.invoice_number || 'Direct Payment'}
          </div>
          {p.reference && (
            <div className="text-[11px] text-neutral-500 truncate max-w-xs">{p.reference}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount_minor',
      header: 'Amount (INR)',
      render: (p) => (
        <span className="font-mono font-bold text-neutral-900">
          {formatCurrency(p.amount_minor)}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Payment Method',
      render: (p) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-neutral-100 text-neutral-900 border border-neutral-200">
          {p.method}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'paid_at',
      header: 'Timestamp',
      render: (p) => (
        <span className="font-mono text-xs text-neutral-600">
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
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-black text-white shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                Purchases &amp; Transactions
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Verified financial transactions recorded in Supabase table <code className="text-black font-semibold font-mono">public.payments</code>.
              </p>
            </div>
          </div>
        </div>

        <ExportButton
          data={filteredPayments}
          filename="stylefleet_payments"
          columns={[
            { key: 'id', label: 'Payment ID' },
            { key: 'amount_minor', label: 'Amount Minor (Paise)' },
            { key: 'method', label: 'Method' },
            { key: 'status', label: 'Status' },
            { key: 'reference', label: 'Reference' },
            { key: 'paid_at', label: 'Paid At' },
          ]}
        />
      </div>

      {/* Honest Database Scope Banner */}
      <UnavailableBanner
        title="SaaS Platform Subscription Purchases Table Not Found"
        sourceTable="public.purchases / public.subscriptions"
        message="StyleFleet SaaS tier subscription purchases (App Store / Google Play / Razorpay SaaS) are not stored in the connected Supabase database. Displaying verified salon customer payments and billing settlements recorded in public.payments."
      />

      {/* Financial Snapshot - High-Contrast KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-lg border border-neutral-200 border-l-3 border-l-[#1c1f26] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Collected Total</span>
            <span className="font-mono font-bold text-[#1c1f26] text-[11px]">{filteredPayments.length} txns</span>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
            {formatCurrency(totalAmountMinor)}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">
            {exactDate ? `Exact date: ${exactDate}` : 'Filtered period total'}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-neutral-200 border-l-3 border-l-[#1c1f26] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Completed Status</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
            {completedCount}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Settled without errors</span>
        </div>

        <div className="p-3 rounded-lg border border-neutral-200 border-l-3 border-l-[#1c1f26] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Pending / Other</span>
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
            {pendingCount}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Processing or unpaid entries</span>
        </div>
      </div>

      {/* Multi-Attribute Filter Toolbar */}
      <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
            <Filter className="w-4 h-4 text-black" />
            <span>Multi-Attribute Drilldown Filters</span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-neutral-400 mr-1">Presets:</span>
            {(['all', 'today', 'yesterday', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors capitalize ${
                  datePreset === p && !exactDate
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. Omni Search */}
          <div className="md:col-span-1">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ID, salon, invoice ref..."
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all"
            />
          </div>

          {/* 2. Salon Selector */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-neutral-400" />
              <span>Salon Business</span>
            </label>
            <select
              value={salonFilter}
              onChange={(e) => setSalonFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Salons ({deduplicatedShops.length})</option>
              {deduplicatedShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Exact Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-neutral-400" />
              <span>Exact Date</span>
            </label>
            <input
              type="date"
              value={exactDate}
              onChange={(e) => {
                setExactDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            />
          </div>

          {/* 4. Payment Method */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Method
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Methods</option>
              {uniqueMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Status */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Active Filters Reset Bar */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-neutral-500 font-medium">
              Showing <span className="font-bold text-black">{filteredPayments.length}</span> matching transactions
            </span>
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-neutral-100 text-black hover:bg-neutral-200 font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <DataTable
        columns={columns}
        data={filteredPayments}
        loading={loading}
        searchPlaceholder="Filter listed payments..."
        emptyTitle="No Financial Transactions Found"
        emptyDescription="No payment entries recorded in public.payments match your active filter criteria."
      />
    </div>
  );
};
