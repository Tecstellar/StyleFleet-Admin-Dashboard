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

  const allowedShopIds = activeShop?.duplicate_ids && activeShop.duplicate_ids.length > 0
    ? activeShop.duplicate_ids
    : (activeShop?.id ? [activeShop.id] : []);

  const linkedStaff = staff.filter((st) => allowedShopIds.includes(st.shop_id));
  const linkedCustomers = customers.filter((c) => allowedShopIds.includes(c.shop_id));
  const linkedAppointments = appointments.filter((a) => allowedShopIds.includes(a.shop_id));
  const linkedBills = bills.filter((b) => allowedShopIds.includes(b.shop_id));
  const linkedPayments = payments.filter((p) => allowedShopIds.includes(p.shop_id));
  const linkedSupport = supportMessages.filter((m) => !!m.shop_id && allowedShopIds.includes(m.shop_id));
  const linkedDeletions = deletions.filter(
    (d) => (!!d.shop_id && allowedShopIds.includes(d.shop_id)) || (!!activeShop?.phone && d.phone === activeShop.phone)
  );

  return (
    <div className="space-y-6">
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-[#E5E7EB] bg-white shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-neutral-900" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              StyleFleet 360° Ecosystem View
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            End-to-end verified relational foreign key lineage from Supabase.
          </p>
        </div>

        {/* Salon Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-600 font-medium">Select Salon:</span>
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-xs text-neutral-900 font-semibold focus:outline-none focus:border-black"
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
          <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-300">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Step 1: User / Owner Identity
                </h3>
              </div>
              {linkedProfile ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  public.profiles (ID: {linkedProfile.id.slice(0, 8)}...)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                  <XCircle className="w-3.5 h-3.5" />
                  owner_profile_id is NULL
                </span>
              )}
            </div>

            {linkedProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
                <div>
                  <span className="text-neutral-500">Full Name:</span>
                  <div className="font-semibold text-neutral-900">{linkedProfile.full_name || 'Not set'}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Phone:</span>
                  <div className="font-mono text-neutral-900">{linkedProfile.phone || '—'}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Registered:</span>
                  <div className="text-neutral-900">{formatDateTime(linkedProfile.created_at)}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-700 bg-neutral-100 p-2.5 rounded-lg border border-neutral-200">
                This salon does not have a linked user profile row in <code className="font-mono">public.profiles</code>.
              </p>
            )}
          </div>

          <div className="flex justify-center text-neutral-400">
            <ArrowDown className="w-5 h-5" />
          </div>

          {/* Node 2: SALON */}
          <div className="p-4 rounded-xl border border-neutral-200 border-l-4 border-l-[#1c1f26] bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#1c1f26] text-white">
                  <Store className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Step 2: Salon Business Entity
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-900 font-mono font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1c1f26]" />
                public.shops (ID: {activeShop.id.slice(0, 8)}...)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
              <div>
                <span className="text-neutral-500">Salon Name:</span>
                <div className="font-semibold text-neutral-900">{activeShop.name}</div>
              </div>
              <div>
                <span className="text-neutral-500">City / Location:</span>
                <div className="text-neutral-900">{activeShop.city || '—'}</div>
              </div>
              <div>
                <span className="text-neutral-500">Salon Phone:</span>
                <div className="font-mono text-neutral-900">{activeShop.phone || '—'}</div>
              </div>
              <div>
                <span className="text-neutral-500">Brand Color:</span>
                <div className="flex items-center gap-1.5 font-mono text-neutral-900">
                  <span
                    className="w-3 h-3 rounded-full border border-neutral-300"
                    style={{ backgroundColor: activeShop.accent_color || '#111827' }}
                  />
                  {activeShop.accent_color}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center text-neutral-400">
            <ArrowDown className="w-5 h-5" />
          </div>

          {/* Node 3 & 4: DEVICE & APP VERSION (UNLINKED PER RULE 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                  <Smartphone className="w-4 h-4 text-neutral-600" />
                  <span>Step 3: Device / Platform</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-700 bg-neutral-200 px-2 py-0.5 rounded border border-neutral-300">
                  Unlinked (No table)
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Device hardware identifier, OS platform (Android/iOS), and active installation records are not stored in Supabase.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                  <Layers className="w-4 h-4 text-neutral-600" />
                  <span>Step 4: App Version</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-700 bg-neutral-200 px-2 py-0.5 rounded border border-neutral-300">
                  Unlinked (No table)
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Client app version numbers and build numbers have no active logging table in the database schema.
              </p>
            </div>
          </div>

          <div className="flex justify-center text-neutral-400">
            <ArrowDown className="w-5 h-5" />
          </div>

          {/* Node 5: OPERATIONAL ACTIVITY (Staff, Customers, Appointments, Bills) */}
          <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Scissors className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Step 5: Salon Operational Activity
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Linked via shop_id
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB]">
                <span className="text-neutral-500">Staff Members:</span>
                <div className="text-lg font-mono font-bold text-neutral-900 mt-0.5">
                  {linkedStaff.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB]">
                <span className="text-neutral-500">Salon Clients:</span>
                <div className="text-lg font-mono font-bold text-neutral-900 mt-0.5">
                  {linkedCustomers.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB]">
                <span className="text-neutral-500">Appointments:</span>
                <div className="text-lg font-mono font-bold text-neutral-900 mt-0.5">
                  {linkedAppointments.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB]">
                <span className="text-neutral-500">Invoices Billed:</span>
                <div className="text-lg font-mono font-bold text-neutral-900 mt-0.5">
                  {linkedBills.length}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center text-neutral-400">
            <ArrowDown className="w-5 h-5" />
          </div>

          {/* Node 6: SUPPORT & ACCOUNT STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Support Messages */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-900 font-semibold">
                  <MessageSquare className="w-4 h-4 text-neutral-900" />
                  <span>Step 6: Support Conversations</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {linkedSupport.length} record(s)
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {linkedSupport.length === 0
                  ? 'No support messages opened by this salon.'
                  : `${linkedSupport.length} conversation(s) recorded in public.support_messages.`}
              </p>
            </div>

            {/* Account Status / Deletions */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-900 font-semibold">
                  <UserX className="w-4 h-4 text-rose-500" />
                  <span>Step 7: Account Status / Churn</span>
                </div>
                {linkedDeletions.length > 0 ? (
                  <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Deletion Recorded
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active &amp; In Good Standing
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">
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
