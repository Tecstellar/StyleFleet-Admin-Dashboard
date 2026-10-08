import React, { useMemo, useState } from 'react';
import {
  Crown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  Receipt,
  Building2,
  Calendar,
  Sparkles,
  Phone,
  ArrowRight,
  TrendingUp,
  X,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { Shop, Bill, Payment } from '../../types/database';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { ExportButton } from '../common/ExportButton';
import { KPICard } from '../common/KPICard';

export type ProPlanTier = '3m' | '6m' | '1y';

export interface SalonQuotaSummary {
  shopId: string;
  name: string;
  city: string;
  phone: string;
  registeredDate: string;
  registeredDateFormatted: string;
  daysActive: number;
  salesDone: number;
  salesRemaining: number;
  quotaPercentage: number;
  totalBilledMinor: number;
  totalCollectedMinor: number;
  status: 'free_active' | 'nearing_limit' | 'pro_required' | 'upgraded';
  upgradedPlan?: ProPlanTier | null;
  associatedShopIds: string[];
}

interface SubscriptionPlansViewProps {
  shops: Shop[];
  bills: Bill[];
  payments: Payment[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
}

export const SubscriptionPlansView: React.FC<SubscriptionPlansViewProps> = ({
  shops,
  bills,
  payments,
  loading = false,
  onSelectSalon,
}) => {
  // Filters & State
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'sales_desc' | 'sales_asc' | 'remaining_asc' | 'newest' | 'oldest'>('sales_desc');
  
  // Drilldown modal state
  const [selectedSalonBills, setSelectedSalonBills] = useState<SalonQuotaSummary | null>(null);
  const [billModalDateFilter, setBillModalDateFilter] = useState<string>('');
  const [copiedShopName, setCopiedShopName] = useState<string | null>(null);

  // Manual Pro Upgrades tracker with selected tier ('3m' = ₹1,499, '6m' = ₹2,799, '1y' = ₹4,999)
  const [upgradedShopPlans, setUpgradedShopPlans] = useState<Record<string, ProPlanTier>>(() => {
    try {
      const saved = localStorage.getItem('stylefleet_pro_upgraded_plans');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const assignProPlan = (shopNameKey: string, plan: ProPlanTier | null) => {
    setUpgradedShopPlans((prev) => {
      const next = { ...prev };
      if (!plan) {
        delete next[shopNameKey];
      } else {
        next[shopNameKey] = plan;
      }
      try {
        localStorage.setItem('stylefleet_pro_upgraded_plans', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Group and Deduplicate Shops & Aggregate Bills accurately
  const quotaSummaries = useMemo(() => {
    const shopMap = new Map<string, Shop>();
    shops.forEach((s) => shopMap.set(s.id, s));

    const aggByName = new Map<
      string,
      {
        name: string;
        shopId: string;
        city: string;
        phone: string;
        earliestCreated: string;
        associatedShopIds: string[];
      }
    >();

    // Deduplicate by clean salon name
    shops.forEach((s) => {
      const key = s.name.trim().toLowerCase();
      const existing = aggByName.get(key);
      if (!existing) {
        aggByName.set(key, {
          name: s.name.trim(),
          shopId: s.id,
          city: s.city || 'Tamil Nadu',
          phone: s.phone || s.owner_profile?.phone || '—',
          earliestCreated: s.created_at,
          associatedShopIds: [s.id],
        });
      } else {
        existing.associatedShopIds.push(s.id);
        if (s.created_at && new Date(s.created_at) < new Date(existing.earliestCreated)) {
          existing.earliestCreated = s.created_at;
          existing.shopId = s.id;
        }
        if (existing.phone === '—' && (s.phone || s.owner_profile?.phone)) {
          existing.phone = s.phone || s.owner_profile?.phone || '—';
        }
      }
    });

    // Compute bill stats per unique salon
    const list: SalonQuotaSummary[] = [];
    const now = new Date().getTime();

    aggByName.forEach((item, key) => {
      const shopIdsSet = new Set(item.associatedShopIds);
      const salonBills = bills.filter((b) => shopIdsSet.has(b.shop_id));
      const salonPayments = payments.filter((p) => shopIdsSet.has(p.shop_id));

      const salesDone = salonBills.length;
      const salesRemaining = Math.max(0, 100 - salesDone);
      const quotaPercentage = Math.min(100, Math.round((salesDone / 100) * 100));

      const totalBilledMinor = salonBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
      const totalCollectedMinor = salonPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);

      const regDate = item.earliestCreated ? new Date(item.earliestCreated) : new Date();
      const daysActive = Math.max(0, Math.floor((now - regDate.getTime()) / (1000 * 60 * 60 * 24)));

      const assignedPlan = upgradedShopPlans[key] || null;
      let status: SalonQuotaSummary['status'] = 'free_active';
      if (assignedPlan) {
        status = 'upgraded';
      } else if (salesDone >= 100) {
        status = 'pro_required';
      } else if (salesDone >= 50) {
        status = 'nearing_limit';
      } else {
        status = 'free_active';
      }

      list.push({
        shopId: item.shopId,
        name: item.name,
        city: item.city,
        phone: item.phone,
        registeredDate: item.earliestCreated || new Date().toISOString(),
        registeredDateFormatted: formatDate(item.earliestCreated),
        daysActive,
        salesDone,
        salesRemaining,
        quotaPercentage,
        totalBilledMinor,
        totalCollectedMinor,
        status,
        upgradedPlan: assignedPlan,
        associatedShopIds: item.associatedShopIds,
      });
    });

    return list;
  }, [shops, bills, payments, upgradedShopPlans]);

  // Unique Cities
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    quotaSummaries.forEach((s) => {
      if (s.city && s.city !== '—') set.add(s.city);
    });
    return Array.from(set).sort();
  }, [quotaSummaries]);

  // Filtered & Sorted Quotas
  const filteredSummaries = useMemo(() => {
    return quotaSummaries
      .filter((s) => {
        // Status filter
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;

        // City filter
        if (cityFilter !== 'all' && s.city !== cityFilter) return false;

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchCity = s.city.toLowerCase().includes(q);
          const matchPhone = s.phone.toLowerCase().includes(q);
          if (!matchName && !matchCity && !matchPhone) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'sales_desc') return b.salesDone - a.salesDone;
        if (sortBy === 'sales_asc') return a.salesDone - b.salesDone;
        if (sortBy === 'remaining_asc') return a.salesRemaining - b.salesRemaining;
        if (sortBy === 'newest') return new Date(b.registeredDate).getTime() - new Date(a.registeredDate).getTime();
        if (sortBy === 'oldest') return new Date(a.registeredDate).getTime() - new Date(b.registeredDate).getTime();
        return 0;
      });
  }, [quotaSummaries, statusFilter, cityFilter, searchQuery, sortBy]);

  // Aggregate KPI Metrics
  const totalSalons = quotaSummaries.length;
  const freeActiveCount = quotaSummaries.filter((s) => s.status === 'free_active').length;
  const nearingLimitCount = quotaSummaries.filter((s) => s.status === 'nearing_limit').length;
  const proRequiredCount = quotaSummaries.filter((s) => s.status === 'pro_required').length;
  const upgradedCount = quotaSummaries.filter((s) => s.status === 'upgraded').length;
  const totalPlatformSalesDone = bills.length;

  // Map payment methods from payments to bills
  const paymentMethodByBillId = useMemo(() => {
    const map = new Map<string, string>();
    payments.forEach((p) => {
      if (p.bill_id) {
        map.set(p.bill_id, p.method);
      }
    });
    return map;
  }, [payments]);

  // Bills for Modal Drilldown
  const selectedBillsList = useMemo(() => {
    if (!selectedSalonBills) return [];
    const idSet = new Set(selectedSalonBills.associatedShopIds);
    let list = bills.filter((b) => idSet.has(b.shop_id));

    if (billModalDateFilter) {
      list = list.filter((b) => {
        const d = b.created_at ? b.created_at.split('T')[0] : '';
        return d === billModalDateFilter;
      });
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [selectedSalonBills, bills, billModalDateFilter]);

  const handleCopyReminder = (salon: SalonQuotaSummary) => {
    const text = `Hi ${salon.name},\n\nYou have completed ${salon.salesDone} out of your 100 free sales on StyleFleet (${salon.salesRemaining} free sales remaining).\n\nTo ensure your checkout and billing continue uninterrupted, upgrade to StyleFleet Pro:\n• 3 Months: ₹1,499\n• 6 Months: ₹2,799\n• 1 Year: ₹4,999\n\n👉 Contact: support@tecstellar.com\n\nThank you for choosing StyleFleet!`;
    navigator.clipboard.writeText(text);
    setCopiedShopName(salon.name);
    setTimeout(() => setCopiedShopName(null), 3000);
  };

  const getStatusBadge = (salon: SalonQuotaSummary) => {
    switch (salon.status) {
      case 'pro_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-black text-white border border-black shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            PRO UPGRADE REQUIRED
          </span>
        );
      case 'nearing_limit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-neutral-900 text-amber-300 border border-neutral-700 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            NEARING 100 LIMIT
          </span>
        );
      case 'upgraded':
        const planName =
          salon.upgradedPlan === '3m'
            ? 'PRO 3M (₹1,499)'
            : salon.upgradedPlan === '6m'
            ? 'PRO 6M (₹2,799)'
            : 'PRO 1Y (₹4,999)';
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-black text-white border border-white/20 shadow-xs">
            <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            {planName}
          </span>
        );
      case 'free_active':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-800 border border-neutral-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-black" />
            FREE TIER ACTIVE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-black text-white p-6 sm:p-8 rounded-2xl border border-black shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20">
              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Free Tier Quota: 100 Sales per Registered Salon</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Subscription & Free Sales Quota Hub
            </h1>
            <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
              Every salon gets <strong>100 free sales from their registration date</strong>. Monitor completed sales, quota consumption, remaining free slots, and manage Pro Plan upgrades in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ExportButton
              data={filteredSummaries.map((s) => ({
                'Salon Name': s.name,
                'City': s.city,
                'Phone': s.phone,
                'Registered Date': s.registeredDateFormatted,
                'Days on Platform': s.daysActive,
                'Sales Completed': s.salesDone,
                'Free Sales Left': s.salesRemaining,
                'Quota Used %': `${s.quotaPercentage}%`,
                'Total Invoiced (₹)': Math.round(s.totalBilledMinor / 100),
                'Total Collected (₹)': Math.round(s.totalCollectedMinor / 100),
                'Plan Status': s.status.replace('_', ' ').toUpperCase(),
              }))}
              filename={`stylefleet_100_sales_quota_${new Date().toISOString().split('T')[0]}`}
              label="Export Quota Audit (CSV)"
            />
          </div>
        </div>

        {/* Decorative Watermark */}
        <Crown className="absolute -right-8 -bottom-10 w-56 h-56 text-white/5 pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPICard
          title="Salons"
          value={totalSalons}
          subtitle="Registered"
          icon={Building2}
          tone="usage"
        />
        <KPICard
          title="Free Active"
          value={freeActiveCount}
          subtitle="< 50 sales"
          icon={CheckCircle2}
          tone="signup"
        />
        <KPICard
          title="Near Limit"
          value={nearingLimitCount}
          subtitle="50-99 sales"
          icon={Clock}
          tone="conversion"
        />
        <KPICard
          title="Pro Required"
          value={proRequiredCount}
          subtitle="100+ sales"
          icon={AlertTriangle}
          tone="neutral"
        />
        <KPICard
          title="Sales Billed"
          value={totalPlatformSalesDone}
          subtitle="In database"
          icon={Receipt}
          tone="revenue"
        />
      </div>

      {/* Filter and Control Bar */}
      <div className="panel space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by salon name, city, or phone..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#0d9488] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-neutral-800 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Quota Statuses ({quotaSummaries.length})</option>
                <option value="free_active">Free Tier Active (&lt; 50) ({freeActiveCount})</option>
                <option value="nearing_limit">Nearing 100 Limit (50–99) ({nearingLimitCount})</option>
                <option value="pro_required">Pro Required (100+) ({proRequiredCount})</option>
                <option value="upgraded">Pro Plan Active ({upgradedCount})</option>
              </select>
            </div>

            {/* City Filter */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-neutral-800 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Cities</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-neutral-400 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-neutral-800 focus:outline-hidden cursor-pointer"
              >
                <option value="sales_desc">Most Sales Completed</option>
                <option value="remaining_asc">Fewest Sales Left (Closest to 100)</option>
                <option value="sales_asc">Least Sales Completed</option>
                <option value="newest">Newest Registration</option>
                <option value="oldest">Oldest Registration</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Pills Quick Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 text-xs">
          <span className="text-[11px] font-extrabold uppercase text-neutral-400 mr-1">Quick View:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-black text-white'
                : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200'
            }`}
          >
            All Salons ({quotaSummaries.length})
          </button>
          <button
            onClick={() => setStatusFilter('nearing_limit')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'nearing_limit'
                ? 'bg-black text-amber-300 border border-black'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Nearing Limit ({nearingLimitCount})
          </button>
          <button
            onClick={() => setStatusFilter('free_active')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'free_active'
                ? 'bg-black text-white'
                : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Free Active ({freeActiveCount})
          </button>
          <button
            onClick={() => setStatusFilter('pro_required')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pro_required'
                ? 'bg-black text-white'
                : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Pro Upgrade Required ({proRequiredCount})
          </button>
          {upgradedCount > 0 && (
            <button
              onClick={() => setStatusFilter('upgraded')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'upgraded'
                  ? 'bg-black text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              Pro Active ({upgradedCount})
            </button>
          )}
        </div>
      </div>

      {/* Copy Alert Toast */}
      {copiedShopName && (
        <div className="bg-black text-white px-4 py-3 rounded-xl border border-black flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-white" />
            <span>Pro upgrade reminder message copied for <strong>{copiedShopName}</strong>! Paste in WhatsApp or SMS.</span>
          </div>
          <button onClick={() => setCopiedShopName(null)} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Quota Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50">
          <div>
            <h2 className="text-base font-extrabold text-black">
              Salon 100 Free Sales Quota Ledger
            </h2>
            <p className="text-neutral-500 text-xs">
              Showing {filteredSummaries.length} of {quotaSummaries.length} registered salons with live sales counts from Supabase.
            </p>
          </div>
          <div className="text-xs text-neutral-600 font-mono bg-white px-3 py-1.5 rounded-lg border border-neutral-200">
            Rule: <strong>100 Free Invoices</strong> since Registration Date
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 border-b border-neutral-200 text-neutral-600 uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="py-3 px-4">Salon & Location</th>
                <th className="py-3 px-4">Registration Date</th>
                <th className="py-3 px-4 text-center">Sales Done</th>
                <th className="py-3 px-4 min-w-[170px]">100 Free Quota Progress</th>
                <th className="py-3 px-4 text-center">Sales Left</th>
                <th className="py-3 px-4">Plan Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-medium">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    No salons found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((salon) => {
                  const key = salon.name.trim().toLowerCase();
                  const isUpgraded = !!upgradedShopPlans[key];

                  return (
                    <tr
                      key={salon.name}
                      className="hover:bg-neutral-50/80 transition-colors group"
                    >
                      {/* Salon & Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-black text-sm">{salon.name}</div>
                        <div className="flex items-center gap-2 text-neutral-500 text-[11px] mt-0.5">
                          <span>{salon.city}</span>
                          <span>•</span>
                          <span className="font-mono">{salon.phone}</span>
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">{salon.registeredDateFormatted}</div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-neutral-400" />
                          <span>{salon.daysActive} days active</span>
                        </div>
                      </td>

                      {/* Sales Done */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-base font-black text-black">
                          {salon.salesDone}
                        </span>
                        <div className="text-[10px] text-neutral-400 uppercase font-bold">invoices</div>
                      </td>

                      {/* 100 Quota Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-neutral-900">
                              {salon.salesDone} <span className="text-neutral-400 font-normal">/ 100</span>
                            </span>
                            <span className="font-mono font-extrabold text-neutral-800">
                              {salon.quotaPercentage}%
                            </span>
                          </div>
                          {/* Progress Track */}
                          <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden p-[1px]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                salon.quotaPercentage >= 100
                                  ? 'bg-black'
                                  : salon.quotaPercentage >= 50
                                  ? 'bg-neutral-800'
                                  : 'bg-black'
                              }`}
                              style={{ width: `${salon.quotaPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Sales Left Until 100 */}
                      <td className="py-3.5 px-4 text-center">
                        {salon.salesRemaining === 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded font-mono font-black text-xs bg-black text-white">
                            0 Left (Reached)
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-extrabold text-xs ${
                              salon.salesRemaining <= 50
                                ? 'bg-neutral-900 text-amber-300 border border-neutral-700'
                                : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                            }`}
                          >
                            {salon.salesRemaining} left
                          </span>
                        )}
                      </td>

                      {/* Plan Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(salon)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Bills */}
                          <button
                            onClick={() => {
                              setSelectedSalonBills(salon);
                              setBillModalDateFilter('');
                            }}
                            title="View bills and invoices for this salon"
                            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:border-black hover:bg-neutral-50 text-neutral-700 hover:text-black font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Bills ({salon.salesDone})</span>
                          </button>

                          {/* Copy Reminder */}
                          <button
                            onClick={() => handleCopyReminder(salon)}
                            title="Copy Pro Upgrade notification message"
                            className="p-1.5 rounded-lg border border-neutral-200 hover:border-black hover:bg-neutral-50 text-neutral-600 hover:text-black transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Pro Plan Selector */}
                          <select
                            value={salon.upgradedPlan || ''}
                            onChange={(e) => {
                              const val = e.target.value as ProPlanTier | '';
                              assignProPlan(key, val ? val : null);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-xs cursor-pointer border transition-colors ${
                              salon.upgradedPlan
                                ? 'bg-black text-white border-black'
                                : salon.status === 'pro_required'
                                ? 'bg-neutral-900 text-amber-300 border-black'
                                : 'bg-white text-neutral-800 border-neutral-300 hover:border-black'
                            }`}
                            title="Assign or upgrade Pro Plan tier"
                          >
                            <option value="" className="bg-white text-black font-semibold">
                              {salon.status === 'pro_required' ? '⚠️ Upgrade to Pro...' : 'Free (100 Limit)'}
                            </option>
                            <option value="3m" className="bg-white text-black font-semibold">
                              Pro 3M (₹1,499)
                            </option>
                            <option value="6m" className="bg-white text-black font-semibold">
                              Pro 6M (₹2,799)
                            </option>
                            <option value="1y" className="bg-white text-black font-semibold">
                              Pro 1Y (₹4,999)
                            </option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* StyleFleet Pro Subscription Plans Showcase */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-black" />
              <h3 className="text-lg font-black text-black">StyleFleet Subscription Plans & Pricing</h3>
            </div>
            <p className="text-neutral-500 text-xs mt-1">
              Official commercial upgrade tiers for salons after completing their 100 free sales quota.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-neutral-100 px-3 py-1.5 rounded-lg text-neutral-700 border border-neutral-200">
            GST Compliant • Instant Activation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Plan 1: Free Starter */}
          <div className="border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-neutral-200 text-neutral-800">
                Registration Free Tier
              </div>
              <h4 className="text-lg font-black text-black">Free Starter</h4>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-black">₹0</span>
                <span className="text-xs text-neutral-500">/ 100 sales</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Active upon registration for all new salons.
              </p>
              <ul className="space-y-2 text-xs text-neutral-700 pt-2 border-t border-neutral-200">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span><strong>100 Free Sales Invoices</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>Single Stylist account</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>Standard digital invoice receipt</span>
                </li>
              </ul>
            </div>
            <div className="pt-3 border-t border-neutral-200 text-[11px] font-bold text-neutral-500 text-center">
              Default Onboarding Tier
            </div>
          </div>

          {/* Plan 2: Pro 3 Months */}
          <div className="border border-neutral-300 rounded-2xl p-5 bg-white flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-3">
              <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black text-white">
                3 Months Plan
              </div>
              <h4 className="text-lg font-black text-black">Pro (3 Months)</h4>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-black">₹1,499</span>
                <span className="text-xs text-neutral-500">/ 3 months</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                ₹500 / month approx. Perfect for quarterly budgeting.
              </p>
              <ul className="space-y-2 text-xs text-neutral-700 pt-2 border-t border-neutral-200">
                <li className="flex items-center gap-2 font-bold text-black">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span><strong>Unlimited Sales & Bills</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>Up to 3 Stylist logins</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>Instant WhatsApp Bill Receipts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>Daily Closing & Revenue Settlement</span>
                </li>
              </ul>
            </div>
            <div className="pt-3 border-t border-neutral-200 text-[11px] font-bold text-neutral-800 text-center flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Instant Activation</span>
            </div>
          </div>

          {/* Plan 3: Pro 6 Months */}
          <div className="border-2 border-black rounded-2xl p-5 bg-white flex flex-col justify-between space-y-4 relative shadow-md">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
              MOST POPULAR
            </div>
            <div className="space-y-3">
              <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black text-white">
                6 Months Plan
              </div>
              <h4 className="text-lg font-black text-black">Pro (6 Months)</h4>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-black">₹2,799</span>
                <span className="text-xs text-neutral-500">/ 6 months</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Save ₹200 vs quarterly (~₹466 / month).
              </p>
              <ul className="space-y-2 text-xs text-neutral-700 pt-2 border-t border-neutral-200">
                <li className="flex items-center gap-2 font-bold text-black">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span><strong>Unlimited Sales & Bills</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>Up to 6 Stylist logins</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>Instant WhatsApp Bill Receipts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>Stylist Commission Tracking</span>
                </li>
              </ul>
            </div>
            <div className="pt-3 border-t border-neutral-200 text-[11px] font-bold text-black text-center flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended Value</span>
            </div>
          </div>

          {/* Plan 4: Pro 1 Year */}
          <div className="border border-neutral-300 rounded-2xl p-5 bg-neutral-900 text-white flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
                BEST VALUE • SAVE ₹1,000
              </div>
              <h4 className="text-lg font-black text-white">Pro (1 Year)</h4>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-white">₹4,999</span>
                <span className="text-xs text-neutral-400">/ year</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                ~₹416 / month. Complete full-year suite for salon owners.
              </p>
              <ul className="space-y-2 text-xs text-neutral-300 pt-2 border-t border-white/10">
                <li className="flex items-center gap-2 font-bold text-white">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span><strong>Unlimited Sales & Bills</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span><strong>Unlimited Stylists & Staff</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Advanced BI & Profit Reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Custom Salon Logo Header</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>VIP WhatsApp Support</span>
                </li>
              </ul>
            </div>
            <div className="pt-3 border-t border-white/10 text-[11px] font-bold text-amber-300 text-center flex items-center justify-center gap-1">
              <Crown className="w-3.5 h-3.5 fill-amber-300" />
              <span>Full Platinum Suite</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drilldown Modal: View Invoices for Selected Salon */}
      {selectedSalonBills && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-300 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-black" />
                  <h3 className="text-base font-black text-black">
                    {selectedSalonBills.name} — Invoice History
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 font-bold">
                    {selectedBillsList.length} Invoices
                  </span>
                </div>
                <div className="text-xs text-neutral-500 flex items-center gap-2">
                  <span>Registered: {selectedSalonBills.registeredDateFormatted}</span>
                  <span>•</span>
                  <span>Quota: {selectedSalonBills.salesDone}/100 Sales ({selectedSalonBills.salesRemaining} left)</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSalonBills(null)}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Date Filter Toolbar */}
            <div className="p-4 border-b border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-700">Filter by Specific Date:</span>
                <input
                  type="date"
                  value={billModalDateFilter}
                  onChange={(e) => setBillModalDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono font-bold bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:border-black"
                />
                {billModalDateFilter && (
                  <button
                    onClick={() => setBillModalDateFilter('')}
                    className="text-xs text-neutral-500 hover:text-black underline"
                  >
                    Clear Date
                  </button>
                )}
              </div>

              <ExportButton
                data={selectedBillsList.map((b) => ({
                  'Bill ID': b.id,
                  'Invoice Number': b.invoice_number || b.id.slice(0, 8),
                  'Date': b.created_at ? formatDateTime(b.created_at) : '—',
                  'Customer Name': b.customer?.name || 'Walk-in',
                  'Customer Phone': b.customer?.phone || '—',
                  'Stylist': b.staff_id ? `Staff #${b.staff_id.slice(0, 6)}` : 'Unassigned',
                  'Amount (₹)': Math.round((b.total_minor || 0) / 100),
                  'Payment Method': paymentMethodByBillId.get(b.id) || 'cash',
                  'Status': b.status || 'paid',
                }))}
                filename={`${selectedSalonBills.name.replace(/\s+/g, '_')}_bills`}
                label="Export Invoices (CSV)"
              />
            </div>

            {/* Modal Invoices Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedBillsList.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-xs">
                  No invoices found for this date.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] font-extrabold tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Stylist</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium">
                    {selectedBillsList.map((bill, index) => {
                      const method = paymentMethodByBillId.get(bill.id) || 'cash';
                      return (
                        <tr key={bill.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-neutral-500 font-bold">
                            #{index + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-neutral-900">
                              {formatDateTime(bill.created_at)}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-400">
                              {bill.invoice_number || bill.id.slice(0, 10)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-black">
                              {bill.customer?.name || 'Walk-in Customer'}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-500">
                              {bill.customer?.phone || '—'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-700">
                            {bill.staff_id ? `Staff #${bill.staff_id.slice(0, 6)}` : 'Unassigned'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-black">
                            {formatCurrency(bill.total_minor || 0)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm bg-neutral-100 text-neutral-700 border border-neutral-200">
                              {method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-black text-white">
                              {bill.status || 'paid'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs font-bold">
              <div className="text-neutral-600">
                Total Billed: <span className="font-mono text-black font-extrabold">{formatCurrency(selectedSalonBills.totalBilledMinor)}</span>
              </div>
              <button
                onClick={() => setSelectedSalonBills(null)}
                className="px-4 py-2 bg-black text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
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
