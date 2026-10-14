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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-white shadow-2xs">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Product Analytics
                </h1>
                {data.isCached && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Cached 5m)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
                Complete product analytics engine: user journeys, funnels, engagement scores, screen analytics, interaction heat intelligence, founder insights, and Customer Success opportunities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
            Updated {data.updatedAt}
          </span>
          <button
            onClick={() => loadAnalytics(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Bypass cache and refetch fresh metrics from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 1. SUMMARY CARDS (6 CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Time to first order */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium truncate">Time to First {PRODUCT_ANALYTICS_CONFIG.app.coreActionSingular}</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {data.summary.timeToFirstOrderDays} <span className="text-xs font-sans font-medium text-slate-500">days</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">Registration to first sale</p>
        </div>

        {/* Card 2: Time to subscription */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium truncate">Time to Subscribe</span>
            <Crown className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {data.summary.timeToSubscriptionDays} <span className="text-xs font-sans font-medium text-slate-500">days</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">Registration to paid plan</p>
        </div>

        {/* Card 3: Subscription conversion % */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium truncate">Sub Conversion</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {data.summary.subscriptionConversionRate}%
          </div>
          <p className="text-[10px] text-slate-400 truncate">Subscribers / pricing viewers</p>
        </div>

        {/* Card 4: Most used feature */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium truncate">Most Used Feature</span>
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate" title={data.summary.mostUsedFeature.name}>
            {data.summary.mostUsedFeature.name.split('>')[1]?.trim() || data.summary.mostUsedFeature.name}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {data.summary.mostUsedFeature.count} interactions
          </p>
        </div>

        {/* Card 5: Highest drop-off */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium truncate">Highest Drop-off</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-600">
            {data.summary.highestDropOff.dropOffPercent}%
          </div>
          <p className="text-[10px] text-slate-400 truncate" title={data.summary.highestDropOff.step}>
            {data.summary.highestDropOff.step}
          </p>
        </div>

        {/* Card 6: CS opportunities */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium truncate">CS Opportunities</span>
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-700">
            {data.summary.csOpportunitiesCount}
          </div>
          <p className="text-[10px] text-slate-400 truncate">Auto-detected outreach</p>
        </div>
      </div>

      {/* 2. ALERTS PANEL (RULE-BASED, COLOR-CODED) */}
      <div className="p-4 rounded-xl border border-amber-200/90 bg-amber-50/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Rule-Based Operational Alerts
            </h3>
          </div>
          <span className="text-[10px] font-mono text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
            Threshold: Exit &gt;= {(PRODUCT_ANALYTICS_CONFIG.alerts.highDropOffExitRateThreshold * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Alert Item 1: High Drop-Off Screens */}
          <div className="p-3 bg-white rounded-lg border border-amber-200/70 shadow-2xs">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              High Drop-off Screens
            </div>
            {data.alerts.highDropOffScreens.length > 0 ? (
              data.alerts.highDropOffScreens.map((s, idx) => (
                <div key={idx} className="mt-1 flex items-center justify-between">
                  <span className="font-mono font-medium text-slate-800 text-[11px]">{s.screen}</span>
                  <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 text-[11px]">
                    {s.exitRatePercent}% exit
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-600 mt-1">All screens below 50% exit threshold.</p>
            )}
          </div>

          {/* Alert Item 2: Users Likely to Subscribe */}
          <div className="p-3 bg-white rounded-lg border border-amber-200/70 shadow-2xs">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Users Likely to Subscribe
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold font-mono text-slate-900">
                {data.alerts.likelyToSubscribeCount}
              </span>
              <span className="text-[11px] text-slate-500">
                {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} viewed pricing without paying
              </span>
            </div>
          </div>

          {/* Alert Item 3: Users Likely to Churn */}
          <div className="p-3 bg-white rounded-lg border border-amber-200/70 shadow-2xs">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              At-Risk / Inactive Users
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold font-mono text-rose-600">
                {data.alerts.likelyToChurnCount}
              </span>
              <span className="text-[11px] text-slate-500">
                {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} dormant &gt; 7 days or score &lt; 35
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FUNNELS SECTION (TWO-COLUMN RESPONSIVE GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. USER JOURNEY FUNNEL */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">User Journey Funnel</h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Lifecycle Conversion
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">Step</th>
                  <th className="py-2 px-2.5 text-right">Users</th>
                  <th className="py-2 px-2.5 text-right">From Prev</th>
                  <th className="py-2 px-2.5 text-right">From Start</th>
                  <th className="py-2 px-2.5 text-right">Drop-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.funnels.userJourney.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-2.5 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{row.step}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-800">
                      {row.users}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                      {row.fromPrevPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                      {row.fromStartPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-rose-600">
                      {row.dropOffPercent > 0 ? (
                        <span>
                          {row.dropOffPercent}% <span className="text-[10px] text-slate-400">(-{row.dropOffCount})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. SUBSCRIPTION FUNNEL */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Subscription Funnel</h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Pricing to Paid
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">Step</th>
                  <th className="py-2 px-2.5 text-right">Users</th>
                  <th className="py-2 px-2.5 text-right">From Prev</th>
                  <th className="py-2 px-2.5 text-right">From Start</th>
                  <th className="py-2 px-2.5 text-right">Drop-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.funnels.subscription.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-2.5 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{row.step}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-800">
                      {row.users}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                      {row.fromPrevPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                      {row.fromStartPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-rose-600">
                      {row.dropOffPercent > 0 ? (
                        <span>
                          {row.dropOffPercent}% <span className="text-[10px] text-slate-400">(-{row.dropOffCount})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
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
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Core Action Funnel ({PRODUCT_ANALYTICS_CONFIG.app.coreActionSingular} Generation)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Terminal POS Flow
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">Step</th>
                  <th className="py-2 px-2.5 text-right">Volume</th>
                  <th className="py-2 px-2.5 text-right">From Prev</th>
                  <th className="py-2 px-2.5 text-right">From Start</th>
                  <th className="py-2 px-2.5 text-right">Drop-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.funnels.coreAction.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-2.5 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{row.step}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-800">
                      {row.users}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                      {row.fromPrevPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                      {row.fromStartPercent}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-rose-600">
                      {row.dropOffPercent > 0 ? (
                        <span>{row.dropOffPercent}%</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. ENGAGEMENT DISTRIBUTION */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Engagement Distribution</h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              30-Day Activity Score
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Scored (0-100) per {PRODUCT_ANALYTICS_CONFIG.app.entitySingular.toLowerCase()} across recency of last action, sales frequency, staff size, and customer volume.
          </p>

          <div className="space-y-3 text-xs">
            {/* Highly engaged */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Highly Engaged (Score &gt;= 70)
                </span>
                <span className="font-mono text-slate-800 font-semibold">
                  {data.engagement.distribution.highlyEngaged.count} {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} ({data.engagement.distribution.highlyEngaged.percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${data.engagement.distribution.highlyEngaged.percent}%` }}
                />
              </div>
            </div>

            {/* Moderately engaged */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Moderately Engaged (Score 40 - 69)
                </span>
                <span className="font-mono text-slate-800 font-semibold">
                  {data.engagement.distribution.moderatelyEngaged.count} {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} ({data.engagement.distribution.moderatelyEngaged.percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${data.engagement.distribution.moderatelyEngaged.percent}%` }}
                />
              </div>
            </div>

            {/* At risk */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-amber-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  At Risk (Score 20 - 39)
                </span>
                <span className="font-mono text-slate-800 font-semibold">
                  {data.engagement.distribution.atRisk.count} {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} ({data.engagement.distribution.atRisk.percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${data.engagement.distribution.atRisk.percent}%` }}
                />
              </div>
            </div>

            {/* Inactive */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Inactive (Score &lt; 20)
                </span>
                <span className="font-mono text-slate-800 font-semibold">
                  {data.engagement.distribution.inactive.count} {PRODUCT_ANALYTICS_CONFIG.app.entityPlural.toLowerCase()} ({data.engagement.distribution.inactive.percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all duration-500"
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
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">Top 20 User Interactions</h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Heat Intelligence
            </span>
          </div>

          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Interaction Name</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.interactions.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-2 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium text-slate-800 truncate max-w-[220px]">
                      {item.interaction}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          item.type === 'repeat'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : item.type === 'button'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : item.type === 'action'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
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
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Screen Analytics</h3>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                View &amp; Exit Rates
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2">Screen</th>
                    <th className="py-2 px-2 text-right">Visits</th>
                    <th className="py-2 px-2 text-right">Users</th>
                    <th className="py-2 px-2 text-right">Exit %</th>
                    <th className="py-2 px-2">Top Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.screens.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-2 font-mono text-slate-800 text-[11px] font-medium">{row.screen}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-600">{row.visits}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-600">{row.users}</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">
                        <span className={row.exitPercent >= 50 ? 'text-rose-600' : 'text-slate-800'}>
                          {row.exitPercent}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-slate-500 truncate max-w-[140px]">{row.topClicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 9. Scroll Depth */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Scroll Depth Progression</h3>
              <span className="text-[10px] text-slate-400 font-mono uppercase">App Telemetry</span>
            </div>

            {data.scroll.depths.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2">Screen</th>
                      <th className="py-2 px-2 text-center">25%</th>
                      <th className="py-2 px-2 text-center">50%</th>
                      <th className="py-2 px-2 text-center">75%</th>
                      <th className="py-2 px-2 text-center">100%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.scroll.depths.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-2 font-mono text-slate-800 text-[11px]">{row.screen}</td>
                        <td className="py-2 px-2 text-center font-mono text-slate-600">{row.d25}%</td>
                        <td className="py-2 px-2 text-center font-mono text-slate-600">{row.d50}%</td>
                        <td className="py-2 px-2 text-center font-mono text-slate-600">{row.d75}%</td>
                        <td className="py-2 px-2 text-center font-mono text-slate-600">{row.d100}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Scroll tracking activates on app screens with scroll analytics enabled.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 10. FOUNDER INSIGHTS (TWO CARDS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Why users subscribe */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Why Users Subscribe</h3>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-xs">
            <div>
              <span className="text-[10px] text-emerald-800 font-medium block">Setup Prior to Sub</span>
              <span className="text-base font-bold font-mono text-emerald-900">
                {data.insights.whyUsersSubscribe.hasCoreDataBeforePayingPercent}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 font-medium block">Pricing Viewed</span>
              <span className="text-base font-bold font-mono text-emerald-900">
                {data.insights.whyUsersSubscribe.viewedPricingBeforePayingPercent}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 font-medium block">Avg Core Actions</span>
              <span className="text-base font-bold font-mono text-emerald-900">
                {data.insights.whyUsersSubscribe.avgCoreActionsBeforeSubscribing}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Top Conversion Drivers
            </div>
            <div className="space-y-1 text-xs">
              {data.insights.whyUsersSubscribe.conversionDrivers.map((cd, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-800">{cd.event}</span>
                  <span className="font-mono text-emerald-700 font-semibold">{cd.percent}% ({cd.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Why users do not subscribe */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">Why Users Do Not Subscribe</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-rose-50/50 p-3 rounded-lg border border-rose-100 text-xs">
            <div>
              <span className="text-[10px] text-rose-800 font-medium block">No Setup Data</span>
              <span className="text-base font-bold font-mono text-rose-900">
                {data.insights.whyUsersDoNotSubscribe.noSetupDataCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-rose-800 font-medium block">Zero Sales</span>
              <span className="text-base font-bold font-mono text-rose-900">
                {data.insights.whyUsersDoNotSubscribe.zeroCoreActionsCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-rose-800 font-medium block">Pricing Drop-off</span>
              <span className="text-base font-bold font-mono text-rose-900">
                {data.insights.whyUsersDoNotSubscribe.viewedPricingDidNotPayCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-rose-800 font-medium block">Inactive &gt; 7d</span>
              <span className="text-base font-bold font-mono text-rose-900">
                {data.insights.whyUsersDoNotSubscribe.inactive7DaysPlusCount}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Early Churn Signals
            </div>
            <div className="space-y-1 text-xs">
              {data.insights.whyUsersDoNotSubscribe.churnSignals.map((cs, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-800">{cs.signal}</span>
                  <span className="font-mono text-rose-600 font-semibold">{cs.percent}% ({cs.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 11. TOP CITIES AND TOP STATES BY ENGAGEMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Cities */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">Top Cities by Engagement</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">City</th>
                  <th className="py-2 px-2.5 text-right">Users</th>
                  <th className="py-2 px-2.5 text-right">Engaged</th>
                  <th className="py-2 px-2.5 text-right">Subscribers</th>
                  <th className="py-2 px-2.5 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.geo.topCities.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-2.5 font-medium text-slate-900">{c.city}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-700">{c.users}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-emerald-700 font-medium">{c.engaged}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-blue-700 font-medium">{c.subscribers}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">{c.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top States */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">Top States by Engagement</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">State</th>
                  <th className="py-2 px-2.5 text-right">Users</th>
                  <th className="py-2 px-2.5 text-right">Engaged</th>
                  <th className="py-2 px-2.5 text-right">Subscribers</th>
                  <th className="py-2 px-2.5 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.geo.topStates.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-2.5 font-medium text-slate-900">{s.state}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-700">{s.users}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-emerald-700 font-medium">{s.engaged}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-blue-700 font-medium">{s.subscribers}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">{s.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 12. CUSTOMER SUCCESS OPPORTUNITIES (OUTREACH ENGINE) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Customer Success Opportunities ({filteredCSOpps.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
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
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={csSearch}
              onChange={(e) => {
                setCsSearch(e.target.value);
                setCsPage(1);
              }}
              placeholder="Search salon, phone, city, or reason..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setCsPriorityFilter(p);
                    setCsPage(1);
                  }}
                  className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                    csPriorityFilter === p
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
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
              className="py-1.5 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
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
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-100">
              {paginatedCSOpps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customer success opportunities match the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedCSOpps.map((opp) => {
                  const cleanPhone = opp.phone.replace(/\D/g, '').slice(-10);
                  return (
                    <tr key={opp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            opp.priority === 'High'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : opp.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {opp.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {opp.shopName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {opp.phone}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {opp.city}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {opp.reason}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={opp.detail}>
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
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-medium border border-emerald-200"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
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
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
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
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing {(csPage - 1) * csPageSize + 1} to{' '}
              {Math.min(csPage * csPageSize, filteredCSOpps.length)} of {filteredCSOpps.length} opportunities
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCsPage((p) => Math.max(1, p - 1))}
                disabled={csPage === 1}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono px-2 font-medium text-slate-800">
                {csPage} / {totalCsPages}
              </span>
              <button
                onClick={() => setCsPage((p) => Math.min(totalCsPages, p + 1))}
                disabled={csPage === totalCsPages}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
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
