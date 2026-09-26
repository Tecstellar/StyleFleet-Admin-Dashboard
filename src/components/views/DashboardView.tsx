import React, { useMemo } from 'react';
import {
  Store,
  Users,
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
  loading?: boolean;
  onNavigate: (view: NavView) => void;
  onSelectSalon?: (shop: Shop) => void;
  onOpenPrivacyPolicy?: () => void;
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
  loading = false,
  onNavigate,
  onSelectSalon,
  onOpenPrivacyPolicy,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-[#D4AF37]/30 bg-gradient-to-r from-[#1E2136] via-[#1E2136] to-[#161826] light:from-white light:via-[#FCF9EE] light:to-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black/40 border-2 border-[#D4AF37]/50 flex items-center justify-center p-1.5 shadow-md flex-shrink-0">
            <img src="/stylefleet-logo.png" alt="StyleFleet" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
                StyleFleet System Overview
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9A441]/20 text-[#D9A441] border border-[#D4AF37]/40">
                LIVE SUPABASE
              </span>
            </div>
            <p className="text-xs text-neutral-400 light:text-slate-500 mt-1">
              Displaying verified telemetry and operational data directly from Supabase project <span className="font-mono text-[#D9A441]">scgokpcoyfewrtrwqxpu</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('system_governance')}
            className="px-3.5 py-1.5 rounded-xl border border-[#2D3154] light:border-slate-300 bg-[#161826] light:bg-white text-xs font-bold text-neutral-300 light:text-slate-700 hover:text-white hover:border-[#D9A441] transition-colors"
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
          title="User Profiles"
          value={formatNumber(profiles.length)}
          subtitle={`${staff.length} staff stylists assigned`}
          isDateFilterable={false}
          icon={Users}
          onClick={() => onNavigate('salons_360')}
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
          title="App Telemetry / Installs"
          value="—"
          isUnavailable={true}
          unavailableReason="table 'public.telemetry' not found"
          icon={Smartphone}
          onClick={() => onNavigate('app_telemetry')}
        />

        <KPICard
          title="Trial Subscriptions"
          value="—"
          isUnavailable={true}
          unavailableReason="table 'public.trials' not found"
          icon={Sparkles}
          onClick={() => onNavigate('app_telemetry')}
        />
      </div>

      {/* Real Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Salon Growth Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white light:text-slate-900">
                Salon Registration Timeline
              </h3>
              <p className="text-xs text-neutral-400 light:text-slate-500">
                Real shop creation timestamps from <code className="text-[#D9A441] font-mono">public.shops</code>
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-[#D9A441]">
              {shops.length} Total Salons
            </span>
          </div>

          <div className="h-64 w-full">
            {salonGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salonGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3154" opacity={0.4} />
                  <XAxis dataKey="date" stroke="#8E94B3" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8E94B3" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161826',
                      borderColor: '#D9A441',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#FFFFFF',
                    }}
                  />
                  <Bar dataKey="salons" fill="#D9A441" radius={[4, 4, 0, 0]} name="New Salons" />
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
        <div className="rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white light:text-slate-900">
                Account Deletion Reasons
              </h3>
              <p className="text-xs text-neutral-400 light:text-slate-500">
                From real <code className="text-[#D9A441] font-mono">account_deletions</code>
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-rose-400">
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
                        backgroundColor: '#161826',
                        borderColor: '#D9A441',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#FFFFFF',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#2D3154]/50 text-xs">
                {deletionReasonsData.map((entry, idx) => {
                  const pct = Math.round((entry.value / deletions.length) * 100);
                  return (
                    <div key={idx} className="flex items-center justify-between text-neutral-300 light:text-slate-700">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: GOLD_PALETTE[idx % GOLD_PALETTE.length] }}
                        />
                        <span className="truncate">{entry.name}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-white light:text-slate-900 shrink-0">
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
        <div className="lg:col-span-2 rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white light:text-slate-900">
                Connected Salons
              </h3>
              <p className="text-xs text-neutral-400 light:text-slate-500">
                Registered salon businesses in Supabase
              </p>
            </div>
            <button
              onClick={() => onNavigate('salons_360')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#D9A441] hover:underline"
            >
              View All ({shops.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#2D3154]/50 light:divide-slate-100">
            {shops.map((shop) => (
              <div
                key={shop.id}
                onClick={() => onSelectSalon ? onSelectSalon(shop) : onNavigate('salons_360')}
                className="py-3 flex items-center justify-between gap-4 hover:bg-[#232742]/40 light:hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border border-white/10"
                    style={{ backgroundColor: shop.accent_color || '#D9A441', color: '#161826' }}
                  >
                    {shop.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-semibold text-white light:text-slate-900 truncate">
                      {shop.name}
                    </h4>
                    <p className="text-[11px] text-neutral-400 light:text-slate-500 truncate">
                      {shop.city || 'Location unassigned'} • Registered {formatDate(shop.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status="active" />
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Real Events Feed */}
        <div className="rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-5 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-white light:text-slate-900">
              Live Database Activity
            </h3>
            <p className="text-xs text-neutral-400 light:text-slate-500">
              Recent mutations &amp; records across operational tables
            </p>
          </div>

          <div className="space-y-3">
            {deletions.slice(0, 2).map((del) => (
              <div key={del.id} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-rose-300">
                  <span className="font-semibold">Account Deletion</span>
                  <span>{formatDateTime(del.deleted_at || del.created_at)}</span>
                </div>
                <p className="text-neutral-300 light:text-slate-700">
                  {del.shop_name || 'Salon'} requested deletion. Reason: <span className="italic">"{del.reason}"</span>
                </p>
              </div>
            ))}

            {payments.slice(0, 2).map((pay) => (
              <div key={pay.id} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-emerald-400">
                  <span className="font-semibold">Payment Received</span>
                  <span>{formatDateTime(pay.paid_at)}</span>
                </div>
                <p className="text-neutral-300 light:text-slate-700">
                  {formatCurrency(pay.amount_minor)} via {pay.method} (Ref: {pay.reference || 'Billing'})
                </p>
              </div>
            ))}

            {appointments.slice(0, 2).map((appt) => (
              <div key={appt.id} className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-blue-400">
                  <span className="font-semibold">Appointment Booked</span>
                  <span>{formatDateTime(appt.starts_at)}</span>
                </div>
                <p className="text-neutral-300 light:text-slate-700">
                  Status: {appt.status} • Duration: {appt.duration_minutes} mins
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Bottom Direct Privacy Option */}
      <div className="pt-6 border-t border-[#2D3154] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>StyleFleet Super Admin System • Live Supabase Connected</span>
        </div>
        <div className="flex items-center gap-4">
          {onOpenPrivacyPolicy && (
            <button
              onClick={onOpenPrivacyPolicy}
              className="text-neutral-300 hover:text-[#DFB847] flex items-center gap-1.5 transition-colors cursor-pointer font-medium py-1 px-2 rounded-lg hover:bg-[#1E2136]"
              title="View Public Privacy Policy"
            >
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Privacy Policy</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
