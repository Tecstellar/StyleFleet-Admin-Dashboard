import React, { useMemo, useState } from 'react';
import {
  Receipt,
  Calendar,
  Building2,
  Search,
  Filter,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Bill, Shop, Payment } from '../../types/database';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { KPICard } from '../common/KPICard';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDateTime, formatDate } from '../../utils/dateUtils';

interface DailyBillsViewProps {
  bills: Bill[];
  shops: Shop[];
  payments?: Payment[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
}

interface DailyMatrixRow {
  rawDate: string; // YYYY-MM-DD
  displayDate: string;
  billsCount: number;
  totalAmountMinor: number;
  avgBillMinor: number;
  paidCount: number;
  pendingCount: number;
  topSalonName: string;
  topSalonBills: number;
}

export const DailyBillsView: React.FC<DailyBillsViewProps> = ({
  bills,
  shops,
  payments = [],
  loading = false,
  onSelectSalon,
}) => {
  // Multi-Attribute Filter States (defaults to today)
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const [exactDate, setExactDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'invoices'>('matrix');

  // Deduplicated shops
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
    shops.forEach((s) => map.set(s.id, s));
    return map;
  }, [shops]);

  // Payment mapping by bill id
  const paymentByBillId = useMemo(() => {
    const map = new Map<string, Payment>();
    payments.forEach((p) => {
      if (p.bill_id) map.set(p.bill_id, p);
    });
    return map;
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

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // 1. Salon filter
      if (salonFilter !== 'all') {
        const selectedShop = shops.find((s) => s.id === salonFilter);
        const allowedIds = selectedShop?.duplicate_ids ? selectedShop.duplicate_ids : [salonFilter];
        if (!allowedIds.includes(b.shop_id)) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'all' && (b.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 3. Exact Date
      const dateStr = b.issued_at || b.created_at;
      if (exactDate) {
        if (!dateStr) return false;
        const bDay = new Date(dateStr).toISOString().split('T')[0];
        if (bDay !== exactDate) return false;
      }

      // 4. Presets
      if (!exactDate && datePreset !== 'all') {
        if (!dateStr) return false;
        const bTime = new Date(dateStr).getTime();
        const now = Date.now();
        if (datePreset === '7d' && now - bTime > 7 * 86400000) return false;
        if (datePreset === '30d' && now - bTime > 30 * 86400000) return false;
      }

      // 5. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const invMatch = (b.invoice_number || '').toLowerCase().includes(q);
        const shop = shopMap.get(b.shop_id);
        const shopMatch = shop ? shop.name.toLowerCase().includes(q) : false;
        const custMatch = (b.customer?.name || '').toLowerCase().includes(q);
        const phoneMatch = (b.customer?.phone || '').includes(q);
        if (!invMatch && !shopMatch && !custMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [bills, salonFilter, statusFilter, exactDate, datePreset, searchQuery, shopMap]);

  // Aggregate Daily Bills Matrix (Date-by-Date breakdown)
  const dailyMatrix = useMemo(() => {
    const map = new Map<string, { bills: Bill[]; totalMinor: number }>();

    filteredBills.forEach((b) => {
      const dateStr = b.issued_at || b.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const entry = map.get(key) || { bills: [], totalMinor: 0 };
      entry.bills.push(b);
      entry.totalMinor += b.total_minor || 0;
      map.set(key, entry);
    });

    const rows: DailyMatrixRow[] = [];
    map.forEach((data, key) => {
      const parts = key.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const displayDate = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      let paidCount = 0;
      let pendingCount = 0;
      const salonCounts: Record<string, { count: number; name: string }> = {};

      data.bills.forEach((b) => {
        if (b.status === 'paid') paidCount++;
        if (b.status === 'pending') pendingCount++;

        const s = shopMap.get(b.shop_id);
        const sName = s?.name || 'Salon';
        if (!salonCounts[b.shop_id]) {
          salonCounts[b.shop_id] = { count: 0, name: sName };
        }
        salonCounts[b.shop_id].count++;
      });

      let topSalonName = '—';
      let topSalonBills = 0;
      Object.values(salonCounts).forEach((sc) => {
        if (sc.count > topSalonBills) {
          topSalonBills = sc.count;
          topSalonName = sc.name;
        }
      });

      rows.push({
        rawDate: key,
        displayDate,
        billsCount: data.bills.length,
        totalAmountMinor: data.totalMinor,
        avgBillMinor: data.bills.length > 0 ? Math.round(data.totalMinor / data.bills.length) : 0,
        paidCount,
        pendingCount,
        topSalonName,
        topSalonBills,
      });
    });

    return rows.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [filteredBills, shopMap]);

  // Totals
  const totalAmountMinor = filteredBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
  const avgBillSize = filteredBills.length > 0 ? Math.round(totalAmountMinor / filteredBills.length) : 0;
  const activeBillingSalonsCount = new Set(filteredBills.map((b) => b.shop_id)).size;

  const resetFilters = () => {
    setSalonFilter('all');
    setExactDate('');
    setDatePreset('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const isAnyFilterActive =
    salonFilter !== 'all' ||
    exactDate !== '' ||
    datePreset !== 'all' ||
    statusFilter !== 'all' ||
    searchQuery.trim() !== '';

  // Columns for Daily Matrix Table
  const matrixColumns: Column<DailyMatrixRow>[] = [
    {
      key: 'date',
      header: 'Calendar Date',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-black" />
          <span className="font-bold text-neutral-900 text-xs font-mono">{row.displayDate}</span>
        </div>
      ),
    },
    {
      key: 'billsCount',
      header: 'Bills Generated',
      render: (row) => (
        <div className="font-mono text-xs">
          <span className="font-extrabold text-black text-sm">{row.billsCount}</span>
          <span className="text-neutral-500 text-[11px] ml-1">invoices</span>
        </div>
      ),
    },
    {
      key: 'totalAmountMinor',
      header: 'Total Volume (INR)',
      render: (row) => (
        <span className="font-mono font-bold text-neutral-900 text-sm">
          {formatCurrency(row.totalAmountMinor)}
        </span>
      ),
    },
    {
      key: 'avgBillMinor',
      header: 'Average Bill Size',
      render: (row) => (
        <span className="font-mono text-xs text-neutral-700">
          {formatCurrency(row.avgBillMinor)}
        </span>
      ),
    },
    {
      key: 'paidCount',
      header: 'Paid vs Pending',
      render: (row) => (
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-neutral-900 font-bold">{row.paidCount} paid</span>
          {row.pendingCount > 0 && (
            <span className="text-neutral-500 font-bold">{row.pendingCount} pending</span>
          )}
        </div>
      ),
    },
    {
      key: 'topSalon',
      header: 'Top Salon That Day',
      render: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-neutral-900">{row.topSalonName}</span>
          <span className="text-neutral-400 text-[11px] ml-1 font-mono">({row.topSalonBills} bills)</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (row) => (
        <button
          onClick={() => {
            setExactDate(row.rawDate);
            setActiveSubTab('invoices');
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-900 hover:bg-black hover:text-white transition-colors"
        >
          <span>View Invoices</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  // Columns for Individual Bills
  const billColumns: Column<Bill>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (b) => (
        <span className="font-mono font-bold text-xs text-neutral-900">
          {b.invoice_number}
        </span>
      ),
    },
    {
      key: 'salon',
      header: 'Salon Business',
      render: (b) => {
        const shop = shopMap.get(b.shop_id);
        return (
          <div>
            <div className="font-semibold text-neutral-900">{shop?.name || b.shop?.name || b.shop_id}</div>
            <div className="text-[11px] text-neutral-400">{shop?.city || 'Tamil Nadu'}</div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Customer Details',
      render: (b) => (
        <div>
          <div className="font-bold text-neutral-900">{b.customer?.name || 'Walk-in Client'}</div>
          {b.customer?.phone && (
            <div className="text-[11px] font-mono text-neutral-500">{b.customer.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'total_minor',
      header: 'Amount (INR)',
      render: (b) => (
        <span className="font-mono font-bold text-neutral-900 text-sm">
          {formatCurrency(b.total_minor)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: 'issued_at',
      header: 'Issued Date & Time',
      render: (b) => (
        <span className="font-mono text-xs text-neutral-600">
          {formatDateTime(b.issued_at || b.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-black text-white shadow-xs">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Daily Sales Metrics &amp; Ledger
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black text-white">
                LIVE
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Detailed day-by-day sales tracking and invoice generation rates across all connected salons.
            </p>
          </div>
        </div>

        <ExportButton
          data={filteredBills.map((b) => ({
            'Invoice #': b.invoice_number,
            'Salon Name': shopMap.get(b.shop_id)?.name || b.shop_id,
            'Customer Name': b.customer?.name || 'Walk-in',
            'Customer Phone': b.customer?.phone || '—',
            'Amount (INR)': Number(((b.total_minor || 0) / 100).toFixed(2)),
            Status: b.status,
            'Issued Date': formatDateTime(b.issued_at || b.created_at),
          }))}
          filename={`stylefleet_daily_sales_${exactDate || datePreset}`}
          label="Export Excel"
        />
      </div>

      {/* KPI Cards - Clean White & Emerald/Teal Modern Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Total Sales in Scope"
          value={formatNumber(filteredBills.length)}
          subtitle={exactDate ? `On date: ${exactDate}` : 'Across all loaded dates'}
          tone="usage"
          icon={Receipt}
        />
        <KPICard
          title="Invoiced Sales Volume"
          value={formatCurrency(totalAmountMinor)}
          subtitle="Gross invoiced value"
          tone="revenue"
          icon={DollarSign}
        />
        <KPICard
          title="Average Ticket Size"
          value={formatCurrency(avgBillSize)}
          subtitle="Average value per sale"
          tone="conversion"
          icon={TrendingUp}
        />
        <KPICard
          title="Billing Salons"
          value={formatNumber(activeBillingSalonsCount)}
          subtitle="Salons actively billing in scope"
          tone="brand"
          icon={Building2}
        />
      </div>

      {/* Multi-Attribute Filter Toolbar (IronDrobe Panel) */}
      <div className="panel space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Sparkles className="w-4 h-4 text-black" />
            <span>Exact Date Search &amp; Salon Targeting ("Search this date how much bills they put")</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Omni Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Search Invoice / Client
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Invoice #, customer, phone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 2. Target Salon Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-black" />
              <span>Filter by Salon</span>
            </label>
            <select
              value={salonFilter}
              onChange={(e) => setSalonFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Salons ({deduplicatedShops.length})</option>
              {deduplicatedShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city || 'Tamil Nadu'})
                </option>
              ))}
            </select>
          </div>

          {/* 3. EXACT SINGLE DATE PICKER */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-black" />
              <span>Exact Date</span>
            </label>
            <input
              type="date"
              value={exactDate}
              onChange={(e) => {
                setExactDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-black transition-all"
            />
          </div>

          {/* 4. Invoice Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="deleted">Cancelled / Deleted</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100">
            <span className="text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{filteredBills.length}</span> matching bills across {dailyMatrix.length} days
            </span>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub Tabs: Day-by-Day Matrix vs Invoices Ledger */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'matrix'
              ? 'bg-black text-white shadow-xs'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          Day-by-Day Sales Matrix ({dailyMatrix.length} Days)
        </button>
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'invoices'
              ? 'bg-black text-white shadow-xs'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          All Sales Invoices ({filteredBills.length} Bills)
        </button>
      </div>

      {/* SubTab 1: Day-by-Day Matrix */}
      {activeSubTab === 'matrix' && (
        <DataTable
          columns={matrixColumns}
          data={dailyMatrix}
          loading={loading}
          emptyTitle="No daily billing records found"
          emptyDescription="Try selecting a different date or clearing the salon filter."
          searchPlaceholder="Filter listed dates..."
          defaultSortField="date"
          defaultSortOrder="desc"
        />
      )}

      {/* SubTab 2: Invoices Ledger */}
      {activeSubTab === 'invoices' && (
        <DataTable
          columns={billColumns}
          data={filteredBills}
          loading={loading}
          emptyTitle="No invoices found"
          emptyDescription="No invoices matching the selected filters were found."
          searchPlaceholder="Filter listed invoices..."
          defaultSortField="issued_at"
          defaultSortOrder="desc"
        />
      )}
    </div>
  );
};
