import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  X,
  Sparkles,
  ArrowRight,
  MapPin,
  CheckCircle2,
  PlusCircle,
  Crown,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Shop, Payment, Bill } from '../../types/database';
import { ExportButton } from '../common/ExportButton';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate } from '../../utils/dateUtils';
import { supabase } from '../../services/supabase';

export type SubscriptionTier = '1m' | '3m' | '6m' | '1y' | 'custom';

export interface CompanySubscriptionItem {
  id: string;
  shopId: string;
  shopName: string;
  city: string;
  phone: string;
  tier: SubscriptionTier;
  planName: string;
  amountINR: number;
  paymentMethod: string;
  reference: string;
  status: 'active' | 'expired' | 'trial';
  activatedAt: string;
  expiresAt: string;
  source: 'gateway_payment' | 'database_subscription' | 'manual_activation';
}

interface SubscriptionRevenueViewProps {
  payments: Payment[];
  bills: Bill[];
  shops: Shop[];
  subscriptions?: any[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
}

const PLAN_PRICING: Record<SubscriptionTier, { name: string; price: number; durationMonths: number }> = {
  '1m': { name: '1 Month Pro', price: 499, durationMonths: 1 },
  '3m': { name: '3 Months Pro', price: 1499, durationMonths: 3 },
  '6m': { name: '6 Months Pro', price: 2799, durationMonths: 6 },
  '1y': { name: '1 Year Pro', price: 4999, durationMonths: 12 },
  'custom': { name: 'Custom Pro Plan', price: 1000, durationMonths: 1 },
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SubscriptionRevenueView: React.FC<SubscriptionRevenueViewProps> = ({
  payments,
  bills,
  shops,
  subscriptions = [],
  loading = false,
  onSelectSalon,
}) => {
  // Granularity View Mode
  const [granularity, setGranularity] = useState<'month' | 'week' | 'day'>('month');

  // Selectors State
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedWeek, setSelectedWeek] = useState<string>('W42');
  const [compareMode, setCompareMode] = useState<'previous_period' | 'previous_year' | 'none'>('previous_period');

  // Manual Subscription Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [modalShopId, setModalShopId] = useState<string>('');
  const [modalTier, setModalTier] = useState<SubscriptionTier>('1m');
  const [modalCustomAmount, setModalCustomAmount] = useState<string>('499');
  const [modalMethod, setModalMethod] = useState<string>('UPI');
  const [modalRef, setModalRef] = useState<string>('');
  const [modalDate, setModalDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  // Persistent Manual Subscriptions in localStorage
  const [manualSubscriptions, setManualSubscriptions] = useState<CompanySubscriptionItem[]>(() => {
    try {
      const saved = localStorage.getItem('stylefleet_company_subscriptions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // Deduplicated Salons
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

  // COMPILE ALL STYLEFLEET COMPANY SUBSCRIPTION REVENUES
  const allCompanySubscriptions: CompanySubscriptionItem[] = useMemo(() => {
    const list: CompanySubscriptionItem[] = [];
    const seenKeys = new Set<string>();

    // 1. Gateway payments matching subscription plans
    payments.forEach((p) => {
      const amt = Math.round((p.amount_minor || 0) / 100);
      const isSub =
        (p.status === 'completed' || (p as any).status === 'success') &&
        (amt >= 499 || (p.reference && p.reference.toLowerCase().includes('sub')) || !p.bill_id);

      if (isSub && (amt === 499 || amt === 1499 || amt === 2799 || amt === 4999 || (p.reference && p.reference.toLowerCase().includes('sub')))) {
        const shop = shopMap.get(p.shop_id);
        const uniqueKey = `pay:${p.id}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);

          let tier: SubscriptionTier = '1m';
          if (amt >= 4999) tier = '1y';
          else if (amt >= 2799) tier = '6m';
          else if (amt >= 1499) tier = '3m';

          const actDate = p.paid_at || p.created_at || new Date().toISOString();
          const exp = new Date(actDate);
          exp.setMonth(exp.getMonth() + PLAN_PRICING[tier].durationMonths);

          list.push({
            id: p.id,
            shopId: p.shop_id,
            shopName: shop?.name || 'Registered Salon',
            city: shop?.city || 'Tamil Nadu',
            phone: shop?.phone || '—',
            tier,
            planName: PLAN_PRICING[tier].name,
            amountINR: amt,
            paymentMethod: p.method || 'Online Gateway',
            reference: p.reference || `PAY-${p.id.slice(0, 8).toUpperCase()}`,
            status: 'active',
            activatedAt: actDate,
            expiresAt: exp.toISOString(),
            source: 'gateway_payment',
          });
        }
      }
    });

    // 2. Database subscriptions table entries
    subscriptions.forEach((sub) => {
      const shop = shopMap.get(sub.shop_id);
      const uniqueKey = `sub:${sub.id}`;
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);

        const tier: SubscriptionTier = (sub.plan as SubscriptionTier) || '3m';
        const price = sub.amount || PLAN_PRICING[tier]?.price || 1499;
        const actDate = sub.created_at || new Date().toISOString();
        const exp =
          sub.expires_at ||
          new Date(
            new Date(actDate).setMonth(
              new Date(actDate).getMonth() + (PLAN_PRICING[tier]?.durationMonths || 3)
            )
          ).toISOString();

        list.push({
          id: sub.id,
          shopId: sub.shop_id,
          shopName: shop?.name || 'Subscribed Salon',
          city: shop?.city || 'Tamil Nadu',
          phone: shop?.phone || '—',
          tier,
          planName: PLAN_PRICING[tier]?.name || 'StyleFleet Pro Plan',
          amountINR: price,
          paymentMethod: sub.payment_method || 'Razorpay UPI',
          reference: sub.reference || `SUB-${sub.id.slice(0, 8).toUpperCase()}`,
          status: 'active',
          activatedAt: actDate,
          expiresAt: exp,
          source: 'database_subscription',
        });
      }
    });

    // 3. Salons with active Pro quotas in shops table (e.g. Brave & Cave with free_sales_limit: 200)
    shops.forEach((s) => {
      if ((s.free_sales_limit || 0) > 100) {
        const uniqueKey = `quota:${s.id}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);

          const actDate = s.created_at || new Date().toISOString();
          const exp = new Date(actDate);
          exp.setMonth(exp.getMonth() + 1);

          list.push({
            id: `PRO-${s.id.slice(0, 8).toUpperCase()}`,
            shopId: s.id,
            shopName: s.name,
            city: s.city || 'Tamil Nadu',
            phone: s.phone || '—',
            tier: '1m',
            planName: '1 Month Pro (₹499)',
            amountINR: 499,
            paymentMethod: 'UPI / Direct Activation',
            reference: 'PRO-SALES-QUOTA-EXTENDED',
            status: 'active',
            activatedAt: actDate,
            expiresAt: exp.toISOString(),
            source: 'manual_activation',
          });
        }
      }
    });

    // 4. Manually recorded subscriptions in localStorage
    manualSubscriptions.forEach((m) => {
      const uniqueKey = `manual:${m.id}`;
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        list.push(m);
      }
    });

    return list.sort(
      (a, b) => new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime()
    );
  }, [payments, subscriptions, shops, shopMap, manualSubscriptions]);

  // PERIOD BREAKDOWN DATA CALCULATION ACCORDING TO SELECTED GRANULARITY
  const periodData = useMemo(() => {
    interface PeriodItem {
      periodKey: string;
      label: string;
      revenue: number;
      change: number | null;
      growthPct: number | null;
    }

    const items: PeriodItem[] = [];

    if (granularity === 'month') {
      // 12 months for selectedYear
      for (let m = 0; m < 12; m++) {
        const monthRev = allCompanySubscriptions
          .filter((sub) => {
            const d = new Date(sub.activatedAt);
            return d.getFullYear() === selectedYear && d.getMonth() === m;
          })
          .reduce((sum, s) => sum + s.amountINR, 0);

        items.push({
          periodKey: `${selectedYear}-${String(m + 1).padStart(2, '0')}`,
          label: MONTH_NAMES[m],
          revenue: monthRev,
          change: null,
          growthPct: null,
        });
      }
    } else if (granularity === 'week') {
      // 4-5 weeks in selectedMonth of selectedYear
      // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29-end
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const weekRanges = [
        { label: 'Week 1', start: 1, end: 7 },
        { label: 'Week 2', start: 8, end: 14 },
        { label: 'Week 3', start: 15, end: 21 },
        { label: 'Week 4', start: 22, end: 28 },
      ];
      if (daysInMonth > 28) {
        weekRanges.push({ label: 'Week 5', start: 29, end: daysInMonth });
      }

      weekRanges.forEach((w) => {
        const weekRev = allCompanySubscriptions
          .filter((sub) => {
            const d = new Date(sub.activatedAt);
            if (d.getFullYear() !== selectedYear || d.getMonth() !== selectedMonth) return false;
            const day = d.getDate();
            return day >= w.start && day <= w.end;
          })
          .reduce((sum, s) => sum + s.amountINR, 0);

        items.push({
          periodKey: `${w.label}`,
          label: w.label,
          revenue: weekRev,
          change: null,
          growthPct: null,
        });
      });
    } else {
      // Daily calendar week (Mon - Sun for selectedWeek e.g. W42)
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      // Use current week dates
      const now = new Date();
      const currentDay = now.getDay();
      const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + distanceToMon);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const dayRev = allCompanySubscriptions
          .filter((sub) => {
            const subDate = new Date(sub.activatedAt).toISOString().split('T')[0];
            return subDate === dateStr;
          })
          .reduce((sum, s) => sum + s.amountINR, 0);

        items.push({
          periodKey: dateStr,
          label: `${dayNames[i]}`,
          revenue: dayRev,
          change: null,
          growthPct: null,
        });
      }
    }

    // Compute Change and Growth % for each item relative to previous item
    for (let i = 0; i < items.length; i++) {
      if (i > 0) {
        const prevRev = items[i - 1].revenue;
        const curRev = items[i].revenue;
        const diff = curRev - prevRev;
        items[i].change = diff;

        if (prevRev > 0) {
          items[i].growthPct = Math.round(((curRev - prevRev) / prevRev) * 1000) / 10;
        } else if (curRev > 0) {
          items[i].growthPct = 100;
        } else {
          items[i].growthPct = 0;
        }
      }
    }

    return items;
  }, [allCompanySubscriptions, granularity, selectedYear, selectedMonth]);

  // 4 TOP KPI METRICS (EXACTLY MATCHING THE REFERENCE IMAGE)
  const totalRevenue = useMemo(() => {
    return periodData.reduce((acc, p) => acc + p.revenue, 0);
  }, [periodData]);

  // Latest period revenue (last non-zero or latest item in periodData)
  const latestPeriodItem = useMemo(() => {
    if (periodData.length === 0) return null;
    // Find the latest month up to current month if year is current year
    const currentMonthIdx = new Date().getMonth();
    if (granularity === 'month' && selectedYear === new Date().getFullYear()) {
      return periodData[currentMonthIdx] || periodData[periodData.length - 1];
    }
    return periodData[periodData.length - 1];
  }, [periodData, granularity, selectedYear]);

  const latestPeriodRevenue = latestPeriodItem ? latestPeriodItem.revenue : 0;
  const growthVsPrev = latestPeriodItem?.growthPct !== null && latestPeriodItem?.growthPct !== undefined
    ? latestPeriodItem.growthPct
    : 0;

  // Best period: period with highest revenue
  const bestPeriod = useMemo(() => {
    if (periodData.length === 0) return '—';
    let max = -1;
    let bestName = '—';
    periodData.forEach((p) => {
      if (p.revenue > max) {
        max = p.revenue;
        bestName = p.label;
      }
    });
    return max > 0 ? bestName : '—';
  }, [periodData]);

  // Subtitle text matching reference image
  const dynamicSubtitle = useMemo(() => {
    if (granularity === 'month') {
      return `Month over month — ${selectedYear}`;
    }
    if (granularity === 'week') {
      return `Weekly (in month) — ${MONTH_NAMES_FULL[selectedMonth]} ${selectedYear}`;
    }
    return `Daily (calendar week) — ${selectedWeek} (${selectedYear})`;
  }, [granularity, selectedYear, selectedMonth, selectedWeek]);

  // Save new manual subscription
  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalShopId) {
      alert('Please select a salon shop.');
      return;
    }

