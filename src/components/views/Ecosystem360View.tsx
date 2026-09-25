import React, { useState } from 'react';
import {
  Compass,
  User,
  Store,
  Scissors,
  Users,
  Calendar,
  CreditCard,
  MessageSquare,
  UserX,
  Smartphone,
  Sparkles,
  ArrowDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { Shop, Profile, Staff, Customer, Bill, Payment, Appointment, AccountDeletion, SupportMessage } from '../../types/database';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';

interface Ecosystem360ViewProps {
  shops: Shop[];
  profiles: Profile[];
  staff: Staff[];
  customers: Customer[];
  bills: Bill[];
  payments: Payment[];
  appointments: Appointment[];
  deletions: AccountDeletion[];
  supportMessages: SupportMessage[];
}

export const Ecosystem360View: React.FC<Ecosystem360ViewProps> = ({
  shops,
  profiles,
  staff,
  customers,
  bills,
  payments,
  appointments,
  deletions,
  supportMessages,
}) => {
  const [selectedShopId, setSelectedShopId] = useState<string>(shops[0]?.id || '');

  const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0];
  const linkedProfile = activeShop?.owner_profile_id
    ? profiles.find((p) => p.id === activeShop.owner_profile_id)
    : null;

  const linkedStaff = staff.filter((st) => st.shop_id === activeShop?.id);
  const linkedCustomers = customers.filter((c) => c.shop_id === activeShop?.id);
  const linkedAppointments = appointments.filter((a) => a.shop_id === activeShop?.id);
  const linkedBills = bills.filter((b) => b.shop_id === activeShop?.id);
  const linkedPayments = payments.filter((p) => p.shop_id === activeShop?.id);
  const linkedSupport = supportMessages.filter((m) => m.shop_id === activeShop?.id);
  const linkedDeletions = deletions.filter(
    (d) => d.shop_id === activeShop?.id || (activeShop?.phone && d.phone === activeShop.phone)
  );

  return (
    <div className="space-y-6">
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#D9A441]" />
            <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
              StyleFleet 360° Ecosystem View
            </h1>
          </div>
          <p className="text-xs text-neutral-400 light:text-slate-500 mt-1">
            End-to-end verified relational foreign key lineage from Supabase.
          </p>
        </div>

        {/* Salon Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 light:text-slate-500 font-medium">Select Salon:</span>
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-[#2D3154] light:border-slate-300 bg-[#161826] light:bg-slate-50 text-xs text-white light:text-slate-900 font-semibold focus:outline-none focus:border-[#D9A441]"
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.city || 'No city'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Relational Ecosystem Pipeline */}
      {activeShop ? (
        <div className="space-y-4">
          {/* Node 1: USER / PROFILE */}
          <div className="p-4 rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#D9A441]/20 text-[#D9A441]">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white light:text-slate-900">
                  Step 1: User / Owner Identity
                </h3>
              </div>
              {linkedProfile ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  public.profiles (ID: {linkedProfile.id.slice(0, 8)}...)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                  <XCircle className="w-3.5 h-3.5" />
                  owner_profile_id is NULL
                </span>
              )}
            </div>

            {linkedProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#161826]/40 light:bg-slate-50 p-3 rounded-lg">
                <div>
                  <span className="text-neutral-400 light:text-slate-500">Full Name:</span>
                  <div className="font-semibold text-white light:text-slate-900">{linkedProfile.full_name || 'Not set'}</div>
                </div>
                <div>
                  <span className="text-neutral-400 light:text-slate-500">Phone:</span>
                  <div className="font-mono text-white light:text-slate-900">{linkedProfile.phone || '—'}</div>
                </div>
                <div>
                  <span className="text-neutral-400 light:text-slate-500">Registered:</span>
                  <div className="text-white light:text-slate-900">{formatDateTime(linkedProfile.created_at)}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-300/80 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                This salon does not have a linked user profile row in <code className="font-mono">public.profiles</code>.
              </p>
            )}
          </div>

          <div className="flex justify-center text-[#D9A441]/60">
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </div>

          {/* Node 2: SALON */}
          <div className="p-4 rounded-xl border border-[#D9A441]/40 bg-[#1E2136] light:bg-white space-y-3 shadow-md shadow-[#D9A441]/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#D9A441] text-[#161826]">
                  <Store className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#F3D78A] light:text-slate-900">
                  Step 2: Salon Business Entity
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#D9A441] font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                public.shops (ID: {activeShop.id.slice(0, 8)}...)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#161826]/40 light:bg-slate-50 p-3 rounded-lg">
              <div>
                <span className="text-neutral-400 light:text-slate-500">Salon Name:</span>
                <div className="font-semibold text-white light:text-slate-900">{activeShop.name}</div>
              </div>
              <div>
                <span className="text-neutral-400 light:text-slate-500">City / Location:</span>
                <div className="text-white light:text-slate-900">{activeShop.city || '—'}</div>
              </div>
              <div>
                <span className="text-neutral-400 light:text-slate-500">Salon Phone:</span>
                <div className="font-mono text-white light:text-slate-900">{activeShop.phone || '—'}</div>
              </div>
              <div>
                <span className="text-neutral-400 light:text-slate-500">Brand Color:</span>
                <div className="flex items-center gap-1.5 font-mono text-white light:text-slate-900">
                  <span
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ backgroundColor: activeShop.accent_color || '#D9A441' }}
                  />
                  {activeShop.accent_color}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center text-neutral-500">
            <ArrowDown className="w-5 h-5" />
          </div>

          {/* Node 3 & 4: DEVICE & APP VERSION (UNLINKED PER RULE 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Step 3: Device / Platform</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/40">
                  Unlinked (No table)
                </span>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Device hardware identifier, OS platform (Android/iOS), and active installation records are not stored in Supabase.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Step 4: App Version</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/40">
                  Unlinked (No table)
                </span>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Client app version numbers and build numbers have no active logging table in the database schema.
              </p>
            </div>
          </div>

          <div className="flex justify-center text-[#D9A441]/60">
            <ArrowDown className="w-5 h-5" />
          </div>

          {/* Node 5: OPERATIONAL ACTIVITY (Staff, Customers, Appointments, Bills) */}
          <div className="p-4 rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Scissors className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white light:text-slate-900">
                  Step 5: Salon Operational Activity
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Linked via shop_id
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#161826]/40 light:bg-slate-50 border border-[#2D3154]">
                <span className="text-neutral-400 light:text-slate-500">Staff Members:</span>
                <div className="text-lg font-mono font-bold text-white light:text-slate-900 mt-0.5">
                  {linkedStaff.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#161826]/40 light:bg-slate-50 border border-[#2D3154]">
                <span className="text-neutral-400 light:text-slate-500">Salon Clients:</span>
                <div className="text-lg font-mono font-bold text-white light:text-slate-900 mt-0.5">
                  {linkedCustomers.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#161826]/40 light:bg-slate-50 border border-[#2D3154]">
                <span className="text-neutral-400 light:text-slate-500">Appointments:</span>
                <div className="text-lg font-mono font-bold text-white light:text-slate-900 mt-0.5">
                  {linkedAppointments.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#161826]/40 light:bg-slate-50 border border-[#2D3154]">
                <span className="text-neutral-400 light:text-slate-500">Invoices Billed:</span>
                <div className="text-lg font-mono font-bold text-white light:text-slate-900 mt-0.5">
                  {linkedBills.length}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center text-neutral-500">
            <ArrowDown className="w-5 h-5" />
          </div>

          {/* Node 6: SUPPORT & ACCOUNT STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Support Messages */}
            <div className="p-4 rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-white light:text-slate-900 font-semibold">
                  <MessageSquare className="w-4 h-4 text-[#D9A441]" />
                  <span>Step 6: Support Conversations</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  {linkedSupport.length} record(s)
                </span>
              </div>
              <p className="text-xs text-neutral-400 light:text-slate-500">
                {linkedSupport.length === 0
                  ? 'No support messages opened by this salon.'
                  : `${linkedSupport.length} conversation(s) recorded in public.support_messages.`}
              </p>
            </div>

            {/* Account Status / Deletions */}
            <div className="p-4 rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-white light:text-slate-900 font-semibold">
                  <UserX className="w-4 h-4 text-rose-400" />
                  <span>Step 7: Account Status / Churn</span>
                </div>
                {linkedDeletions.length > 0 ? (
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                    Deletion Recorded
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                    Active &amp; In Good Standing
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 light:text-slate-500">
                {linkedDeletions.length > 0
                  ? `Deletion record found in public.account_deletions. Reason: "${linkedDeletions[0].reason}".`
                  : 'No account deletion request has been submitted for this salon.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-neutral-400">
          No salon selected.
        </div>
      )}
    </div>
  );
};
