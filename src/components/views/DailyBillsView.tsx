import React, { useMemo, useState } from 'react';
import {
  RotateCcw,
  Download,
  Search,
  X,
  ExternalLink,
  ChevronRight,
  Phone,
  MapPin,
  CreditCard,
  Building2,
} from 'lucide-react';
import { Bill, Shop, Payment, Customer } from '../../types/database';
import { exportToCSV } from '../../utils/formatters';

interface DailyBillsViewProps {
  bills: Bill[];
  shops: Shop[];
  payments?: Payment[];
  customers?: Customer[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectSalon?: (shop: Shop) => void;
}

interface ShopDailyMetrics {
  shopId: string;
  shopName: string;
  city: string;
  phone: string;
  totalOrders: number;
  cashCount: number;
  cashAmountMinor: number;
  upiCount: number;
  upiAmountMinor: number;
  partialCount: number;
  dueAmountMinor: number;
  revenueMinor: number;
  shopObj?: Shop;
}

interface DayMetricsRow {
  rawDate: string; // YYYY-MM-DD
  friendlyDate: string; // e.g. 14 October 2026
  monthKey: string; // e.g. October 2026
  totalOrders: number;
  cashCount: number;
  cashAmountMinor: number;
  upiCount: number;
  upiAmountMinor: number;
  partialCount: number;
  dueAmountMinor: number;
  revenueMinor: number;
  shops: ShopDailyMetrics[];
}

export const DailyBillsView: React.FC<DailyBillsViewProps> = ({
  bills = [],
  shops = [],
  payments = [],
  customers = [],
  loading = false,
  onRefresh,
  onSelectSalon,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedPopupDate, setSelectedPopupDate] = useState<DayMetricsRow | null>(null);

  // Shop map for fast lookup
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

  // Build daily breakdown matrix strictly from real Supabase bills & payments
  const allDailyRows = useMemo<DayMetricsRow[]>(() => {
    const map = new Map<
      string,
      {
        totalOrders: number;
        cashCount: number;
        cashAmountMinor: number;
        upiCount: number;
        upiAmountMinor: number;
        partialCount: number;
        dueAmountMinor: number;
        revenueMinor: number;
        shopData: Map<
          string,
          {
            totalOrders: number;
            cashCount: number;
            cashAmountMinor: number;
            upiCount: number;
            upiAmountMinor: number;
            partialCount: number;
            dueAmountMinor: number;
            revenueMinor: number;
          }
        >;
      }
    >();

    bills.forEach((b) => {
      const rawD = (b.issued_at || b.created_at || '').slice(0, 10);
      if (!rawD || rawD.length < 10) return;

      if (!map.has(rawD)) {
        map.set(rawD, {
          totalOrders: 0,
          cashCount: 0,
          cashAmountMinor: 0,
          upiCount: 0,
          upiAmountMinor: 0,
          partialCount: 0,
          dueAmountMinor: 0,
          revenueMinor: 0,
          shopData: new Map(),
        });
      }

      const dayEntry = map.get(rawD)!;
      dayEntry.totalOrders += 1;

      // Determine payment method and partial pay
      const p = paymentByBillId.get(b.id);
      let dueMinor = b.due_amount_minor || 0;
      if (!dueMinor && b.notes && b.notes.includes('due:')) {
        const match = b.notes.match(/due:(\d+)/);
        if (match) dueMinor = parseInt(match[1], 10) * 100;
      }
      const isPartial = dueMinor > 0;
      const isCash = (p && p.method === 'Cash') || (b.notes && b.notes.toLowerCase().includes('cash'));
      const isUPI = !isCash; // In StyleFleet salon app, transactions are either Cash or UPI

      if (isPartial) {
        dayEntry.partialCount += 1;
        dayEntry.dueAmountMinor += dueMinor;
      }

      if (isCash) {
        dayEntry.cashCount += 1;
        dayEntry.cashAmountMinor += b.total_minor || 0;
      } else {
        dayEntry.upiCount += 1;
        dayEntry.upiAmountMinor += b.total_minor || 0;
      }

      if (b.status !== 'deleted') {
        dayEntry.revenueMinor += b.total_minor || 0;
      }

      // Shop drill-down
      const sId = b.shop_id || 'unknown';
      if (!dayEntry.shopData.has(sId)) {
        dayEntry.shopData.set(sId, {
          totalOrders: 0,
          cashCount: 0,
          cashAmountMinor: 0,
          upiCount: 0,
          upiAmountMinor: 0,
          partialCount: 0,
          dueAmountMinor: 0,
          revenueMinor: 0,
        });
      }
      const sEntry = dayEntry.shopData.get(sId)!;
      sEntry.totalOrders += 1;
      if (isPartial) {
        sEntry.partialCount += 1;
        sEntry.dueAmountMinor += dueMinor;
      }
      if (isCash) {
        sEntry.cashCount += 1;
        sEntry.cashAmountMinor += b.total_minor || 0;
      } else {
        sEntry.upiCount += 1;
        sEntry.upiAmountMinor += b.total_minor || 0;
      }
      if (b.status !== 'deleted') {
        sEntry.revenueMinor += b.total_minor || 0;
      }
    });

    const rows: DayMetricsRow[] = [];
    const sortedDates = Array.from(map.keys()).sort().reverse();

    sortedDates.forEach((rawDate) => {
      const data = map.get(rawDate)!;
      const dateObj = new Date(`${rawDate}T00:00:00`);
      const friendlyDate = isNaN(dateObj.getTime())
        ? rawDate
        : dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const monthKey = isNaN(dateObj.getTime())
        ? 'Other'
        : dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      // Compile per-shop metrics
      const shopMetrics: ShopDailyMetrics[] = [];
      data.shopData.forEach((sVals, sId) => {
        const matchedShop = shopMap.get(sId);
        shopMetrics.push({
          shopId: sId,
          shopName: matchedShop?.name || 'Salon Account',
          city: matchedShop?.city || 'Tamil Nadu',
          phone: matchedShop?.phone || '—',
          totalOrders: sVals.totalOrders,
          cashCount: sVals.cashCount,
          cashAmountMinor: sVals.cashAmountMinor,
          upiCount: sVals.upiCount,
          upiAmountMinor: sVals.upiAmountMinor,
          partialCount: sVals.partialCount,
          dueAmountMinor: sVals.dueAmountMinor,
          revenueMinor: sVals.revenueMinor,
          shopObj: matchedShop,
        });
      });

      // Sort shops by total orders descending
      shopMetrics.sort((a, b) => b.totalOrders - a.totalOrders);

      rows.push({
        rawDate,
        friendlyDate,
        monthKey,
        totalOrders: data.totalOrders,
        cashCount: data.cashCount,
        cashAmountMinor: data.cashAmountMinor,
        upiCount: data.upiCount,
        upiAmountMinor: data.upiAmountMinor,
        partialCount: data.partialCount,
        dueAmountMinor: data.dueAmountMinor,
        revenueMinor: data.revenueMinor,
        shops: shopMetrics,
      });
    });

    return rows;
  }, [bills, paymentByBillId, shopMap]);

  // Available months for filter pills
  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    const months: string[] = [];
    allDailyRows.forEach((r) => {
      if (!seen.has(r.monthKey)) {
        seen.add(r.monthKey);
        months.push(r.monthKey);
      }
    });
    return months;
  }, [allDailyRows]);

  // Filter rows based on search query and month filter
  const filteredRows = useMemo(() => {
    return allDailyRows.filter((row) => {
      if (selectedMonth !== 'all' && row.monthKey !== selectedMonth) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDate =
          row.friendlyDate.toLowerCase().includes(q) || row.rawDate.includes(q);
        const matchesShop = row.shops.some(
          (s) =>
            s.shopName.toLowerCase().includes(q) ||
            s.city.toLowerCase().includes(q) ||
            s.phone.includes(q)
        );
        if (!matchesDate && !matchesShop) return false;
      }

      return true;
    });
  }, [allDailyRows, selectedMonth, searchQuery]);

  // Aggregate KPI summary
  const summary = useMemo(() => {
    let totalOrders = 0;
    let cashCount = 0;
    let cashAmountMinor = 0;
    let upiCount = 0;
    let upiAmountMinor = 0;
    let partialCount = 0;
    let revenueMinor = 0;

    filteredRows.forEach((r) => {
      totalOrders += r.totalOrders;
      cashCount += r.cashCount;
      cashAmountMinor += r.cashAmountMinor;
      upiCount += r.upiCount;
      upiAmountMinor += r.upiAmountMinor;
      partialCount += r.partialCount;
      revenueMinor += r.revenueMinor;
    });

    return {
      totalOrders,
      cashCount,
      cashAmount: Math.round(cashAmountMinor / 100),
      upiCount,
      upiAmount: Math.round(upiAmountMinor / 100),
      partialCount,
      revenue: Math.round(revenueMinor / 100),
    };
  }, [filteredRows]);

  // CSV Export
  const handleExportCSV = () => {
    const exportData = filteredRows.map((r) => ({
      'Date': r.friendlyDate,
      'Total Orders': r.totalOrders,
      'Cash Orders': r.cashCount,
      'Cash (INR)': Math.round(r.cashAmountMinor / 100),
      'UPI Orders': r.upiCount,
      'UPI (INR)': Math.round(r.upiAmountMinor / 100),
      'Partial / Due Orders': r.partialCount,
      'Revenue (INR)': Math.round(r.revenueMinor / 100),
    }));
    exportToCSV(exportData, `stylefleet_daily_orders_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* 1. TOP PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
            Daily Order Metrics
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real order metrics across salon shops: Total orders, Cash, UPI, and Partial payments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => (onRefresh ? onRefresh() : window.location.reload())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 hover:border-neutral-400 text-neutral-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0f766e] hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS (2-COLOR CLEAN PALETTE) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* TOTAL ORDERS */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 font-mono">
            TOTAL ORDERS
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 mt-1 font-mono">
            {summary.totalOrders.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            in selected range
          </div>
        </div>

        {/* CASH PAYMENTS */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 font-mono">
            CASH ORDERS
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 mt-1 font-mono">
            {summary.cashCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">
            ₹{summary.cashAmount.toLocaleString()} collected
          </div>
        </div>

        {/* UPI PAYMENTS */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0f766e] font-mono">
            UPI / ONLINE
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 mt-1 font-mono">
            {summary.upiCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#0f766e] font-mono mt-1">
            ₹{summary.upiAmount.toLocaleString()} received
          </div>
        </div>

        {/* TOTAL REVENUE */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 font-mono">
            TOTAL REVENUE
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 mt-1 font-mono">
            ₹{summary.revenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {summary.partialCount} partial / due bills
          </div>
        </div>
      </div>

      {/* 3. DAILY BREAKDOWN CONTROLS & TABLE */}
      <div className="space-y-4">
        {/* Controls row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              Daily breakdown
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              {filteredRows.length} days recorded
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search shop, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-neutral-300 text-xs bg-white text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
              />
            </div>

            {/* Month Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedMonth('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  selectedMonth === 'all'
                    ? 'bg-[#0f172a] text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All dates
              </button>
              {availableMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    selectedMonth === m
                      ? 'bg-[#0f172a] text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4. DAILY BREAKDOWN TABLE */}
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50 font-mono">
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-3 text-center">TOTAL ORDERS</th>
                  <th className="py-3 px-3 text-center">CASH ORDERS</th>
                  <th className="py-3 px-3 text-center">UPI / ONLINE</th>
                  <th className="py-3 px-3 text-center">PARTIAL / DUE</th>
                  <th className="py-3 px-4 text-right">REVENUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-neutral-400">
                      Loading daily order metrics...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-neutral-400">
                      No order records found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.rawDate} className="hover:bg-neutral-50/70 transition-colors">
                      {/* DATE WITH VIEW SHOP BREAKDOWN BUTTON */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900 text-xs">
                          {row.friendlyDate}
                        </div>
                        <button
                          onClick={() => setSelectedPopupDate(row)}
                          className="mt-0.5 text-[11px] font-bold text-[#0f766e] hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>View shop breakdown</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>

                      {/* TOTAL ORDERS */}
                      <td className="py-3 px-3 text-center font-bold text-neutral-900 font-mono text-sm">
                        {row.totalOrders}
                      </td>

                      {/* CASH ORDERS */}
                      <td className="py-3 px-3 text-center font-semibold text-neutral-800 font-mono">
                        {row.cashCount}
                      </td>

                      {/* UPI ORDERS */}
                      <td className="py-3 px-3 text-center font-semibold text-[#0f766e] font-mono">
                        {row.upiCount}
                      </td>

                      {/* PARTIAL / DUE */}
                      <td className="py-3 px-3 text-center font-semibold text-neutral-600 font-mono">
                        {row.partialCount}
                      </td>

                      {/* REVENUE */}
                      <td className="py-3 px-4 text-right font-black text-neutral-900 font-mono text-sm">
                        ₹{Math.round(row.revenueMinor / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. CENTERED POPUP MODAL FOR SALON BREAKDOWN (REQUESTED BY USER) */}
      {selectedPopupDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-neutral-200 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Salon Order Breakdown — {selectedPopupDate.friendlyDate}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Detailed salon order metrics: Total orders, Cash, UPI, and Partial pay
                </p>
              </div>
              <button
                onClick={() => setSelectedPopupDate(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detailed Table in Centered Card */}
            <div className="overflow-x-auto flex-1 mt-4">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50 font-mono">
                    <th className="py-3 px-3">SALON NAME</th>
                    <th className="py-3 px-3">PHONE & CITY</th>
                    <th className="py-3 px-3 text-center">TOTAL ORDERS</th>
                    <th className="py-3 px-3 text-center">CASH</th>
                    <th className="py-3 px-3 text-center">UPI</th>
                    <th className="py-3 px-3 text-center">PARTIAL / DUE</th>
                    <th className="py-3 px-3 text-right">REVENUE</th>
                    <th className="py-3 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {selectedPopupDate.shops.map((s) => (
                    <tr key={s.shopId} className="hover:bg-neutral-50/70 transition-colors">
                      {/* SALON NAME */}
                      <td className="py-3 px-3 font-bold text-neutral-900">
                        {s.shopName}
                      </td>

                      {/* PHONE & CITY */}
                      <td className="py-3 px-3 text-neutral-600 font-mono text-[11px]">
                        <div>{s.city}</div>
                        <div className="text-neutral-400">{s.phone}</div>
                      </td>

                      {/* TOTAL ORDERS */}
                      <td className="py-3 px-3 text-center font-bold text-neutral-900 font-mono">
                        {s.totalOrders}
                      </td>

                      {/* CASH */}
                      <td className="py-3 px-3 text-center font-mono text-neutral-800 font-semibold">
                        {s.cashCount}
                      </td>

                      {/* UPI */}
                      <td className="py-3 px-3 text-center font-mono text-[#0f766e] font-semibold">
                        {s.upiCount}
                      </td>

                      {/* PARTIAL / DUE */}
                      <td className="py-3 px-3 text-center font-mono text-neutral-600">
                        {s.partialCount}
                      </td>

                      {/* REVENUE */}
                      <td className="py-3 px-3 text-right font-black text-neutral-900 font-mono">
                        ₹{Math.round(s.revenueMinor / 100).toLocaleString()}
                      </td>

                      {/* ACTION: VIEW SALON */}
                      <td className="py-3 px-3 text-center">
                        {s.shopObj && onSelectSalon ? (
                          <button
                            onClick={() => {
                              setSelectedPopupDate(null);
                              onSelectSalon(s.shopObj!);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0f172a] hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <span>View Salon</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedPopupDate(null)}
                className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