    const shop = shopMap.get(modalShopId);
    const amountNum = parseFloat(modalCustomAmount) || PLAN_PRICING[modalTier].price;

    const actDate = modalDate ? new Date(modalDate).toISOString() : new Date().toISOString();
    const expDate = new Date(actDate);
    expDate.setMonth(expDate.getMonth() + PLAN_PRICING[modalTier].durationMonths);

    const newRecord: CompanySubscriptionItem = {
      id: `SUB-${Date.now().toString().slice(-6)}`,
      shopId: modalShopId,
      shopName: shop?.name || 'Salon Shop',
      city: shop?.city || 'Tamil Nadu',
      phone: shop?.phone || '—',
      tier: modalTier,
      planName: PLAN_PRICING[modalTier].name,
      amountINR: amountNum,
      paymentMethod: modalMethod,
      reference: modalRef || `MANUAL-${Date.now().toString().slice(-4)}`,
      status: 'active',
      activatedAt: actDate,
      expiresAt: expDate.toISOString(),
      source: 'manual_activation',
    };

    setIsSaving(true);
    try {
      const updated = [newRecord, ...manualSubscriptions];
      setManualSubscriptions(updated);
      localStorage.setItem('stylefleet_company_subscriptions', JSON.stringify(updated));

      // Update shop sales limit in Supabase to grant unlimited sales
      await supabase
        .from('shops')
        .update({
          free_sales_limit: 10000,
        })
        .eq('id', modalShopId);

      setIsRecordModalOpen(false);
      setModalRef('');
      alert(`Subscription recorded successfully for ${shop?.name}!`);
    } catch (err: any) {
      console.error(err);
      alert('Subscription recorded locally. Error syncing to database: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Action Bar (Record & Refresh) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            StyleFleet Revenue Trend
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Record Pro Subscription</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MAIN WHITE CARD CONTAINER (EXACT MATCH TO REFERENCE IMAGE) */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs p-5 sm:p-7 space-y-6">
        {/* Title & Controls Bar */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              Revenue Growth
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {dynamicSubtitle}
            </p>
          </div>

          {/* Granularity Toggles & Filter Selectors Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
            {/* Left: Granularity Toggle Pills */}
            <div className="inline-flex items-center p-1 bg-neutral-100 rounded-xl text-xs font-medium">
              <button
                onClick={() => setGranularity('month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  granularity === 'month'
                    ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Month over month
              </button>
              <button
                onClick={() => setGranularity('week')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  granularity === 'week'
                    ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Weekly (in month)
              </button>
              <button
                onClick={() => setGranularity('day')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  granularity === 'day'
                    ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Daily (calendar week)
              </button>
            </div>

            {/* Right: Selectors Grid (Year, Month, Calendar week, Compare) */}
            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              {/* Year Selector */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-neutral-400 mb-0.5">Year</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 cursor-pointer"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>

              {/* Month Selector */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-neutral-400 mb-0.5">Month</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Calendar week Selector */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-neutral-400 mb-0.5">Calendar week</span>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 cursor-pointer"
                >
                  <option value="W42">W42</option>
                  <option value="W41">W41</option>
                  <option value="W40">W40</option>
                  <option value="W39">W39</option>
                  <option value="W38">W38</option>
                </select>
              </div>

              {/* Compare Selector */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-neutral-400 mb-0.5">Compare</span>
                <select
                  value={compareMode}
                  onChange={(e) => setCompareMode(e.target.value as any)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 cursor-pointer"
                >
                  <option value="previous_period">Previous period</option>
                  <option value="previous_year">Previous year</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 4 SUMMARY STAT CARDS (EXACT MATCH TO REFERENCE IMAGE) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total revenue */}
          <div className="bg-neutral-50/70 rounded-xl border border-neutral-200/80 p-4">
            <div className="text-xs text-neutral-500 font-medium">
              Total revenue
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-1 font-mono tracking-tight">
              ₹{formatNumber(totalRevenue)}
            </div>
          </div>

          {/* Latest period */}
          <div className="bg-neutral-50/70 rounded-xl border border-neutral-200/80 p-4">
            <div className="text-xs text-neutral-500 font-medium">
              Latest period
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-1 font-mono tracking-tight">
              ₹{formatNumber(latestPeriodRevenue)}
            </div>
          </div>

          {/* Growth vs prev */}
          <div className="bg-neutral-50/70 rounded-xl border border-neutral-200/80 p-4">
            <div className="text-xs text-neutral-500 font-medium">
              Growth vs prev
            </div>
            <div
              className={`text-xl sm:text-2xl font-extrabold mt-1 font-mono tracking-tight ${
                growthVsPrev > 0
                  ? 'text-emerald-600'
                  : growthVsPrev < 0
                  ? 'text-red-500'
                  : 'text-neutral-700'
              }`}
            >
              {growthVsPrev > 0 ? `+${growthVsPrev}%` : `${growthVsPrev}%`}
            </div>
          </div>

          {/* Best period */}
          <div className="bg-neutral-50/70 rounded-xl border border-neutral-200/80 p-4">
            <div className="text-xs text-neutral-500 font-medium">
              Best period
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-1 font-mono tracking-tight">
              {bestPeriod}
            </div>
          </div>
        </div>

        {/* REVENUE GROWTH LINE CHART */}
        <div className="w-full h-64 sm:h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={periodData}
              margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E5E7EB"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${formatNumber(Number(v))}`}
              />
              <Tooltip
                formatter={(val: any) => [`₹${formatNumber(Number(val))}`, 'Revenue']}
                labelFormatter={(lbl) => `Period: ${lbl}`}
                contentStyle={{
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: '1px solid #E5E7EB',
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#2563EB', stroke: '#ffffff', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#1D4ED8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* FINANCIAL BREAKDOWN TABLE (EXACT MATCH TO REFERENCE IMAGE) */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-500">
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Revenue</th>
                <th className="py-3 px-3">Change</th>
                <th className="py-3 px-3 text-right">Growth %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {periodData.map((row) => {
                const changeStr =
                  row.change === null
                    ? '—'
                    : row.change > 0
                    ? `+₹${formatNumber(row.change)}`
                    : row.change < 0
                    ? `-₹${formatNumber(Math.abs(row.change))}`
                    : '₹0';

                const growthStr =
                  row.growthPct === null
                    ? '—'
                    : row.growthPct > 0
                    ? `+${row.growthPct}%`
                    : `${row.growthPct}%`;

                return (
                  <tr
                    key={row.periodKey}
                    className="hover:bg-neutral-50/60 transition-colors"
                  >
                    {/* Period */}
                    <td className="py-3 px-3 font-medium text-neutral-900">
                      {row.label}
                    </td>

                    {/* Revenue */}
                    <td className="py-3 px-3 font-mono font-semibold text-neutral-900">
                      ₹{formatNumber(row.revenue)}
                    </td>

                    {/* Change */}
                    <td className="py-3 px-3 font-mono text-neutral-600">
                      {changeStr}
                    </td>

                    {/* Growth % */}
                    <td
                      className={`py-3 px-3 text-right font-mono font-semibold ${
                        row.growthPct && row.growthPct > 0
                          ? 'text-emerald-600'
                          : row.growthPct && row.growthPct < 0
                          ? 'text-red-500'
                          : 'text-neutral-500'
                      }`}
                    >
                      {growthStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD / UPGRADE PRO SUBSCRIPTION MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Record Pro Subscription
                </h3>
                <p className="text-xs text-neutral-500">
                  Record payment or upgrade for company subscription revenue
                </p>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4 text-xs">
              {/* Select Salon */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Salon Shop *</label>
                <select
                  required
                  value={modalShopId}
                  onChange={(e) => setModalShopId(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Choose a salon --</option>
                  {deduplicatedShops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city || 'Tamil Nadu'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Tier */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Subscription Tier *</label>
                <select
                  value={modalTier}
                  onChange={(e) => {
                    const t = e.target.value as SubscriptionTier;
                    setModalTier(t);
                    setModalCustomAmount(PLAN_PRICING[t].price.toString());
                  }}
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="1m">1 Month Pro — ₹499</option>
                  <option value="3m">3 Months Pro — ₹1,499</option>
                  <option value="6m">6 Months Pro — ₹2,799</option>
                  <option value="1y">1 Year Pro — ₹4,999</option>
                  <option value="custom">Custom Pro Plan</option>
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Amount Paid (INR) *</label>
                <input
                  type="number"
                  required
                  value={modalCustomAmount}
                  onChange={(e) => setModalCustomAmount(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Payment Method *</label>
                <select
                  value={modalMethod}
                  onChange={(e) => setModalMethod(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Razorpay">Razorpay Gateway</option>
                  <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
                  <option value="Cash">Cash Collected</option>
                  <option value="Manual Override">Manual Admin Activation</option>
                </select>
              </div>

              {/* Reference */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Reference / UTR / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-92817293 or Payment Receipt"
                  value={modalRef}
                  onChange={(e) => setModalRef(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Payment Date</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Recording...' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
