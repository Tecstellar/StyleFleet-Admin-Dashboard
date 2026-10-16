import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Users,
  Calendar,
  X,
  ExternalLink,
  ChevronRight,
  UserCheck,
  TrendingUp,
  Store,
  Phone,
  MapPin,
  Receipt,
  Crown,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import { KPICard } from '../common/KPICard';
import { Shop, Profile, Staff, Customer, Bill, Appointment, Payment } from '../../types/database';

interface DailyUserMetricsViewProps {
  shops: Shop[];
  profiles: Profile[];
  staff: Staff[];
  customers?: Customer[];
  bills: Bill[];
  appointments: Appointment[];
  subscriptions?: any[];
  payments?: Payment[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
}

interface SalonOwnerActivityItem {
  id: string;
  name: string;
  phone: string;
  salonName: string;
  salonCity?: string;
  shop?: Shop | null;
  registrationDate: string;
  isSubscriber: boolean;
  activitiesOnDate: string[];
}

interface DailyRow {
  dateKey: string;
  formattedDate: string;
  monthKey: string;
  newUsers: number;
  activeUsers: number;
  premiumConversions: number;
  premiumChurned: number;
  totalUsers: number;
  newUsersList: SalonOwnerActivityItem[];
  activeUsersList: SalonOwnerActivityItem[];
  conversionUsersList: SalonOwnerActivityItem[];
  cumulativeUsersList: SalonOwnerActivityItem[];
}

export const DailyUserMetricsView: React.FC<DailyUserMetricsViewProps> = ({
  shops,
  profiles,
  staff,
  customers = [],
  bills,
  appointments,
  subscriptions = [],
  payments = [],
  loading = false,
  onSelectSalon,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [drilldownData, setDrilldownData] = useState<{
    title: string;
    subtitle: string;
    date: string;
    type: 'new_users' | 'active_users' | 'conversions' | 'total_users' | 'subscribers';
    users: SalonOwnerActivityItem[];
  } | null>(null);

  // Live timestamp for "Updated <DD> <Month>, <hh:mm am/pm>"
  const formattedUpdatedTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).replace(',', ' at') + ' (IST)';
  }, []);

  // Normalize phone number to last 10 digits
  const getCleanPhone = (p?: string | null): string | null => {
    if (!p) return null;
    const cleaned = p.replace(/\D/g, '');
    if (cleaned.length >= 10) return cleaned.slice(-10);
    return cleaned || null;
  };

  // Convert UTC timestamp to Indian Standard Time (YYYY-MM-DD) date key
  const toISTDateKey = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    } catch {
      return (dateStr || '').split('T')[0];
    }
  };

  // Compute 100% REAL daily metrics strictly from live Supabase database tables
  const {
    dailyRows,
    monthTabs,
    totalUsersCount,
    newSubscribersCount,
    totalSubscribersCount,
    allSubscribersList,
    allOwnersList,
  } = useMemo(() => {
    // 1. Filter out internal/test salons
    const internalNames = ['test salon', 'demo salon', 'antigravity test'];
    const realShops = shops.filter((s) => {
      const name = (s.name || '').toLowerCase();
      return !internalNames.some((t) => name.includes(t));
    });

    // 2. Identify real subscribers strictly from payments, subscriptions, or overrides
    const shopPaymentsMap = new Map<string, Payment[]>();
    payments.forEach((p) => {
      if (!shopPaymentsMap.has(p.shop_id)) shopPaymentsMap.set(p.shop_id, []);
      shopPaymentsMap.get(p.shop_id)!.push(p);
    });

    const isShopSubscribed = (shopId: string, shop?: Shop | null): boolean => {
      const sPayments = shopPaymentsMap.get(shopId) || [];
      const hasPaidPlan = sPayments.some(
        (p) =>
          (p.status === 'completed' || (p as any).status === 'success') &&
          ((p as any).amount_minor >= 49900 || (p.reference && p.reference.toLowerCase().includes('sub')))
      );
      const hasSubscriptionTableRecord = subscriptions.some(
        (sub) => sub.shop_id === shopId && (sub.status === 'active' || sub.status === 'paid')
      );
      const hasSalesLimitOverride = (shop?.free_sales_limit || 0) > 100;
      return hasPaidPlan || hasSubscriptionTableRecord || hasSalesLimitOverride;
    };

    // 3. Map Salon Owner Users strictly from real shops and profiles (NO CRM customer records)
    interface BaseOwner {
      key: string;
      id: string;
      name: string;
      phone: string;
      salonName: string;
      salonCity?: string;
      shop: Shop | null;
      registrationDate: string;
      isSubscriber: boolean;
      allShopIds: Set<string>;
    }

    const ownersMap = new Map<string, BaseOwner>();
    const shopIdToOwnerKey = new Map<string, string>();

    // Map by owner_profile_id and by phone
    const profilesMap = new Map<string, Profile>();
    profiles.forEach((p) => profilesMap.set(p.id, p));

    realShops.forEach((s) => {
      const cp = getCleanPhone(s.phone);
      const ownerProf = s.owner_profile_id ? profilesMap.get(s.owner_profile_id) : null;
      const key = cp ? `phone:${cp}` : `shop:${s.id}`;

      if (!ownersMap.has(key)) {
        const ownerName = ownerProf?.full_name?.trim() || `${s.name} Owner`;
        const phone = s.phone || ownerProf?.phone || 'No phone';
        const isSub = isShopSubscribed(s.id, s);

        ownersMap.set(key, {
          key,
          id: s.id,
          name: ownerName,
          phone,
          salonName: s.name,
          salonCity: s.city || undefined,
          shop: s,
          registrationDate: s.created_at || new Date().toISOString(),
          isSubscriber: isSub,
          allShopIds: new Set([s.id]),
        });
      } else {
        const existing = ownersMap.get(key)!;
        existing.allShopIds.add(s.id);
        if (!existing.shop) existing.shop = s;
        if (s.name && !existing.salonName) existing.salonName = s.name;
        if (s.city && !existing.salonCity) existing.salonCity = s.city;
        if (isShopSubscribed(s.id, s)) existing.isSubscriber = true;
      }

      shopIdToOwnerKey.set(s.id, key);
      if (s.duplicate_ids) {
        s.duplicate_ids.forEach((dupId) => shopIdToOwnerKey.set(dupId, key));
      }
    });

    const allOwners = Array.from(ownersMap.values());

    // 4. Map date-by-date activity strictly for salon owner users
    interface DateRecord {
      newOwners: Set<string>;
      activeOwnerActivities: Map<string, string[]>;
      conversionOwners: Set<string>;
      churnedOwners: Set<string>;
    }

    const dateMap = new Map<string, DateRecord>();

    const getOrCreateDate = (key: string): DateRecord => {
      if (!dateMap.has(key)) {
        dateMap.set(key, {
          newOwners: new Set<string>(),
          activeOwnerActivities: new Map<string, string[]>(),
          conversionOwners: new Set<string>(),
          churnedOwners: new Set<string>(),
        });
      }
      return dateMap.get(key)!;
    };

    // A. Record new salon owner signups
    allOwners.forEach((u) => {
      if (!u.registrationDate) return;
      const dateKey = toISTDateKey(u.registrationDate);
      if (!dateKey) return;

      const record = getOrCreateDate(dateKey);
      record.newOwners.add(u.key);

      // New signup is also considered active on registration day
      if (!record.activeOwnerActivities.has(u.key)) {
        record.activeOwnerActivities.set(u.key, []);
      }
      record.activeOwnerActivities.get(u.key)!.push('New Salon Registration');
    });

    // B. Track active salon owners from bills (sales finalized on that date)
    bills.forEach((b) => {
      if (!b.created_at && !b.issued_at) return;
      if (!b.shop_id) return;

      const ownerKey = shopIdToOwnerKey.get(b.shop_id);
      if (!ownerKey) return;

      const dateKey = toISTDateKey(b.issued_at || b.created_at);
      if (!dateKey) return;

      const record = getOrCreateDate(dateKey);
      if (!record.activeOwnerActivities.has(ownerKey)) {
        record.activeOwnerActivities.set(ownerKey, []);
      }

      const invText = b.invoice_number ? `Bill #${b.invoice_number}` : 'POS Sale';
      const amtText = b.total_minor ? ` (₹${Math.round(b.total_minor / 100)})` : '';
      const actStr = `Generated ${invText}${amtText}`;

      // Avoid adding duplicate bill strings to activities list
      const acts = record.activeOwnerActivities.get(ownerKey)!;
      if (acts.filter((a) => a.startsWith('Generated')).length < 3) {
        acts.push(actStr);
      }
    });

    // C. Track active salon owners from appointments
    appointments.forEach((a) => {
      if (!a.created_at || !a.shop_id) return;
      const ownerKey = shopIdToOwnerKey.get(a.shop_id);
      if (!ownerKey) return;

      const dateKey = toISTDateKey(a.created_at);
      if (!dateKey) return;

      const record = getOrCreateDate(dateKey);
      if (!record.activeOwnerActivities.has(ownerKey)) {
        record.activeOwnerActivities.set(ownerKey, []);
      }
      const acts = record.activeOwnerActivities.get(ownerKey)!;
      if (!acts.includes('Booked Client Appointment')) {
        acts.push('Booked Client Appointment');
      }
    });

    // D. Track real subscription conversions from payments & subscriptions
    payments.forEach((p) => {
      if (!p.created_at || !p.shop_id) return;
      const ownerKey = shopIdToOwnerKey.get(p.shop_id);
      if (!ownerKey) return;

      const isSubPayment =
        (p.status === 'completed' || (p as any).status === 'success') &&
        ((p as any).amount_minor >= 49900 || (p.reference && p.reference.toLowerCase().includes('sub')));

      if (isSubPayment) {
        const dateKey = toISTDateKey(p.created_at);
        if (dateKey) {
          const record = getOrCreateDate(dateKey);
          record.conversionOwners.add(ownerKey);
          if (!record.activeOwnerActivities.has(ownerKey)) {
            record.activeOwnerActivities.set(ownerKey, []);
          }
          record.activeOwnerActivities.get(ownerKey)!.push('Subscribed to Paid Plan');
        }
      }
    });

    subscriptions.forEach((sub) => {
      if (!sub.created_at || !sub.shop_id) return;
      const ownerKey = shopIdToOwnerKey.get(sub.shop_id);
      if (!ownerKey) return;

      const dateKey = toISTDateKey(sub.created_at);
      if (!dateKey) return;

      const record = getOrCreateDate(dateKey);
      if (sub.status === 'active' || sub.status === 'paid') {
        record.conversionOwners.add(ownerKey);
      } else if (sub.status === 'cancelled' || sub.status === 'expired') {
        record.churnedOwners.add(ownerKey);
      }
    });

    // 5. Chronological sorting for cumulative totals
    const sortedAscDates = Array.from(dateMap.keys()).sort();
    let runningCumulativeOwners: SalonOwnerActivityItem[] = [];
    const dateToCumulativeUsers = new Map<string, SalonOwnerActivityItem[]>();

    sortedAscDates.forEach((key) => {
      const record = dateMap.get(key)!;
      const newItems: SalonOwnerActivityItem[] = Array.from(record.newOwners).map((oKey) => {
        const owner = ownersMap.get(oKey)!;
        return {
          id: owner.id,
          name: owner.name,
          phone: owner.phone,
          salonName: owner.salonName,
          salonCity: owner.salonCity,
          shop: owner.shop,
          registrationDate: owner.registrationDate,
          isSubscriber: owner.isSubscriber,
          activitiesOnDate: ['Registered Salon Profile'],
        };
      });

      runningCumulativeOwners = [...runningCumulativeOwners, ...newItems];
      dateToCumulativeUsers.set(key, runningCumulativeOwners);
    });

    // 6. Build descending daily rows (latest first)
    const sortedDatesDesc = [...sortedAscDates].reverse();
    const rows: DailyRow[] = [];
    const monthsSet = new Set<string>();

    sortedDatesDesc.forEach((key) => {
      const record = dateMap.get(key)!;
      const d = new Date(key + 'T12:00:00Z');
      const formattedDate = d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const monthKey = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      monthsSet.add(monthKey);

      // New users item list for this day
      const newUsersList: SalonOwnerActivityItem[] = Array.from(record.newOwners).map((oKey) => {
        const owner = ownersMap.get(oKey)!;
        return {
          id: owner.id,
          name: owner.name,
          phone: owner.phone,
          salonName: owner.salonName,
          salonCity: owner.salonCity,
          shop: owner.shop,
          registrationDate: owner.registrationDate,
          isSubscriber: owner.isSubscriber,
          activitiesOnDate: record.activeOwnerActivities.get(oKey) || ['Newly Registered'],
        };
      });

      // Active users item list for this day
      const activeUsersList: SalonOwnerActivityItem[] = Array.from(
        record.activeOwnerActivities.entries()
      ).map(([oKey, acts]) => {
        const owner = ownersMap.get(oKey)!;
        return {
          id: owner.id,
          name: owner.name,
          phone: owner.phone,
          salonName: owner.salonName,
          salonCity: owner.salonCity,
          shop: owner.shop,
          registrationDate: owner.registrationDate,
          isSubscriber: owner.isSubscriber,
          activitiesOnDate: acts.length > 0 ? acts : ['Active Session'],
        };
      });

      // Conversion users list for this day
      const conversionUsersList: SalonOwnerActivityItem[] = Array.from(
        record.conversionOwners
      ).map((oKey) => {
        const owner = ownersMap.get(oKey)!;
        return {
          id: owner.id,
          name: owner.name,
          phone: owner.phone,
          salonName: owner.salonName,
          salonCity: owner.salonCity,
          shop: owner.shop,
          registrationDate: owner.registrationDate,
          isSubscriber: true,
          activitiesOnDate: ['Subscribed to Paid Plan'],
        };
      });

      const cumulativeList = dateToCumulativeUsers.get(key) || [];

      rows.push({
        dateKey: key,
        formattedDate,
        monthKey,
        newUsers: newUsersList.length,
        activeUsers: activeUsersList.length,
        premiumConversions: conversionUsersList.length,
        premiumChurned: record.churnedOwners.size,
        totalUsers: cumulativeList.length,
        newUsersList,
        activeUsersList,
        conversionUsersList,
        cumulativeUsersList: cumulativeList,
      });
    });

    // 7. Full subscribers and owners list for KPI card drilldown
    const allSubscribersList: SalonOwnerActivityItem[] = allOwners
      .filter((o) => o.isSubscriber)
      .map((o) => ({
        id: o.id,
        name: o.name,
        phone: o.phone,
        salonName: o.salonName,
        salonCity: o.salonCity,
        shop: o.shop,
        registrationDate: o.registrationDate,
        isSubscriber: true,
        activitiesOnDate: ['Active Paid Subscriber'],
      }));

    const allOwnersList: SalonOwnerActivityItem[] = allOwners.map((o) => ({
      id: o.id,
      name: o.name,
      phone: o.phone,
      salonName: o.salonName,
      salonCity: o.salonCity,
      shop: o.shop,
      registrationDate: o.registrationDate,
      isSubscriber: o.isSubscriber,
      activitiesOnDate: [o.isSubscriber ? 'Paid Subscriber' : 'Standard Salon Owner'],
    }));

    return {
      dailyRows: rows,
      monthTabs: Array.from(monthsSet),
      totalUsersCount: allOwners.length,
      newSubscribersCount: allSubscribersList.length,
      totalSubscribersCount: allSubscribersList.length,
      allSubscribersList,
      allOwnersList,
    };
  }, [shops, profiles, bills, appointments, subscriptions, payments]);

  // Filter rows by selected month
  const filteredRows = useMemo(() => {
    if (selectedMonth === 'all') return dailyRows;
    return dailyRows.filter((r) => r.monthKey.toLowerCase() === selectedMonth.toLowerCase());
  }, [dailyRows, selectedMonth]);

  // Real user growth calculation over the filtered date range
  const growthPercentage = useMemo(() => {
    if (filteredRows.length <= 1) return '+0.0%';
    const latest = filteredRows[0]?.totalUsers || 0;
    const oldest = filteredRows[filteredRows.length - 1]?.totalUsers || 0;
    if (oldest <= 0) return `+${latest * 100}%`;
    const growth = (((latest - oldest) / oldest) * 100).toFixed(1);
    return `+${growth}%`;
  }, [filteredRows]);

  const latestDateString = dailyRows.length > 0 ? dailyRows[0].formattedDate : 'Today';

  const handleOpenSalon = (shop: Shop | null | undefined) => {
    if (shop && onSelectSalon) {
      setDrilldownData(null);
      onSelectSalon(shop);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title & Top Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Daily User Metrics
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Daily salon owner signups, active salon owners, premium conversions, churn, and totals.
          </p>
          <div className="text-xs text-neutral-400 mt-2 font-medium">
            Updated {formattedUpdatedTime}
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-neutral-300 hover:border-neutral-400 text-neutral-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 Metric KPI Cards - Clickable to open full drilldowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() =>
            setDrilldownData({
              title: 'Total Salon Owners Directory',
              subtitle: 'All registered salon owner accounts',
              date: `As of ${latestDateString}`,
              type: 'total_users',
              users: allOwnersList,
            })
          }
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Click to view all registered salon owners"
        >
          <KPICard
            title="Total Salon Owners"
            value={formatNumber(totalUsersCount)}
            subtitle={`As of ${latestDateString} • Click to view`}
            icon={Users}
            tone="revenue"
          />
        </div>

        <div
          onClick={() =>
            setDrilldownData({
              title: 'New Subscribers',
              subtitle: 'Salon owners who converted to paid subscription',
              date: `Active • ${newSubscribersCount} salons`,
              type: 'subscribers',
              users: allSubscribersList,
            })
          }
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Click to view subscriber salons"
        >
          <KPICard
            title="New Subscribers"
            value={newSubscribersCount}
            subtitle="First completed payments • Click to view"
            icon={UserCheck}
            tone="conversion"
          />
        </div>

        <div
          onClick={() =>
            setDrilldownData({
              title: 'Total Active Subscribers',
              subtitle: 'All salons with active paid subscriptions',
              date: `Active as of ${latestDateString}`,
              type: 'subscribers',
              users: allSubscribersList,
            })
          }
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Click to view active subscribers"
        >
          <KPICard
            title="Total Subscribers"
            value={totalSubscribersCount}
            subtitle={`Active as of ${latestDateString} • Click to view`}
            icon={Crown}
            tone="signup"
          />
        </div>

        <KPICard
          title="User Growth"
          value={growthPercentage}
          subtitle="Over loaded date range"
          icon={TrendingUp}
          tone="usage"
        />
      </div>

      {/* Main Table Panel: Select Daily User Metrics to change */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#1c1f26] tracking-tight">
              Select Daily User Metrics to change
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Touch any number below to inspect the exact salons and users behind it.
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
            Interactive Touch Active
          </span>
        </div>

        {/* Month Filter Tabs strictly derived from real activity dates */}
        <div className="flex items-center gap-4 text-xs font-semibold overflow-x-auto mt-4 pb-3 border-b border-neutral-100">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`pb-1 transition-all cursor-pointer whitespace-nowrap ${
              selectedMonth === 'all'
                ? 'text-[#1c1f26] border-b-2 border-[#1c1f26] font-bold'
                : 'text-neutral-500 hover:text-[#1c1f26] border-b-2 border-transparent'
            }`}
          >
            All dates ({dailyRows.length})
          </button>
          {monthTabs.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`pb-1 transition-all cursor-pointer whitespace-nowrap ${
                selectedMonth.toLowerCase() === m.toLowerCase()
                  ? 'text-[#1c1f26] border-b-2 border-[#1c1f26] font-bold'
                  : 'text-neutral-600 hover:text-[#1c1f26] hover:underline border-b-2 border-transparent'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Daily Metrics Data Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase border-b border-neutral-100">
                <th className="py-3 px-2">DATE</th>
                <th className="py-3 px-2 text-center">NEW USERS</th>
                <th className="py-3 px-2 text-center">ACTIVE USERS</th>
                <th className="py-3 px-2 text-center">PREMIUM CONVERSIONS</th>
                <th className="py-3 px-2 text-center">PREMIUM CHURNED</th>
                <th className="py-3 px-2 text-right">TOTAL USERS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-neutral-400">
                    No activity recorded for this period.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.dateKey} className="hover:bg-neutral-50/80 transition-colors">
                    {/* DATE */}
                    <td className="py-3.5 px-2 font-medium text-neutral-900 whitespace-nowrap">
                      {row.formattedDate}
                    </td>

                    {/* NEW USERS (Interactive Touch button) */}
                    <td className="py-3.5 px-2 text-center">
                      {row.newUsers > 0 ? (
                        <button
                          onClick={() =>
                            setDrilldownData({
                              title: 'New Salon Owners Registered',
                              subtitle: 'Salons that completed initial registration on this date',
                              date: row.formattedDate,
                              type: 'new_users',
                              users: row.newUsersList,
                            })
                          }
                          className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-md bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                          title="Touch to view newly registered salons"
                        >
                          {row.newUsers}
                        </button>
                      ) : (
                        <span className="text-neutral-400 font-mono">0</span>
                      )}
                    </td>

                    {/* ACTIVE USERS (Interactive Touch button) */}
                    <td className="py-3.5 px-2 text-center">
                      {row.activeUsers > 0 ? (
                        <button
                          onClick={() =>
                            setDrilldownData({
                              title: 'Active Salon Owners',
                              subtitle: 'Salons that generated sales, appointments, or registered on this date',
                              date: row.formattedDate,
                              type: 'active_users',
                              users: row.activeUsersList,
                            })
                          }
                          className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                          title="Touch to see which salons were active on this date"
                        >
                          {row.activeUsers}
                        </button>
                      ) : (
                        <span className="text-neutral-400 font-mono">0</span>
                      )}
                    </td>

                    {/* PREMIUM CONVERSIONS (Interactive Touch button) */}
                    <td className="py-3.5 px-2 text-center">
                      {row.premiumConversions > 0 ? (
                        <button
                          onClick={() =>
                            setDrilldownData({
                              title: 'Premium Subscriber Conversions',
                              subtitle: 'Salons that subscribed to a paid tier on this date',
                              date: row.formattedDate,
                              type: 'conversions',
                              users: row.conversionUsersList,
                            })
                          }
                          className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-md bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                          title="Touch to view converted subscribers"
                        >
                          {row.premiumConversions}
                        </button>
                      ) : (
                        <span className="text-neutral-400 font-mono">0</span>
                      )}
                    </td>

                    {/* PREMIUM CHURNED */}
                    <td className="py-3.5 px-2 text-center text-neutral-400 font-mono">
                      {row.premiumChurned}
                    </td>

                    {/* TOTAL USERS (Interactive Touch button) */}
                    <td className="py-3.5 px-2 text-right">
                      <button
                        onClick={() =>
                          setDrilldownData({
                            title: 'Cumulative Salons',
                            subtitle: 'All salons registered up to this date',
                            date: `As of ${row.formattedDate}`,
                            type: 'total_users',
                            users: row.cumulativeUsersList,
                          })
                        }
                        className="text-[#1c1f26] font-bold font-mono hover:underline cursor-pointer"
                        title="Touch to view cumulative salon list"
                      >
                        {formatNumber(row.totalUsers)}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Drilldown Modal when touching ANY user metric */}
      {drilldownData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">
                    {drilldownData.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                    {drilldownData.users.length} {drilldownData.users.length === 1 ? 'Salon' : 'Salons'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {drilldownData.subtitle}
                </p>
                <div className="text-[11px] font-mono text-neutral-400 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-neutral-400" />
                  <span>{drilldownData.date}</span>
                </div>
              </div>

              <button
                onClick={() => setDrilldownData(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal List of Salons */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 py-2 pr-1">
              {drilldownData.users.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No salon owners recorded for this metric.
                </div>
              ) : (
                drilldownData.users.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="py-3 px-3 flex items-center justify-between gap-4 hover:bg-neutral-50 rounded-xl transition-colors border-b border-neutral-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-neutral-900 text-sm truncate">
                        {item.salonName || item.name}
                      </div>
                      <div className="text-xs font-mono font-semibold text-neutral-700 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{item.phone || 'No phone'}</span>
                      </div>
                    </div>

                    {/* View Salon Action */}
                    {item.shop && onSelectSalon && (
                      <button
                        onClick={() => {
                          setDrilldownData(null);
                          onSelectSalon(item.shop!);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        <span>View Salon</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span>Touch any salon above to inspect complete 360 profile.</span>
              <button
                onClick={() => setDrilldownData(null)}
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
