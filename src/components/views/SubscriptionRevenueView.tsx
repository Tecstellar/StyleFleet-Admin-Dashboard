import React, { useMemo, useState, useEffect } from 'react';
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
  PlusCircle,
  Crown,
  Phone,
  RotateCcw,
  Zap,
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
import { ExportButton } from '../common/ExportButton';
import { KPICard } from '../common/KPICard';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
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
  amountINR: number; // In Rupees, e.g. 1499
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
  'custom': { name: 'Custom Pro Plan', price: 1999, durationMonths: 3 },
};

export const SubscriptionRevenueView: React.FC<SubscriptionRevenueViewProps> = ({
  payments,
  bills,
  shops,
  subscriptions = [],
  loading = false,
  onSelectSalon,
}) => {
  // Filters & State
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartViewMode, setChartViewMode] = useState<'area' | 'bar'>('area');

  // Manual Subscription Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [modalShopId, setModalShopId] = useState<string>('');
  const [modalTier, setModalTier] = useState<SubscriptionTier>('3m');
  const [modalCustomAmount, setModalCustomAmount] = useState<string>('1499');
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

  // 1. COMPILE ALL STYLEFLEET COMPANY SUBSCRIPTION REVENUES
  // Excludes salon customer bills (haircuts/pos bills). Only counts StyleFleet Pro subscriptions.
  const allCompanySubscriptions: CompanySubscriptionItem[] = useMemo(() => {
    const list: CompanySubscriptionItem[] = [];
    const seenKeys = new Set<string>();

    // A. Real online gateway payments for subscriptions (payments with amount >= 49900 or reference mentioning sub/plan)
    payments.forEach((p) => {
      const amt = Math.round((p.amount_minor || 0) / 100);
      const isSub =
        (p.status === 'completed' || (p as any).status === 'success') &&
        (amt >= 499 || (p.reference && p.reference.toLowerCase().includes('sub')) || !p.bill_id);

      // Only include if it represents a subscription plan price tier
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

    // B. Real Subscriptions Table entries from Supabase
    subscriptions.forEach((sub) => {
      const shop = shopMap.get(sub.shop_id);
      const uniqueKey = `sub:${sub.id}`;
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);

        const tier: SubscriptionTier = (sub.plan as SubscriptionTier) || '3m';
        const price = sub.amount || PLAN_PRICING[tier]?.price || 1499;
        const actDate = sub.created_at || new Date().toISOString();
        const exp = sub.expires_at || new Date(new Date(actDate).setMonth(new Date(actDate).getMonth() + (PLAN_PRICING[tier]?.durationMonths || 3))).toISOString();

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
          status: sub.status === 'active' || sub.status === 'paid' ? 'active' : 'expired',
          activatedAt: actDate,
          expiresAt: exp,
          source: 'database_subscription',
        });
      }
    });

    // C. Salons with explicit Pro quota override (e.g. Brave & Cave with free_sales_limit: 200)
    shops.forEach((s) => {
      if ((s.free_sales_limit || 0) > 100) {
        const uniqueKey = `override:${s.id}`;
        // If not already counted via payment/subscription
        const alreadyCounted = list.some((item) => item.shopId === s.id);
        if (!alreadyCounted && !seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          const actDate = s.created_at || new Date().toISOString();
          const exp = new Date(actDate);
          exp.setMonth(exp.getMonth() + 3);

          list.push({
            id: `pro-${s.id.slice(0, 8)}`,
            shopId: s.id,
            shopName: s.name,
            city: s.city || 'Tamil Nadu',
            phone: s.phone || '—',
            tier: '3m',
            planName: '3 Months Pro (Admin Activated)',
            amountINR: 1499,
            paymentMethod: 'Manual Plan Upgrade',
            reference: 'Sales Limit Override (200 Sales)',
            status: 'active',
            activatedAt: actDate,
            expiresAt: exp.toISOString(),
            source: 'manual_activation',
          });
        }
      }
    });

    // D. Manual Subscriptions added via UI
    manualSubscriptions.forEach((m) => {
      const uniqueKey = `manual:${m.id}`;
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        list.push(m);
      }
    });

    // Sort descending by activated date
    return list.sort((a, b) => new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime());
  }, [payments, subscriptions, shops, shopMap, manualSubscriptions]);

  // Filtered Company Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return allCompanySubscriptions.filter((item) => {
      // Salon Filter
      if (salonFilter !== 'all' && item.shopId !== salonFilter) return false;

      // Tier Filter
      if (tierFilter !== 'all' && item.tier !== tierFilter) return false;

      // Method Filter
      if (methodFilter !== 'all' && item.paymentMethod !== methodFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.shopName.toLowerCase().includes(q);
        const cityMatch = item.city.toLowerCase().includes(q);
        const phoneMatch = item.phone.toLowerCase().includes(q);
        const refMatch = item.reference.toLowerCase().includes(q);
        const planMatch = item.planName.toLowerCase().includes(q);
        if (!nameMatch && !cityMatch && !phoneMatch && !refMatch && !planMatch) return false;
      }

      return true;
    });
  }, [allCompanySubscriptions, salonFilter, tierFilter, methodFilter, searchQuery]);

  // 2. COMPANY REVENUE METRICS
  const totalCompanyRevenueINR = useMemo(() => {
    return filteredSubscriptions.reduce((acc, curr) => acc + curr.amountINR, 0);
  }, [filteredSubscriptions]);

  const activeSubscribersCount = useMemo(() => {
    const uniqueActiveShops = new Set<string>();
    filteredSubscriptions
      .filter((s) => s.status === 'active')
      .forEach((s) => uniqueActiveShops.add(s.shopId));
    return uniqueActiveShops.size;
  }, [filteredSubscriptions]);

  // Monthly Recurring Revenue (MRR) Normalized
  const calculatedMRR = useMemo(() => {
    let mrr = 0;
    filteredSubscriptions
      .filter((s) => s.status === 'active')
      .forEach((s) => {
        const months = PLAN_PRICING[s.tier]?.durationMonths || 3;
        mrr += Math.round(s.amountINR / months);
      });
    return mrr;
  }, [filteredSubscriptions]);

  // Average Revenue Per Subscriber Salon (ARPU)
  const averageARPU = useMemo(() => {
    if (activeSubscribersCount === 0) return 0;
    return Math.round(totalCompanyRevenueINR / activeSubscribersCount);
  }, [totalCompanyRevenueINR, activeSubscribersCount]);

  // 3. REVENUE TREND CHART DATA (Grouped by Month in IST)
  const chartData = useMemo(() => {
    const monthMap = new Map<string, { monthKey: string; displayMonth: string; revenue: number; subscribers: number }>();

    filteredSubscriptions.forEach((sub) => {
      const d = new Date(sub.activatedAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const displayMonth = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      const entry = monthMap.get(key) || { monthKey: key, displayMonth, revenue: 0, subscribers: 0 };
      entry.revenue += sub.amountINR;
      entry.subscribers += 1;
      monthMap.set(key, entry);
    });

    // If only one or empty, ensure smooth graph display
    const sorted = Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    if (sorted.length === 1) {
      return [
        { monthKey: 'prev', displayMonth: 'Previous', revenue: 0, subscribers: 0 },
        ...sorted,
      ];
    }
    return sorted;
  }, [filteredSubscriptions]);

  // Handle Recording New Subscription
  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalShopId) {
      alert('Please select a salon shop.');
      return;
    }

    const shop = shopMap.get(modalShopId);
    const amount = Number(modalCustomAmount) || PLAN_PRICING[modalTier].price;
    const actDate = modalDate ? new Date(modalDate).toISOString() : new Date().toISOString();
    const expDate = new Date(actDate);
    expDate.setMonth(expDate.getMonth() + PLAN_PRICING[modalTier].durationMonths);

    const newRecord: CompanySubscriptionItem = {
      id: `manual-sub-${Date.now()}`,
      shopId: modalShopId,
      shopName: shop?.name || 'Salon Shop',
      city: shop?.city || 'Tamil Nadu',
      phone: shop?.phone || '—',
      tier: modalTier,
      planName: PLAN_PRICING[modalTier].name,
      amountINR: amount,
      paymentMethod: modalMethod,
      reference: modalRef.trim() || `MANUAL-${Date.now().toString().slice(-6)}`,
      status: 'active',
      activatedAt: actDate,
      expiresAt: expDate.toISOString(),
      source: 'manual_activation',
    };

    setIsSaving(true);
    try {
      // Update local storage
      const updated = [newRecord, ...manualSubscriptions];
      setManualSubscriptions(updated);
      localStorage.setItem('stylefleet_company_subscriptions', JSON.stringify(updated));

      // Attempt to update free_sales_limit on shops in Supabase so app POS quota unlocks
      await supabase
        .from('shops')
        .update({
          free_sales_limit: 10000, // Unlimited sales for active Pro
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
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              Company Subscription Revenue Trend
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              StyleFleet Revenue
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Real revenue earned by StyleFleet from salon Pro subscriptions (via payment gateway or manual activation).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Record Subscription Button */}
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Record Pro Subscription</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 hover:border-neutral-400 text-neutral-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards: Our Company Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Total Subscription Revenue"
          value={formatCurrency(totalCompanyRevenueINR * 100)}
          subtitle="All-time Pro plan collections"
          icon={TrendingUp}
          tone="revenue"
        />
        <KPICard
          title="Monthly Recurring (MRR)"
          value={formatCurrency(calculatedMRR * 100)}
          subtitle="Normalized monthly subscription run-rate"
          icon={Sparkles}
          tone="conversion"
        />
        <KPICard
          title="Active Pro Salons"
          value={activeSubscribersCount}
          subtitle={`Out of ${deduplicatedShops.length} registered salons`}
          icon={Crown}
          tone="signup"
        />
        <KPICard
          title="Avg Revenue / Salon (ARPU)"
          value={formatCurrency(averageARPU * 100)}
          subtitle="Average plan amount per subscriber"
          icon={CreditCard}
          tone="usage"
        />
      </div>

      {/* FILTER CONTROLS & SUBSCRIBERS TABLE */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">
              Company Subscription Ledger
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Breakdown of Pro subscriptions paid by salons
            </p>
          </div>

          <ExportButton
            data={filteredSubscriptions.map((s) => ({
              'Salon Name': s.shopName,
              'City': s.city,
              'Phone': s.phone,
              'Plan Tier': s.planName,
              'Amount (INR)': s.amountINR,
              'Payment Method': s.paymentMethod,
              'Reference': s.reference,
              'Status': s.status.toUpperCase(),
              'Activated Date': formatDate(s.activatedAt),
              'Expiry Date': formatDate(s.expiresAt),
              'Source': s.source,
            }))}
            filename={`stylefleet_subscriptions_${new Date().toISOString().split('T')[0]}`}
            label="Export Subscriptions"
          />
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search salon, plan, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400"
            />
          </div>

          {/* Salon Dropdown */}
          <select
            value={salonFilter}
            onChange={(e) => setSalonFilter(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 cursor-pointer"
          >
            <option value="all">All Salons ({deduplicatedShops.length})</option>
            {deduplicatedShops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} • {s.city || 'Tamil Nadu'}
              </option>
            ))}
          </select>

          {/* Tier Dropdown */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 cursor-pointer"
          >
            <option value="all">All Plan Tiers</option>
            <option value="1m">1 Month Pro (₹499)</option>
            <option value="3m">3 Months Pro (₹1,499)</option>
            <option value="6m">6 Months Pro (₹2,799)</option>
            <option value="1y">1 Year Pro (₹4,999)</option>
            <option value="custom">Custom Pro</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSalonFilter('all');
              setTierFilter('all');
              setMethodFilter('all');
              setSearchQuery('');
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer text-center"
          >
            Reset Filters
          </button>
        </div>

        {/* Subscribers Table */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase border-b border-neutral-100">
                <th className="py-3 px-2">SALON / SUBSCRIBER</th>
                <th className="py-3 px-2">PLAN TIER</th>
                <th className="py-3 px-2 text-right">AMOUNT</th>
                <th className="py-3 px-2">METHOD & REF</th>
                <th className="py-3 px-2">ACTIVATED</th>
                <th className="py-3 px-2">STATUS</th>
                <th className="py-3 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-neutral-400">
                    No subscriptions matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((item) => {
                  const shop = shopMap.get(item.shopId);
                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                      {/* Salon / Subscriber */}
                      <td className="py-3 px-2">
                        <div className="font-bold text-neutral-900">{item.shopName}</div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-neutral-400" />
                          <span>{item.city}</span>
                          {item.phone && item.phone !== '—' && (
                            <>
                              <span>•</span>
                              <span>{item.phone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Plan Tier Badge */}
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <Crown className="w-3 h-3 text-blue-600" />
                          {item.planName}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-2 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹{formatNumber(item.amountINR)}
                      </td>

                      {/* Method & Ref */}
                      <td className="py-3 px-2">
                        <div className="font-semibold text-neutral-800">{item.paymentMethod}</div>
                        <div className="text-[11px] font-mono text-neutral-500 truncate max-w-[140px]">
                          {item.reference}
                        </div>
                      </td>

                      {/* Activated Date */}
                      <td className="py-3 px-2 text-neutral-600">
                        {formatDate(item.activatedAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Active Pro
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-2 text-right">
                        {shop && onSelectSalon && (
                          <button
                            onClick={() => onSelectSalon(shop)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors cursor-pointer"
                          >
                            <span>View Salon</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVENUE TREND CHART (PLACED AT BOTTOM BELOW ALL THINGS) */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Subscription Revenue Trajectory
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              StyleFleet company subscription earnings progression over time
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartViewMode('area')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                chartViewMode === 'area'
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartViewMode('bar')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                chartViewMode === 'bar'
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Bar
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-64 sm:h-72 w-full pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-neutral-400">
              <AlertCircle className="w-6 h-6 mb-1 text-neutral-300" />
              <span>No subscription revenues recorded yet.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartViewMode === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="companyRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="displayMonth" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`₹${formatNumber(Number(value))}`, 'Company Revenue']}
                    labelFormatter={(label) => `Month: ${label}`}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #E5E7EB' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1D4ED8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#companyRevenueGradient)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="displayMonth" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`₹${formatNumber(Number(value))}`, 'Company Revenue']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="revenue" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* RECORD / UPGRADE SUBSCRIPTION MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Record Pro Subscription</h3>
                <p className="text-xs text-neutral-500">Record payment or manual upgrade for our company revenue</p>
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

              {/* Reference / Transaction ID */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Reference / UTR / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-12345678 or Promotional Upgrade"
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

              {/* Submit Buttons */}
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
