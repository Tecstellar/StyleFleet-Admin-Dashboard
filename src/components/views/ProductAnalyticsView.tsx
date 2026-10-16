import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  Clock,
  Crown,
  AlertTriangle,
  Users,
  RefreshCw,
  ArrowDownRight,
  Flame,
  CheckCircle2,
  Info,
  ExternalLink,
  MessageCircle,
  Phone,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Send,
  Sliders,
  Layers,
  Activity,
  Compass,
} from 'lucide-react';
import { ExportButton } from '../common/ExportButton';
import {
  getProductAnalyticsData,
  ProductAnalyticsPayload,
} from '../../services/productAnalyticsService';
import { PRODUCT_ANALYTICS_CONFIG } from '../../config/productAnalyticsConfig';
import { Shop, Bill, Customer, Staff, Payment } from '../../types/database';
import { NavView } from '../../types/dashboard';

interface ProductAnalyticsViewProps {
  shops: Shop[];
  bills: Bill[];
  customers: Customer[];
  staff: Staff[];
  appointments?: any[];
  payments?: Payment[];
  telemetryRecords?: any[];
  loading?: boolean;
  onNavigate?: (view: NavView) => void;
}

export const ProductAnalyticsView: React.FC<ProductAnalyticsViewProps> = ({
  shops,
  bills,
  customers,
  staff,
  payments = [],
  loading: parentLoading = false,
  onNavigate,
}) => {
  const [data, setData] = useState<ProductAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [csSearch, setCsSearch] = useState('');
  const [csPriorityFilter, setCsPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [csReasonFilter, setCsReasonFilter] = useState<string>('All');
  const [csPage, setCsPage] = useState(1);
  const csPageSize = 10;

  // Fetch or refresh product analytics payload
  const loadAnalytics = async (bypassCache = false) => {
    if (bypassCache) setIsRefreshing(true);
    else setLoading(true);

    try {
      const payload = await getProductAnalyticsData(bypassCache, {
        shops,
        bills,
        customers,
        staff,
        payments,
      });
      setData(payload);
    } catch (err) {
      console.error('Failed to load product analytics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics(false);
  }, [shops, bills, customers, staff, payments]);

  // Customer Success Opportunities Filtering & Pagination
  const filteredCSOpps = useMemo(() => {
    if (!data?.csOpportunities) return [];
    return data.csOpportunities.filter((item) => {
      const matchesSearch =
        csSearch.trim() === '' ||
        item.shopName.toLowerCase().includes(csSearch.toLowerCase()) ||
        item.phone.toLowerCase().includes(csSearch.toLowerCase()) ||
        item.city.toLowerCase().includes(csSearch.toLowerCase()) ||
        item.reason.toLowerCase().includes(csSearch.toLowerCase());

      const matchesPriority =
        csPriorityFilter === 'All' || item.priority === csPriorityFilter;

      const matchesReason =
        csReasonFilter === 'All' || item.reason === csReasonFilter;

      return matchesSearch && matchesPriority && matchesReason;
    });
  }, [data?.csOpportunities, csSearch, csPriorityFilter, csReasonFilter]);

  const totalCsPages = Math.max(1, Math.ceil(filteredCSOpps.length / csPageSize));
  const paginatedCSOpps = useMemo(() => {
    const start = (csPage - 1) * csPageSize;
    return filteredCSOpps.slice(start, start + csPageSize);
  }, [filteredCSOpps, csPage]);

  // Loading skeleton view
  if ((loading || parentLoading) && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-100 rounded-2xl w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-28 bg-slate-100 rounded-2xl w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-100 rounded-2xl" />
          <div className="h-80 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 font-sans select-none">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-[#071952]/15">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#071952] text-white shadow-2xs">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-black">
                  Product Analytics
                </h1>
                {data.isCached && (
                  <span className="text-[10px] text-black/50 font-mono">
                    (Cached 5m)
                  </span>
                )}
              </div>
              <p className="text-xs text-black/60 mt-0.5 max-w-3xl leading-relaxed">
                Complete product analytics engine: user journeys, funnels, engagement scores, screen analytics, interaction heat intelligence, founder insights, and Customer Success opportunities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <span className="text-xs font-mono text-[#071952] bg-[#071952]/10 px-2.5 py-1.5 rounded-lg border border-[#071952]/20">
            Updated {data.updatedAt}
          </span>
          <button
            onClick={() => loadAnalytics(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8F3F0] border border-[#071952]/20 text-black hover:bg-[#071952]/10 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Bypass cache and refetch fresh metrics from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#071952]' : 'text-black/70'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 1. SUMMARY CARDS (6 CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Time to first order */}
        <div className="bg-[#F8F3F0] p-3.5 rounded-xl border border-[#071952]/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-black/60">
            <span className="text-[11px] font-medium truncate">Time to First {PRODUCT_ANALYTICS_CONFIG.app.coreActionSingular}</span>
            <Clock className="w-3.5 h-3.5 text-[#071952]" />
          </div>
          <div className="text-xl font-bold font-mono text-black">
            {data.summary.timeToFirstOrderDays} <span className="text-xs font-sans font-medium text-black/60">days</span>
          </div>
          <p className="text-[10px] text-black/50 truncate">Registration to first sale</p>
        </div>

        {/* Card 2: Time to subscription */}
        <div className="bg-[#F8F3F0] p-3.5 rounded-xl border border-[#071952]/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-black/60">
            <span className="text-[11px] font-medium truncate">Time to Subscribe</span>
            <Crown className="w-3.5 h-3.5 text-[#071952]" />
          </div>
          <div className="text-xl font-bold font-mono text-black">
            {data.summary.timeToSubscriptionDays} <span className="text-xs font-sans font-medium text-black/60">days</span>
          </div>
          <p className="text-[10px] text-black/50 truncate">Registration to paid plan</p>
        </div>

        {/* Card 3: Subscription conversion % */}
        <div className="bg-[#F8F3F0] p-3.5 rounded-xl border border-[#071952]/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-black/60">
            <span className="text-[11px] font-medium truncate">Sub Conversion</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#071952]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#071952]">
            {data.summary.subscriptionConversionRate}%
          </div>
          <p className="text-[10px] text-black/50 truncate">Subscribers / pricing viewers</p>
        </div>

        {/* Card 4: Most used feature */}
        <div className="bg-[#F8F3F0] p-3.5 rounded-xl border border-[#071952]/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-black/60">
            <span className="text-[11px] font-medium truncate">Most Used Feature</span>
            <Flame className="w-3.5 h-3.5 text-[#071952]" />
          </div>
          <div className="text-sm font-bold text-black truncate" title={data.summary.mostUsedFeature.name}>
            {data.summary.mostUsedFeature.name.split('>')[1]?.trim() || data.summary.mostUsedFeature.name}
          </div>
          <p className="text-[10px] text-black/60 font-mono">
            {data.summary.mostUsedFeature.count} interactions
          </p>
        </div>

        {/* Card 5: Highest drop-off */}
        <div className="bg-[#F8F3F0] p-3.5 rounded-xl border border-[#071952]/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-black/60">
            <span className="text-[11px] font-medium truncate">Highest Drop-off</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-black/80" />
          </div>
          <div className="text-xl font-bold font-mono text-black">
            {data.summary.highestDropOff.dropOffPercent}%
          </div>
          <p className="text-[10px] text-black/50 truncate" title={data.summary.highestDropOff.step}>
            {data.summary.highestDropOff.step}
          </p>
        </div>

        {/* Card 6: CS opportunities */}
        <div className="bg-[#F8F3F0] p-3.5 rounded-xl border border-[#071952]/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-black/60">
            <span className="text-[11px] font-medium truncate">CS Opportunities</span>
            <Users className="w-3.5 h-3.5 text-[#071952]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#071952]">
            {data.summary.csOpportunitiesCount}
          </div>
          <p className="text-[10px] text-black/50 truncate">Auto-detected outreach</p>
        </div>
      </div>

      {/* 2. ALERTS PANEL */}
      <div className="p-4 rounded-xl border border-[#071952]/20 bg-[#F8F3F0] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#071952] shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-black">
              Rule-Based Operational Alerts
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#071952] bg-[#071952]/10 px-2 py-0.5 rounded border border-[#071952]/20 font-semibold">
            Threshold: Exit &gt;= {(PRODUCT_ANALYTICS_CONFIG.alerts.highDropOffExitRateThreshold * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Alert Item 1: High Drop-Off Screens */}
          <div className="p-3 bg-[#F8F3F0] rounded-lg border border-[#071952]/20 shadow-2xs">
            <div className="text-[10px] font-semibold text-black/60 uppercase tracking-wider">
              High Drop-off Screens
            </div>
            {data.alerts.highDropOffScreens.length > 0 ? (
              data.alerts.highDropOffScreens.map((s, idx) => (
                <div key={idx} className="mt-1 flex items-center justify-between">
                  <span className="font-mono font-medium text-black text-[11px]">{s.screen}</span>
                  <span className="font-mono font-bold text-black bg-[#071952]/10 px-1.5 py-0.2 rounded border border-[#071952]/20 text-[11px]">
                    {s.exitRatePercent}% exit
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-black/60 mt-1">All screens below 50% exit threshold.</p>
            )}
          </div>

          {/* Alert Item 2: Users Likely to Subscribe */}
          <div className="p-3 bg-[#F8F3F0] rounded-lg border border-[#071952]/20 shadow-2xs">
            <div className="text-[10px] font-semibold text-black/60 uppercase tracking-wider">
              Users Likely to Subscribe
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold font-mono text-black">
                {data.alerts.likelyToSubscribeCount}
              </span>
              <span className="text-[11px] text-black/60">
                {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} viewed pricing without paying
              </span>
            </div>
          </div>

          {/* Alert Item 3: Users Likely to Churn */}
          <div className="p-3 bg-[#F8F3F0] rounded-lg border border-[#071952]/20 shadow-2xs">
            <div className="text-[10px] font-semibold text-black/60 uppercase tracking-wider">
              At-Risk / Inactive Users
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold font-mono text-black">
                {data.alerts.likelyToChurnCount}
              </span>
              <span className="text-[11px] text-black/60">
                {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} dormant &gt; 7 days or score &lt; 35
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FUNNELS SECTION (TWO-COLUMN RESPONSIVE GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. USER JOURNEY FUNNEL */}
        <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#071952]" />
              <h3 className="text-sm font-bold text-black">User Journey Funnel</h3>
            </div>
            <span className="text-[10px] text-black/50 uppercase font-mono tracking-wider">
              Lifecycle Conversion
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#071952]/5 text-black/70 font-semibold border-b border-[#071952]/20">
                <tr>
                  <th className="py-2 px-2.5">Step</th>
                  <th className="py-2 px-2.5 text-right">Users</th>
                  <th className="py-2 px-2.5 text-right">From Prev</th>
                  <th className="py-2 px-2.5 text-right">From Start</th>
                  <th className="py-2 px-2.5 text-right">Drop-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#071952]/10 text-black">
                {data.funnels.userJourney.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#071952]/5 transition-colors">
                    <td className="py-2.5 px-2.5 font-medium text-black">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#071952]/10 text-[#071952] font-mono text-[10px] flex items-center justify-center shrink-0 font-bold">
                          {idx + 1}
                        </span>
                        <span>{row.step}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-black">
                      {row.users}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-black/70">
                      {row.fromPrevPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-black/70">
                      {row.fromStartPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-black font-semibold">
                      {row.dropOffPercent > 0 ? (
                        <span>
                          {row.dropOffPercent}% <span className="text-[10px] text-black/40">(-{row.dropOffCount})</span>
                        </span>
                      ) : (
                        <span className="text-black/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. SUBSCRIPTION FUNNEL */}
        <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#071952]" />
              <h3 className="text-sm font-bold text-black">Subscription Funnel</h3>
            </div>
            <span className="text-[10px] text-black/50 uppercase font-mono tracking-wider">
              Pricing to Paid
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#071952]/5 text-black/70 font-semibold border-b border-[#071952]/20">
                <tr>
                  <th className="py-2 px-2.5">Step</th>
                  <th className="py-2 px-2.5 text-right">Users</th>
                  <th className="py-2 px-2.5 text-right">From Prev</th>
                  <th className="py-2 px-2.5 text-right">From Start</th>
                  <th className="py-2 px-2.5 text-right">Drop-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#071952]/10 text-black">
                {data.funnels.subscription.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#071952]/5 transition-colors">
                    <td className="py-2.5 px-2.5 font-medium text-black">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#071952]/10 text-[#071952] font-mono text-[10px] flex items-center justify-center shrink-0 font-bold">
                          {idx + 1}
                        </span>
                        <span>{row.step}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-black">
                      {row.users}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-black/70">
                      {row.fromPrevPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-black/70">
                      {row.fromStartPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-black font-semibold">
                      {row.dropOffPercent > 0 ? (
                        <span>
                          {row.dropOffPercent}% <span className="text-[10px] text-black/40">(-{row.dropOffCount})</span>
                        </span>
                      ) : (
                        <span className="text-black/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. CORE ACTION FUNNEL & 7. ENGAGEMENT DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Action Funnel */}
        <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#071952]" />
              <h3 className="text-sm font-bold text-black">
                Core Action Funnel ({PRODUCT_ANALYTICS_CONFIG.app.coreActionSingular} Generation)
              </h3>
            </div>
            <span className="text-[10px] text-black/50 uppercase font-mono tracking-wider">
              Terminal POS Flow
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#071952]/5 text-black/70 font-semibold border-b border-[#071952]/20">
                <tr>
                  <th className="py-2 px-2.5">Step</th>
                  <th className="py-2 px-2.5 text-right">Volume</th>
                  <th className="py-2 px-2.5 text-right">From Prev</th>
                  <th className="py-2 px-2.5 text-right">From Start</th>
                  <th className="py-2 px-2.5 text-right">Drop-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#071952]/10 text-black">
                {data.funnels.coreAction.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#071952]/5 transition-colors">
                    <td className="py-2.5 px-2.5 font-medium text-black">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#071952]/10 text-[#071952] font-mono text-[10px] flex items-center justify-center shrink-0 font-bold">
                          {idx + 1}
                        </span>
                        <span>{row.step}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-black">
                      {row.users}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-black/70">
                      {row.fromPrevPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-black/70">
                      {row.fromStartPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-black font-semibold">
                      {row.dropOffPercent > 0 ? (
                        <span>{row.dropOffPercent}%</span>
                      ) : (
                        <span className="text-black/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. ENGAGEMENT DISTRIBUTION */}
        <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#071952]" />
              <h3 className="text-sm font-bold text-black">Engagement Distribution</h3>
            </div>
            <span className="text-[10px] text-black/50 uppercase font-mono tracking-wider">
              30-Day Activity Score
            </span>
          </div>

          <p className="text-xs text-black/60">
            Scored (0-100) per {PRODUCT_ANALYTICS_CONFIG.app.entitySingular.toLowerCase()} across recency of last action, sales frequency, staff size, and customer volume.
          </p>

          <div className="space-y-3 text-xs">
            {/* Highly engaged */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#071952]" />
                  Highly Engaged (Score &gt;= 70)
                </span>
                <span className="font-mono text-black font-semibold">
                  {data.engagement.distribution.highlyEngaged.count} {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} ({data.engagement.distribution.highlyEngaged.percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#071952]/10 overflow-hidden">
                <div
                  className="h-full bg-[#071952] rounded-full transition-all duration-500"
                  style={{ width: `${data.engagement.distribution.highlyEngaged.percent}%` }}
                />
              </div>
            </div>

            {/* Moderately engaged */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#071952]/70" />
                  Moderately Engaged (Score 40 - 69)
                </span>
                <span className="font-mono text-black font-semibold">
                  {data.engagement.distribution.moderatelyEngaged.count} {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} ({data.engagement.distribution.moderatelyEngaged.percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#071952]/10 overflow-hidden">
                <div
                  className="h-full bg-[#071952]/70 rounded-full transition-all duration-500"
                  style={{ width: `${data.engagement.distribution.moderatelyEngaged.percent}%` }}
                />
              </div>
            </div>

            {/* At risk */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/80 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#071952]/40" />
                  At Risk (Score 20 - 39)
                </span>
                <span className="font-mono text-black font-semibold">
                  {data.engagement.distribution.atRisk.count} {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} ({data.engagement.distribution.atRisk.percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#071952]/10 overflow-hidden">
                <div
                  className="h-full bg-[#071952]/40 rounded-full transition-all duration-500"
                  style={{ width: `${data.engagement.distribution.atRisk.percent}%` }}
                />
              </div>
            </div>

            {/* Inactive */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black/60 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-black/30" />
                  Inactive (Score &lt; 20)
                </span>
                <span className="font-mono text-black font-semibold">
                  {data.engagement.distribution.inactive.count} {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} ({data.engagement.distribution.inactive.percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#071952]/10 overflow-hidden">
                <div
                  className="h-full bg-black/30 rounded-full transition-all duration-500"
                  style={{ width: `${data.engagement.distribution.inactive.percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. TOP 20 INTERACTIONS & 8. SCREEN ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 20 Interactions */}
        <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#071952]" />
              <h3 className="text-sm font-bold text-black">Top 20 User Interactions</h3>
            </div>
            <span className="text-[10px] text-black/50 uppercase font-mono tracking-wider">
              Heat Intelligence
            </span>
          </div>

          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#071952]/5 text-black/70 font-semibold sticky top-0 border-b border-[#071952]/20">
                <tr>
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Interaction Name</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#071952]/10 text-black">
                {data.interactions.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#071952]/5 transition-colors">
                    <td className="py-2 px-2 text-black/50 font-mono text-[10px]">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium text-black truncate max-w-[220px]">
                      {item.interaction}
                    </td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#071952]/10 text-[#071952] border border-[#071952]/20">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-black">
                      {item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8. Screen Analytics & 9. Scroll Depth */}
        <div className="space-y-6">
          {/* Screen Analytics */}
          <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#071952]" />
                <h3 className="text-sm font-bold text-black">Screen Analytics</h3>
              </div>
              <span className="text-[10px] text-black/50 uppercase font-mono tracking-wider">
                View &amp; Exit Rates
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#071952]/5 text-black/70 font-semibold border-b border-[#071952]/20">
                  <tr>
                    <th className="py-2 px-2">Screen</th>
                    <th className="py-2 px-2 text-right">Visits</th>
                    <th className="py-2 px-2 text-right">Users</th>
                    <th className="py-2 px-2 text-right">Exit %</th>
                    <th className="py-2 px-2">Top Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#071952]/10 text-black">
                  {data.screens.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#071952]/5 transition-colors">
                      <td className="py-2 px-2 font-mono text-black text-[11px] font-medium">{row.screen}</td>
                      <td className="py-2 px-2 text-right font-mono text-black/70">{row.visits}</td>
                      <td className="py-2 px-2 text-right font-mono text-black/70">{row.users}</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">
                        <span className="text-black">
                          {row.exitPercent}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-black/60 truncate max-w-[140px]">{row.topClicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 9. Scroll Depth */}
          <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-black">Scroll Depth Progression</h3>
              <span className="text-[10px] text-black/50 font-mono uppercase">App Telemetry</span>
            </div>

            {data.scroll.depths.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#071952]/5 text-black/70 font-semibold border-b border-[#071952]/20">
                    <tr>
                      <th className="py-2 px-2">Screen</th>
                      <th className="py-2 px-2 text-center">25%</th>
                      <th className="py-2 px-2 text-center">50%</th>
                      <th className="py-2 px-2 text-center">75%</th>
                      <th className="py-2 px-2 text-center">100%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#071952]/10 text-black">
                    {data.scroll.depths.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#071952]/5 transition-colors">
                        <td className="py-2 px-2 font-mono text-black text-[11px]">{row.screen}</td>
                        <td className="py-2 px-2 text-center font-mono text-black/70">{row.d25}%</td>
                        <td className="py-2 px-2 text-center font-mono text-black/70">{row.d50}%</td>
                        <td className="py-2 px-2 text-center font-mono text-black/70">{row.d75}%</td>
                        <td className="py-2 px-2 text-center font-mono text-black/70">{row.d100}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[#071952]/10 border border-[#071952]/20 text-black text-xs flex items-center gap-2.5">
                <Info className="w-4 h-4 text-[#071952] shrink-0" />
                <span>Scroll tracking activates on app screens with scroll analytics enabled.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 10. FOUNDER INSIGHTS (TWO CARDS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Why users subscribe */}
        <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#071952]" />
            <h3 className="text-sm font-bold text-black">Why Users Subscribe</h3>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-[#071952]/5 p-3 rounded-lg border border-[#071952]/15 text-xs">
            <div>
              <span className="text-[10px] text-black/70 font-medium block">Setup Prior to Sub</span>
              <span className="text-base font-bold font-mono text-black">
                {data.insights.whyUsersSubscribe.hasCoreDataBeforePayingPercent}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black/70 font-medium block">Pricing Viewed</span>
              <span className="text-base font-bold font-mono text-black">
                {data.insights.whyUsersSubscribe.viewedPricingBeforePayingPercent}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black/70 font-medium block">Avg Core Actions</span>
              <span className="text-base font-bold font-mono text-black">
                {data.insights.whyUsersSubscribe.avgCoreActionsBeforeSubscribing}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-black uppercase tracking-wider">
              Top Conversion Drivers
            </div>
            <div className="space-y-1 text-xs">
              {data.insights.whyUsersSubscribe.conversionDrivers.map((cd, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded bg-[#F8F3F0] border border-[#071952]/15">
                  <span className="font-medium text-black">{cd.event}</span>
                  <span className="font-mono text-[#071952] font-semibold">{cd.percent}% ({cd.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Why users do not subscribe */}
        <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#071952]" />
            <h3 className="text-sm font-bold text-black">Why Users Do Not Subscribe</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#071952]/5 p-3 rounded-lg border border-[#071952]/15 text-xs">
            <div>
              <span className="text-[10px] text-black/70 font-medium block">No Setup Data</span>
              <span className="text-base font-bold font-mono text-black">
                {data.insights.whyUsersDoNotSubscribe.noSetupDataCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black/70 font-medium block">Zero Sales</span>
              <span className="text-base font-bold font-mono text-black">
                {data.insights.whyUsersDoNotSubscribe.zeroCoreActionsCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black/70 font-medium block">Pricing Drop-off</span>
              <span className="text-base font-bold font-mono text-black">
                {data.insights.whyUsersDoNotSubscribe.viewedPricingDidNotPayCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black/70 font-medium block">Inactive &gt; 7d</span>
              <span className="text-base font-bold font-mono text-black">
                {data.insights.whyUsersDoNotSubscribe.inactive7DaysPlusCount}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-black uppercase tracking-wider">
              Early Churn Signals
            </div>
            <div className="space-y-1 text-xs">
              {data.insights.whyUsersDoNotSubscribe.churnSignals.map((cs, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded bg-[#F8F3F0] border border-[#071952]/15">
                  <span className="font-medium text-black">{cs.signal}</span>
                  <span className="font-mono text-black/80 font-semibold">{cs.percent}% ({cs.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 11. TOP CITIES AND TOP STATES BY ENGAGEMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Cities */}
        <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
          <h3 className="text-sm font-bold text-black">Top Cities by Engagement</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#071952]/5 text-black/70 font-semibold border-b border-[#071952]/20">
                <tr>
                  <th className="py-2 px-2.5">City</th>
                  <th className="py-2 px-2.5 text-right">Users</th>
                  <th className="py-2 px-2.5 text-right">Engaged</th>
                  <th className="py-2 px-2.5 text-right">Subscribers</th>
                  <th className="py-2 px-2.5 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#071952]/10 text-black">
                {data.geo.topCities.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[#071952]/5 transition-colors">
                    <td className="py-2 px-2.5 font-medium text-black">{c.city}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-black/70">{c.users}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-[#071952] font-semibold">{c.engaged}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-[#071952] font-semibold">{c.subscribers}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-black">{c.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top States */}
        <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-3 shadow-2xs">
          <h3 className="text-sm font-bold text-black">Top States by Engagement</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#071952]/5 text-black/70 font-semibold border-b border-[#071952]/20">
                <tr>
                  <th className="py-2 px-2.5">State</th>
                  <th className="py-2 px-2.5 text-right">Users</th>
                  <th className="py-2 px-2.5 text-right">Engaged</th>
                  <th className="py-2 px-2.5 text-right">Subscribers</th>
                  <th className="py-2 px-2.5 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#071952]/10 text-black">
                {data.geo.topStates.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#071952]/5 transition-colors">
                    <td className="py-2 px-2.5 font-medium text-black">{s.state}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-black/70">{s.users}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-[#071952] font-semibold">{s.engaged}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-[#071952] font-semibold">{s.subscribers}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-black">{s.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 12. CUSTOMER SUCCESS OPPORTUNITIES (OUTREACH ENGINE) */}
      <div className="bg-[#F8F3F0] rounded-xl border border-[#071952]/20 p-4 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#071952]" />
              <h3 className="text-sm font-bold text-black">
                Customer Success Opportunities ({filteredCSOpps.length})
              </h3>
            </div>
            <p className="text-xs text-black/60 mt-0.5">
              Auto-detected users and salons requiring proactive outreach, onboarding support, or churn intervention.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ExportButton
              data={filteredCSOpps}
              filename="customer_success_opportunities.csv"
              columns={[
                { key: 'priority', label: 'Priority' },
                { key: 'shopName', label: 'Salon / User' },
                { key: 'phone', label: 'Phone' },
                { key: 'city', label: 'City' },
                { key: 'reason', label: 'Reason' },
                { key: 'detail', label: 'Detail' },
              ]}
            />
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-black/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={csSearch}
              onChange={(e) => {
                setCsSearch(e.target.value);
                setCsPage(1);
              }}
              placeholder="Search salon, phone, city, or reason..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#071952]/20 bg-[#F8F3F0] text-xs text-black focus:outline-none focus:border-[#071952]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Filter */}
            <div className="flex items-center gap-1 bg-[#071952]/10 p-1 rounded-lg text-xs border border-[#071952]/15">
              {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setCsPriorityFilter(p);
                    setCsPage(1);
                  }}
                  className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                    csPriorityFilter === p
                      ? 'bg-[#071952] text-white font-bold shadow-2xs'
                      : 'text-black/70 hover:text-black'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Reason Filter Dropdown */}
            <select
              value={csReasonFilter}
              onChange={(e) => {
                setCsReasonFilter(e.target.value);
                setCsPage(1);
              }}
              className="py-1.5 px-2 rounded-lg border border-[#071952]/20 text-xs text-black bg-[#F8F3F0] focus:outline-none focus:border-[#071952]"
            >
              <option value="All">All Reasons</option>
              <option value="Viewed subscription, did not pay">Viewed subscription, did not pay</option>
              <option value="Inactive 7+ days">Inactive 7+ days</option>
              <option value="Customer added, no order">Customer added, no order</option>
              <option value="Profile completed, no customer added">Profile completed, no customer added</option>
            </select>
          </div>
        </div>

        {/* Opportunities Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#071952]/5 text-black/70 font-semibold border-b border-[#071952]/20">
              <tr>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Salon / User</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">Trigger Reason</th>
                <th className="py-2.5 px-3">Context Detail</th>
                <th className="py-2.5 px-3 text-right">Outreach Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#071952]/10 text-black">
              {paginatedCSOpps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-black/50">
                    No customer success opportunities match the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedCSOpps.map((opp) => {
                  const cleanPhone = opp.phone.replace(/\D/g, '').slice(-10);
                  return (
                    <tr key={opp.id} className="hover:bg-[#071952]/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            opp.priority === 'High'
                              ? 'bg-[#071952] text-white'
                              : opp.priority === 'Medium'
                              ? 'bg-[#071952]/15 text-[#071952] border border-[#071952]/30'
                              : 'bg-[#F8F3F0] text-black/70 border border-[#071952]/20'
                          }`}
                        >
                          {opp.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-black">
                        {opp.shopName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-black/70">
                        {opp.phone}
                      </td>
                      <td className="py-2.5 px-3 text-black/80">
                        {opp.city}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-black">
                        {opp.reason}
                      </td>
                      <td className="py-2.5 px-3 text-black/60 max-w-xs truncate" title={opp.detail}>
                        {opp.detail}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cleanPhone && (
                            <>
                              <a
                                href={`https://wa.me/91${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#071952] text-white hover:bg-[#0b2575] text-[11px] font-semibold transition-colors"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="p-1 rounded text-black/60 hover:text-black hover:bg-[#071952]/10"
                                title="Direct Phone Call"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (onNavigate) onNavigate('support_messages');
                            }}
                            className="p-1 rounded text-black/60 hover:text-[#071952] hover:bg-[#071952]/10"
                            title="Send Push Notification Shortcut"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCsPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-[#071952]/15 text-xs text-black/60">
            <span>
              Showing {(csPage - 1) * csPageSize + 1} to{' '}
              {Math.min(csPage * csPageSize, filteredCSOpps.length)} of {filteredCSOpps.length} opportunities
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCsPage((p) => Math.max(1, p - 1))}
                disabled={csPage === 1}
                className="p-1.5 rounded border border-[#071952]/20 hover:bg-[#071952]/10 disabled:opacity-40 cursor-pointer text-black"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono px-2 font-medium text-black">
                {csPage} / {totalCsPages}
              </span>
              <button
                onClick={() => setCsPage((p) => Math.min(totalCsPages, p + 1))}
                disabled={csPage === totalCsPages}
                className="p-1.5 rounded border border-[#071952]/20 hover:bg-[#071952]/10 disabled:opacity-40 cursor-pointer text-black"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
