import React, { useMemo } from 'react';
import {
  Store,
  Users,
  Scissors,
  CreditCard,
  CalendarCheck,
  UserX,
  MessageSquare,
  Sparkles,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '../common/KPICard';
import { StatusBadge } from '../common/StatusBadge';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Shop, Profile, Staff, Customer, Bill, Payment, Appointment, AccountDeletion, SupportMessage } from '../../types/database';
import { NavView } from '../../types/dashboard';

interface DashboardViewProps {
  shops: Shop[];
  profiles: Profile[];
  staff: Staff[];
  customers: Customer[];
  bills: Bill[];
  payments: Payment[];
  appointments: Appointment[];
  deletions: AccountDeletion[];
  supportMessages: SupportMessage[];
  subscriptions?: any[];
  loading?: boolean;
  onNavigate: (view: NavView) => void;
  onSelectSalon?: (shop: Shop) => void;
  onNavigateToStylists?: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenDeleteAccount?: () => void;
}


const GOLD_PALETTE = ['#D9A441', '#E0C068', '#B8863B', '#8C6239', '#5B4021'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  shops,
  profiles,
  staff,
  customers,
  bills,
  payments,
  appointments,
  deletions,
  supportMessages,
  subscriptions = [],
  loading = false,
  onNavigate,
  onSelectSalon,
  onNavigateToStylists,
  onOpenPrivacyPolicy,
  onOpenDeleteAccount,
}) => {

  const { dateRange } = useDateFilter();

  // Date-filtered records
  const filteredShops = useMemo(() => filterByDateRange(shops, 'created_at', dateRange), [shops, dateRange]);
  const filteredBills = useMemo(() => filterByDateRange(bills, 'issued_at', dateRange), [bills, dateRange]);
  const filteredPayments = useMemo(() => filterByDateRange(payments, 'paid_at', dateRange), [payments, dateRange]);
  const filteredAppts = useMemo(() => filterByDateRange(appointments, 'starts_at', dateRange), [appointments, dateRange]);
  const filteredDeletions = useMemo(() => filterByDateRange(deletions, 'created_at', dateRange), [deletions, dateRange]);
  const filteredSupport = useMemo(() => filterByDateRange(supportMessages, 'created_at', dateRange), [supportMessages, dateRange]);

  // Financial calculations
  const totalBilledMinor = filteredBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
  const totalPaidMinor = filteredPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);

  // Deletion reasons breakdown
  const deletionReasonsData = useMemo(() => {
    const counts: Record<string, number> = {};
    deletions.forEach((d) => {
      const reason = d.reason?.trim() || 'Unspecified';
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [deletions]);

  // Salon Growth by Month/Date
  const salonGrowthData = useMemo(() => {
    const map = new Map<string, number>();
    shops.forEach((s) => {
      const dateKey = formatDate(s.created_at);
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, salons: count }));
  }, [shops]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-[#D4AF37]/40 bg-white shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7EE] border border-[#D4AF37] flex items-center justify-center p-1.5 shadow-xs flex-shrink-0">
            <img src="/stylefleet-logo.png" alt="StyleFleet" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                StyleFleet System Overview
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                VERIFIED REAL DATA ONLY
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Strict deduplication & integrity active. Tracking only authentic production salons (Zero duplicates, zero random data) from Supabase project <span className="font-mono text-[#B8860B]">scgokpcoyfewrtrwqxpu</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('system_governance')}
            className="px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-neutral-800 hover:text-[#B8860B] hover:border-[#D4AF37] transition-colors shadow-xs"
          >
            System Health &amp; Schema
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Salons Registered"
          value={formatNumber(filteredShops.length)}
          subtitle={dateRange.startDate ? `In range (${shops.length} total)` : `${shops.length} total registered`}
          isDateFilterable={true}
          icon={Store}
          onClick={() => onNavigate('salons_360')}
        />

        <KPICard
          title="Team Stylists"
          value={formatNumber(staff.length)}
          subtitle={`${staff.filter((s) => s.invitation_status === 'active').length} app active · ${staff.filter((s) => s.invitation_status === 'invited').length} invited`}
          isDateFilterable={false}
          icon={Scissors}
          onClick={() => (onNavigateToStylists ? onNavigateToStylists() : onNavigate('salons_360'))}
        />

        <KPICard
          title="Invoiced Volume"
          value={formatCurrency(totalBilledMinor)}
          subtitle={`${filteredBills.length} invoice(s) generated`}
          isDateFilterable={true}
          icon={CreditCard}
          onClick={() => onNavigate('reports_bi')}
        />

        <KPICard
          title="Account Deletions"
          value={formatNumber(filteredDeletions.length)}
          subtitle={`${deletions.length} all-time deletion records`}
          isDateFilterable={true}
          icon={UserX}
          onClick={() => onNavigate('account_deletions')}
        />

        <KPICard
          title="Appointments"
          value={formatNumber(filteredAppts.length)}
          subtitle={`${appointments.length} total bookings recorded`}
          isDateFilterable={true}
          icon={CalendarCheck}
          onClick={() => onNavigate('reports_bi')}
        />

        <KPICard
          title="Support Messages"
          value={formatNumber(filteredSupport.length)}
          subtitle={supportMessages.length === 0 ? '0 open messages in inbox' : `${supportMessages.length} total`}
          isDateFilterable={true}
          icon={MessageSquare}
          onClick={() => onNavigate('support_messages')}
        />

        <KPICard
          title="User Profiles"
          value={formatNumber(profiles.length)}
          subtitle={`${shops.length} salon owners registered`}
          isDateFilterable={false}
          icon={Users}
          onClick={() => onNavigate('salons_360')}
        />

        <KPICard
          title="Subscriptions & Trials"
          value={subscriptions ? formatNumber(subscriptions.length) : '0'}
          subtitle={
            subscriptions && subscriptions.length > 0
              ? `${subscriptions.filter((s) => s.status === 'trial').length} on 7-day trial`
              : '0 active subscriptions in Supabase'
          }
          isDateFilterable={false}
          icon={Sparkles}
          onClick={() => onNavigate('reports_bi')}
        />
      </div>


      {/* Real Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Salon Growth Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Salon Registration Timeline
              </h3>
              <p className="text-xs text-neutral-500">
                Real shop creation timestamps from <code className="text-[#B8860B] font-mono">public.shops</code>
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#B8860B]">
              {shops.length} Total Salons
            </span>
          </div>

          <div className="h-64 w-full">
            {salonGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salonGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.6} />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D4AF37',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#111827',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="salons" fill="#D4AF37" radius={[4, 4, 0, 0]} name="New Salons" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                No salon registration history available.
              </div>
            )}
          </div>
        </div>

        {/* Deletion Reasons Chart */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Account Deletion Reasons
              </h3>
              <p className="text-xs text-neutral-500">
                From real <code className="text-[#B8860B] font-mono">account_deletions</code>
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-rose-600">
              {deletions.length} Requests
            </span>
          </div>

          {deletionReasonsData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deletionReasonsData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {deletionReasonsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={GOLD_PALETTE[index % GOLD_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#D4AF37',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#111827',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E5E7EB] text-xs">
                {deletionReasonsData.map((entry, idx) => {
                  const pct = Math.round((entry.value / deletions.length) * 100);
                  return (
                    <div key={idx} className="flex items-center justify-between text-neutral-700">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: GOLD_PALETTE[idx % GOLD_PALETTE.length] }}
                        />
                        <span className="truncate">{entry.name}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-neutral-900 shrink-0">
                        {entry.value} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-xs text-neutral-400">
              No deletion records available.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Active Salons List & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Salons Snapshot */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Connected Salons
              </h3>
              <p className="text-xs text-neutral-500">
                Registered salon businesses in Supabase
              </p>
            </div>
            <button
              onClick={() => onNavigate('salons_360')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B8860B] hover:underline"
            >
              View All ({shops.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#F0F0F0]">
            {shops.map((shop) => (
              <div
                key={shop.id}
                onClick={() => onSelectSalon ? onSelectSalon(shop) : onNavigate('salons_360')}
                className="py-3 flex items-center justify-between gap-4 hover:bg-[#FAF7EE] px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border border-[#D4AF37]/30"
                    style={{ backgroundColor: '#FAF7EE', color: '#B8860B' }}
                  >
                    {shop.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-neutral-900 truncate">
                        {shop.name}
                      </h4>
                      {shop.duplicate_count && shop.duplicate_count > 0 ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                          Deduplicated
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {shop.city || 'Kalugumalai'} • {shop.customer_count ?? 0} client(s) • {shop.staff_count ?? 0} staff • Registered {formatDate(shop.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status="active" />
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Real Events Feed */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Live Database Activity
            </h3>
            <p className="text-xs text-neutral-500">
              Recent mutations &amp; records across operational tables
            </p>
          </div>

          <div className="space-y-3">
            {deletions.slice(0, 2).map((del) => (
              <div key={del.id} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-rose-700">
                  <span className="font-semibold">Account Deletion</span>
                  <span>{formatDateTime(del.deleted_at || del.created_at)}</span>
                </div>
                <p className="text-neutral-700">
                  {del.shop_name || 'Salon'} requested deletion. Reason: <span className="italic">"{del.reason}"</span>
                </p>
              </div>
            ))}

            {payments.slice(0, 2).map((pay) => (
              <div key={pay.id} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-emerald-700">
                  <span className="font-semibold">Payment Received</span>
                  <span>{formatDateTime(pay.paid_at)}</span>
                </div>
                <p className="text-neutral-700">
                  {formatCurrency(pay.amount_minor)} via {pay.method} (Ref: {pay.reference || 'Billing'})
                </p>
              </div>
            ))}

            {appointments.slice(0, 2).map((appt) => (
              <div key={appt.id} className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E8DEC4] text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#B8860B]">
                  <span className="font-semibold">Appointment Booked</span>
                  <span>{formatDateTime(appt.starts_at)}</span>
                </div>
                <p className="text-neutral-700">
                  Status: {appt.status} • Duration: {appt.duration_minutes} mins
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Bottom Direct Privacy Option */}
      <div className="pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>StyleFleet Super Admin System • Live Supabase Connected</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {onOpenPrivacyPolicy && (
            <button
              onClick={onOpenPrivacyPolicy}
              className="text-neutral-600 hover:text-[#B8860B] flex items-center gap-1.5 transition-colors cursor-pointer font-medium py-1 px-2 rounded-lg hover:bg-[#FAF7EE]"
              title="View Public Privacy Policy"
            >
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Privacy Policy</span>
            </button>
          )}
          {onOpenDeleteAccount && (
            <button
              onClick={onOpenDeleteAccount}
              className="text-neutral-600 hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer font-medium py-1 px-2 rounded-lg hover:bg-rose-50"
              title="View Public Account Deletion Instructions"
            >
              <UserX className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Account Info</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
