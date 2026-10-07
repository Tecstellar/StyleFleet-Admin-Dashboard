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
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import { formatDate } from '../../utils/dateUtils';
import { Shop, Profile, Staff, Customer, Bill, Appointment } from '../../types/database';

interface DailyUserMetricsViewProps {
  shops: Shop[];
  profiles: Profile[];
  staff: Staff[];
  customers?: Customer[];
  bills: Bill[];
  appointments: Appointment[];
  subscriptions?: any[];
  payments?: any[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
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
  newUsersList: any[];
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
    date: string;
    users: any[];
  } | null>(null);

  // Live timestamp for "Updated 06 Oct, 07:41 pm"
  const formattedUpdatedTime = useMemo(() => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.toLocaleString('en-US', { month: 'short' });
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    return `Updated ${day} ${month}, ${time}`;
  }, []);

  // Compute 100% real daily metrics strictly from Supabase database tables
  const { dailyRows, monthTabs, totalUsersCount, newSubscribersCount, totalSubscribersCount } =
    useMemo(() => {
      const getCleanPhone = (p?: string | null) => {
        if (!p) return null;
        const cleaned = p.replace(/\D/g, '');
        if (cleaned.length >= 10) return cleaned.slice(-10);
        return cleaned || null;
      };

      // 1. Strictly deduplicate individual human accounts across profiles, staff, and customers
      // Keyed by normalized 10-digit phone number or trimmed name if phone is missing
      interface UniqueIndividual {
        key: string;
        id: string;
        name: string;
        phone: string;
        role: string;
        type: string;
        first_created_at: string;
        allIds: Set<string>;
      }

      const uniqueUsersMap = new Map<string, UniqueIndividual>();
      const idToUniqueUser = new Map<string, UniqueIndividual>();

      const registerUser = (
        rawId: string,
        type: string,
        role: string,
        name?: string | null,
        phone?: string | null,
        createdAt?: string | null
      ) => {
        if (!rawId) return;
        const cleanPhone = getCleanPhone(phone);
        const trimmedName = (name || '').trim();
        const key = cleanPhone
          ? `phone:${cleanPhone}`
          : `name:${trimmedName.toLowerCase() || 'unnamed'}`;

        if (!uniqueUsersMap.has(key)) {
          const u: UniqueIndividual = {
            key,
            id: rawId,
            name: trimmedName || 'User',
            phone: cleanPhone || phone || 'No phone',
            role,
            type,
            first_created_at: createdAt || new Date().toISOString(),
            allIds: new Set([rawId]),
          };
          uniqueUsersMap.set(key, u);
          idToUniqueUser.set(rawId, u);
        } else {
          const existing = uniqueUsersMap.get(key)!;
          existing.allIds.add(rawId);
          idToUniqueUser.set(rawId, existing);

          // Keep earliest timestamp as genuine registration date
          if (
            createdAt &&
            (!existing.first_created_at ||
              new Date(createdAt).getTime() < new Date(existing.first_created_at).getTime())
          ) {
            existing.first_created_at = createdAt;
          }

          // Prioritize account hierarchy: Salon Owner > Stylist > Client
          if (type === 'Owner Profile') {
            existing.role = 'Salon Owner';
            existing.type = 'Owner Profile';
            if (trimmedName) existing.name = trimmedName;
          } else if (type === 'Stylist' && existing.type !== 'Owner Profile') {
            existing.role = role;
            existing.type = 'Stylist';
            if (trimmedName) existing.name = trimmedName;
          }
        }
      };

      profiles.forEach((p) =>
        registerUser(p.id, 'Owner Profile', 'Salon Owner', p.full_name, p.phone, p.created_at)
      );
      staff.forEach((s) =>
        registerUser(s.id, 'Stylist', `Stylist (${s.role || 'Staff'})`, s.name, s.phone, s.created_at)
      );
      customers.forEach((c) =>
        registerUser(c.id, 'CRM Customer', 'Salon Client', c.name, c.phone, c.created_at)
      );

      const allUniqueUsers = Array.from(uniqueUsersMap.values());

      // 2. Map date-by-date activity strictly from Supabase created_at timestamps
      const dateMap = new Map<
        string,
        {
          newUsers: UniqueIndividual[];
          activeUserKeys: Set<string>;
          conversions: number;
          churned: number;
        }
      >();

      const getOrCreateDate = (key: string) => {
        if (!dateMap.has(key)) {
          dateMap.set(key, {
            newUsers: [],
            activeUserKeys: new Set<string>(),
            conversions: 0,
            churned: 0,
          });
        }
        return dateMap.get(key)!;
      };

      // Group genuine new user registrations on their first signup date
      allUniqueUsers.forEach((u) => {
        if (!u.first_created_at) return;
        const key = u.first_created_at.split('T')[0];
        const entry = getOrCreateDate(key);
        entry.newUsers.push(u);
        entry.activeUserKeys.add(u.key);
      });

      // Track active unique users from bills (sales transactions)
      bills.forEach((b) => {
        if (!b.created_at) return;
        const key = b.created_at.split('T')[0];
        const entry = getOrCreateDate(key);
        if (b.customer_id && idToUniqueUser.has(b.customer_id)) {
          entry.activeUserKeys.add(idToUniqueUser.get(b.customer_id)!.key);
        }
        if (b.staff_id && idToUniqueUser.has(b.staff_id)) {
          entry.activeUserKeys.add(idToUniqueUser.get(b.staff_id)!.key);
        }
      });

      // Track active unique users from appointments
      appointments.forEach((a) => {
        if (!a.created_at) return;
        const key = a.created_at.split('T')[0];
        const entry = getOrCreateDate(key);
        if (a.customer_id && idToUniqueUser.has(a.customer_id)) {
          entry.activeUserKeys.add(idToUniqueUser.get(a.customer_id)!.key);
        }
        if (a.staff_id && idToUniqueUser.has(a.staff_id)) {
          entry.activeUserKeys.add(idToUniqueUser.get(a.staff_id)!.key);
        }
      });

      // Track real premium subscriptions (strictly from the subscriptions table)
      subscriptions.forEach((s) => {
        if (!s.created_at) return;
        const key = s.created_at.split('T')[0];
        const entry = getOrCreateDate(key);
        if (s.status === 'active' || s.status === 'paid') {
          entry.conversions += 1;
        } else if (s.status === 'cancelled' || s.status === 'expired') {
          entry.churned += 1;
        }
      });

      // 3. Chronological sorting to compute exact cumulative total users
      const sortedAscDates = Array.from(dateMap.keys()).sort();
      let runningCumulative = 0;
      const dateToCumulativeTotal = new Map<string, number>();

      sortedAscDates.forEach((key) => {
        const entry = dateMap.get(key)!;
        runningCumulative += entry.newUsers.length;
        dateToCumulativeTotal.set(key, runningCumulative);
      });

      // 4. Build descending daily rows (latest first)
      const sortedDatesDesc = [...sortedAscDates].reverse();
      const rows: DailyRow[] = [];
      const monthsSet = new Set<string>();

      sortedDatesDesc.forEach((key) => {
        const entry = dateMap.get(key)!;
        const d = new Date(key + 'T00:00:00');
        const formattedDate = d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const monthKey = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        monthsSet.add(monthKey);

        rows.push({
          dateKey: key,
          formattedDate,
          monthKey,
          newUsers: entry.newUsers.length,
          activeUsers: entry.activeUserKeys.size,
          premiumConversions: entry.conversions,
          premiumChurned: entry.churned,
          totalUsers: dateToCumulativeTotal.get(key) || 0,
          newUsersList: entry.newUsers,
        });
      });

      // 5. Subscriptions totals (100% true data from database)
      const newSubs = subscriptions.filter(
        (s) => s.status === 'active' || s.status === 'paid'
      ).length;
      const totalSubs = subscriptions.filter(
        (s) => s.status === 'active'
      ).length;

      return {
        dailyRows: rows,
        monthTabs: Array.from(monthsSet),
        totalUsersCount: allUniqueUsers.length,
        newSubscribersCount: newSubs,
        totalSubscribersCount: totalSubs,
      };
    }, [profiles, staff, customers, bills, appointments, subscriptions]);

  // Filter rows by selected month
  const filteredRows = useMemo(() => {
    if (selectedMonth === 'all') return dailyRows;
    return dailyRows.filter((r) => r.monthKey.toLowerCase() === selectedMonth.toLowerCase());
  }, [dailyRows, selectedMonth]);

  // True growth calculation over loaded dates
  const growthPercentage = useMemo(() => {
    if (filteredRows.length <= 1) return '+0.0%';
    const latest = filteredRows[0].totalUsers;
    const oldest = filteredRows[filteredRows.length - 1].totalUsers;
    if (oldest <= 0) return `+${((latest) * 100).toFixed(1)}%`;
    const growth = (((latest - oldest) / oldest) * 100).toFixed(1);
    return `+${growth}%`;
  }, [filteredRows]);

  const latestDateString = dailyRows.length > 0 ? dailyRows[0].formattedDate : '6 October 2026';

  return (
    <div className="space-y-6">
      {/* Title & Top Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Daily User Metrics
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Daily signups, active users, premium conversions, churn, and totals.
          </p>
          <div className="text-xs text-neutral-400 mt-2 font-medium">
            {formattedUpdatedTime}
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

      {/* 4 IronDrobe Metric KPI Cards strictly with live Supabase data (Compact Small Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* CARD 1: TOTAL USERS */}
        <div className="bg-white rounded-lg p-3 border border-neutral-200/90 shadow-2xs border-l-3 border-l-[#1c1f26] flex flex-col justify-between">
          <div className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase font-mono">
            TOTAL USERS
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#1c1f26] font-mono tracking-tight mt-1">
            {formatNumber(totalUsersCount)}
          </div>
          <div className="text-[10.5px] text-neutral-400 mt-1 font-medium">
            as of {latestDateString} • all dates
          </div>
        </div>

        {/* CARD 2: NEW SUBSCRIBERS */}
        <div className="bg-white rounded-lg p-3 border border-neutral-200/90 shadow-2xs border-l-3 border-l-[#1c1f26] flex flex-col justify-between">
          <div className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase font-mono">
            NEW SUBSCRIBERS
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#1c1f26] font-mono tracking-tight mt-1">
            {newSubscribersCount}
          </div>
          <div className="text-[10.5px] text-neutral-400 mt-1 font-medium">
            first payments • all dates
          </div>
        </div>

        {/* CARD 3: TOTAL SUBSCRIBERS */}
        <div className="bg-white rounded-lg p-3 border border-neutral-200/90 shadow-2xs border-l-3 border-l-[#1c1f26] flex flex-col justify-between">
          <div className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase font-mono">
            TOTAL SUBSCRIBERS
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#1c1f26] font-mono tracking-tight mt-1">
            {totalSubscribersCount}
          </div>
          <div className="text-[10.5px] text-neutral-400 mt-1 font-medium">
            as of {latestDateString}
          </div>
        </div>

        {/* CARD 4: USER GROWTH */}
        <div className="bg-white rounded-lg p-3 border border-neutral-200/90 shadow-2xs border-l-3 border-l-[#1c1f26] flex flex-col justify-between">
          <div className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase font-mono">
            USER GROWTH
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#1c1f26] font-mono tracking-tight mt-1">
            {growthPercentage}
          </div>
          <div className="text-[10.5px] text-neutral-400 mt-1 font-medium">
            over loaded date range
          </div>
        </div>
      </div>

      {/* Main Table Panel: Select Daily User Metrics to change */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-5 sm:p-6">
        <h3 className="text-base font-bold text-[#1c1f26] tracking-tight">
          Select Daily User Metrics to change
        </h3>

        {/* Month Filter Tabs strictly derived from real activity dates */}
        <div className="flex items-center gap-4 text-xs font-semibold overflow-x-auto mt-3 pb-3 border-b border-neutral-100">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`pb-1 transition-all cursor-pointer whitespace-nowrap ${
              selectedMonth === 'all'
                ? 'text-[#1c1f26] border-b-2 border-[#1c1f26] font-bold'
                : 'text-neutral-500 hover:text-[#1c1f26] border-b-2 border-transparent'
            }`}
          >
            All dates
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
              {filteredRows.map((row) => (
                <tr key={row.dateKey} className="hover:bg-neutral-50/70 transition-colors">
                  {/* DATE */}
                  <td className="py-3.5 px-2 font-medium text-neutral-900 whitespace-nowrap">
                    {row.formattedDate}
                  </td>

                  {/* NEW USERS (black clickable link) */}
                  <td className="py-3.5 px-2 text-center">
                    {row.newUsers > 0 ? (
                      <button
                        onClick={() =>
                          setDrilldownData({
                            title: 'Registered Users on this date',
                            date: row.formattedDate,
                            users: row.newUsersList,
                          })
                        }
                        className="text-[#1c1f26] font-bold hover:underline cursor-pointer"
                      >
                        {row.newUsers}
                      </button>
                    ) : (
                      <span className="text-neutral-400 font-mono">0</span>
                    )}
                  </td>

                  {/* ACTIVE USERS */}
                  <td className="py-3.5 px-2 text-center">
                    {row.activeUsers > 0 ? (
                      <span className="text-[#1c1f26] font-bold">
                        {row.activeUsers}
                      </span>
                    ) : (
                      <span className="text-neutral-400 font-mono">0</span>
                    )}
                  </td>

                  {/* PREMIUM CONVERSIONS */}
                  <td className="py-3.5 px-2 text-center">
                    {row.premiumConversions > 0 ? (
                      <span className="text-[#1c1f26] font-bold">
                        {row.premiumConversions}
                      </span>
                    ) : (
                      <span className="text-neutral-400 font-mono">0</span>
                    )}
                  </td>

                  {/* PREMIUM CHURNED */}
                  <td className="py-3.5 px-2 text-center text-neutral-400 font-mono">
                    {row.premiumChurned}
                  </td>

                  {/* TOTAL USERS */}
                  <td className="py-3.5 px-2 text-right">
                    <span className="text-[#1c1f26] font-bold font-mono">
                      {formatNumber(row.totalUsers)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Modal if a day's new users are clicked */}
      {drilldownData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{drilldownData.title}</h3>
                <p className="text-xs text-neutral-500">{drilldownData.date} • {drilldownData.users.length} accounts</p>
              </div>
              <button
                onClick={() => setDrilldownData(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100">
              {drilldownData.users.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-400">
                  No individual accounts registered on this date.
                </div>
              ) : (
                drilldownData.users.map((u, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-neutral-900">{u.name}</div>
                      <div className="text-[11px] text-neutral-500">{u.phone} • {u.role}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                      {u.type}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setDrilldownData(null)}
                className="px-4 py-1.5 bg-[#1c1f26] text-white rounded-lg text-xs font-semibold hover:bg-[#282d37] transition-colors cursor-pointer"
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
