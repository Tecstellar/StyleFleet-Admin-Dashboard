import React, { useEffect, useState } from 'react';
import {
  Store,
  User,
  Phone,
  MapPin,
  Calendar,
  Users,
  Scissors,
  CreditCard,
  Settings as SettingsIcon,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  RefreshCw,
  Shield,
  MessageCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Receipt,
  Filter,
  Search,
  RotateCcw,
  Wallet,
  Download,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { UnavailableBanner } from '../common/UnavailableBanner';
import { fetchSalonDetails, updateStaffPermissions, updateShopFreeSalesLimit, SalonDetailedView } from '../../services/salonsService';
import {
  createStaff,
  updateStaffInvitationStatus,
  deleteStaff,
} from '../../services/usersService';
import { Shop, Staff, StylistPermissions, DEFAULT_STYLIST_PERMISSIONS } from '../../types/database';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatCurrency, exportToCSV } from '../../utils/formatters';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.stylefleet.app&pcampaignid=web_share';

interface SalonDetailModalProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
  onStaffChange?: () => void;
  initialTab?: 'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry';
}

export const SalonDetailModal: React.FC<SalonDetailModalProps> = ({
  shop,
  isOpen,
  onClose,
  onStaffChange,
  initialTab = 'overview',
}) => {
  const [details, setDetails] = useState<SalonDetailedView | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry'>(
    initialTab
  );

  // Bill Filter State for this Salon (defaults to today)
  const [billExactDate, setBillExactDate] = useState<string>('');
  const [billSearch, setBillSearch] = useState<string>('');
  const [billStatus, setBillStatus] = useState<string>('all');
  const [billPaymentMethod, setBillPaymentMethod] = useState<string>('all');
  const [billPresetRange, setBillPresetRange] = useState<'all' | 'today' | 'yesterday' | 'last_7_days' | 'this_month'>('today');

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Add Stylist state
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Stylist');
  const [newStaffLoading, setNewStaffLoading] = useState(false);
  const [staffActionMsg, setStaffActionMsg] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitMsg, setLimitMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const current = details?.shop.free_sales_limit;
    setLimitInput(current ? String(current) : '');
    setLimitMsg(null);
  }, [details?.shop.id, details?.shop.free_sales_limit]);

  const handleSaveLimit = async (clear: boolean) => {
    if (!shop || savingLimit) return;
    const trimmed = limitInput.trim();
    const value = clear ? null : Number(trimmed);
    if (!clear && (trimmed === '' || !Number.isInteger(value) || (value as number) < 1)) {
      setLimitMsg({ ok: false, text: 'Enter a whole number of 1 or more.' });
      return;
    }
    setSavingLimit(true);
    setLimitMsg(null);
    const res = await updateShopFreeSalesLimit(shop.id, value);
    setSavingLimit(false);
    if (!res.success) {
      setLimitMsg({ ok: false, text: res.error || 'Could not save the limit.' });
      return;
    }
    setDetails((prev) => (prev ? { ...prev, shop: { ...prev.shop, free_sales_limit: value } } : prev));
    setLimitMsg({ ok: true, text: value === null ? 'Reset to the default (100).' : `Free sales limit set to ${value}.` });
  };

  const handleSendWhatsAppInvite = async (st: Staff) => {
    if (!st.phone || !shop) return;
    const cleanPhone = st.phone.replace(/[^0-9]/g, '').slice(-10);
    const message = encodeURIComponent(
      `Hello ${st.name}! You have been invited to join ${shop.name} on StyleFleet.\n\n` +
      `Download the StyleFleet app from Google Play Store to manage appointments, bills, and clients:\n` +
      `${PLAY_STORE_URL}\n\n` +
      `Log in using your registered mobile number: +91 ${cleanPhone}`
    );
    const waUrl = `https://wa.me/91${cleanPhone}?text=${message}`;

    setDetails((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        staff: prev.staff.map((s) =>
          s.id === st.id ? { ...s, invitation_status: 'invited', invited_at: new Date().toISOString() } : s
        ),
      };
    });

    await updateStaffInvitationStatus(st.id, 'invited', new Date().toISOString());
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onStaffChange?.();
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !newStaffName.trim()) return;

    setNewStaffLoading(true);
    const res = await createStaff({
      shop_id: shop.id,
      name: newStaffName.trim(),
      phone: newStaffPhone.trim() || null,
      role: newStaffRole.trim() || 'Stylist',
      is_active: true,
      permissions: DEFAULT_STYLIST_PERMISSIONS,
      invitation_status: 'not_invited',
    });
    setNewStaffLoading(false);

    if (res.data) {
      setDetails((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          staff: [res.data!, ...prev.staff],
        };
      });
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffRole('Stylist');
      setIsAddingStaff(false);
      setStaffActionMsg(`Stylist ${res.data.name} added successfully!`);
      setTimeout(() => setStaffActionMsg(null), 3000);
      onStaffChange?.();
    }
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!window.confirm(`Are you sure you want to remove stylist "${staffName}" from this salon?`)) {
      return;
    }

    setSavingStaffId(staffId);
    const res = await deleteStaff(staffId);
    setSavingStaffId(null);

    if (res.success) {
      setDetails((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          staff: prev.staff.filter((s) => s.id !== staffId),
        };
      });
      setStaffActionMsg(`Stylist ${staffName} removed.`);
      setTimeout(() => setStaffActionMsg(null), 3000);
      onStaffChange?.();
    }
  };

  const handleTogglePermission = async (st: Staff, key: keyof StylistPermissions) => {
    if (!details) return;
    const currentPerms = st.permissions || DEFAULT_STYLIST_PERMISSIONS;
    const updatedPerms: StylistPermissions = {
      ...currentPerms,
      [key]: !currentPerms[key],
    };

    setDetails((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        staff: prev.staff.map((s) => (s.id === st.id ? { ...s, permissions: updatedPerms } : s)),
      };
    });

    setSavingStaffId(st.id);
    await updateStaffPermissions(st.id, updatedPerms);
    setSavingStaffId(null);
    onStaffChange?.();
  };

  const handleToggleAllPermissions = async (st: Staff, grant: boolean) => {
    if (!details) return;
    const updatedPerms: StylistPermissions = {
      customers: grant,
      sales: grant,
      appointments: grant,
      reminders: grant,
      expenses: grant,
      reports: grant,
      team: grant,
      profile: grant,
    };

    setDetails((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        staff: prev.staff.map((s) => (s.id === st.id ? { ...s, permissions: updatedPerms } : s)),
      };
    });

    setSavingStaffId(st.id);
    await updateStaffPermissions(st.id, updatedPerms);
    setSavingStaffId(null);
    onStaffChange?.();
  };


  useEffect(() => {
    if (!shop || !isOpen) return;

    let isMounted = true;
    setLoading(true);

    fetchSalonDetails(shop.id).then(({ data }) => {
      if (isMounted) {
        setDetails(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [shop, isOpen]);

  if (!shop) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={shop.name}
      subtitle={`Salon ID: ${shop.id}`}
      maxWidth="4xl"
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E5E7EB] pb-3 mb-5 overflow-x-auto text-xs">
        {[
          { id: 'overview', label: 'Overview', icon: Store },
          { id: 'staff', label: `Staff (${details?.staff.length || 0})`, icon: Users },
          { id: 'services', label: `Services (${details?.services.length || 0})`, icon: Scissors },
          { id: 'billing', label: `Billing & Payments (${details?.bills.length || 0})`, icon: CreditCard },
          { id: 'settings', label: 'Shop Settings', icon: SettingsIcon },
          { id: 'telemetry', label: 'App / Platform Telemetry', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-neutral-500 animate-pulse">
          Loading relational data from Supabase...
        </div>
      ) : (
        <div className="space-y-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Salon Information Card */}
                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-3 shadow-xs">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Salon Information
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Salon Name:</span>
                      <span className="font-semibold text-neutral-900">{shop.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Contact Phone:</span>
                      <span className="font-mono text-neutral-900">{shop.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Address:</span>
                      <span className="text-neutral-900 text-right max-w-xs">{shop.address || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">City / Pincode:</span>
                      <span className="text-neutral-900">
                        {shop.city || '—'} {shop.pin_code ? `(${shop.pin_code})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">GSTIN:</span>
                      <span className="font-mono text-neutral-900">{shop.gstin || 'Unregistered'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Default Tax Rate:</span>
                      <span className="font-mono text-neutral-900">{shop.gst_rate}%</span>
                    </div>
                  </div>
                </div>

                {/* Owner Information Card */}
                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-3 shadow-xs">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Owner Profile &amp; Account
                  </h4>
                  {shop.owner_profile ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Owner Profile ID:</span>
                        <span className="font-mono text-[11px] text-neutral-900 font-bold truncate max-w-[180px]">
                          {shop.owner_profile.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Full Name:</span>
                        <span className="font-semibold text-neutral-900">
                          {shop.owner_profile.full_name || 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Registered Phone:</span>
                        <span className="font-mono text-neutral-900">
                          {shop.owner_profile.phone || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">User Created At:</span>
                        <span className="text-neutral-900">
                          {formatDateTime(shop.owner_profile.created_at)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-xs text-neutral-800">
                      No linked owner profile (owner_profile_id is NULL). This salon may be an unassigned or test record.
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#F0F0F0] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Registered On:</span>
                      <span className="text-neutral-900">{formatDateTime(shop.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Theme Accent:</span>
                      <span className="flex items-center gap-1.5 font-mono text-xs text-neutral-900">
                        <span
                          className="w-3 h-3 rounded-full border border-neutral-300"
                          style={{ backgroundColor: shop.accent_color || '#111827' }}
                        />
                        {shop.accent_color || '#111827'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Deletions or Support Messages if any */}
              {details?.deletions && details.deletions.length > 0 && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Account Deletion Record Detected</span>
                  </div>
                  <p className="text-xs text-neutral-700">
                    A deletion request was processed for this salon on{' '}
                    {formatDateTime(details.deletions[0].deleted_at)}. Reason:{' '}
                    <span className="italic">"{details.deletions[0].reason}"</span>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STAFF & STYLIST PERMISSIONS */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[#F0F0F0]">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    Stylist Access & Module Permissions
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Company admin controls which modules each stylist can access inside the StyleFleet mobile app.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {savingStaffId && (
                    <span className="flex items-center gap-1.5 text-xs text-neutral-800 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-300 animate-pulse font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Saving...</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddingStaff(!isAddingStaff)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingStaff ? 'Cancel' : 'Add Stylist'}</span>
                  </button>
                </div>
              </div>

              {staffActionMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{staffActionMsg}</span>
                </div>
              )}

              {/* Collapsible Add Stylist Form */}
              {isAddingStaff && (
                <form
                  onSubmit={handleCreateStaff}
                  className="p-4 rounded-xl border border-neutral-300 bg-neutral-50 space-y-3"
                >
                  <div className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-black" />
                    <span>Add Stylist to {shop.name}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Stylist Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] bg-white text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={newStaffPhone}
                        onChange={(e) => setNewStaffPhone(e.target.value)}
                        placeholder="10-digit phone"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] bg-white text-neutral-900 font-mono focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Role / Designation
                      </label>
                      <input
                        type="text"
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value)}
                        placeholder="e.g. Senior Stylist"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] bg-white text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStaff(false)}
                      className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={newStaffLoading}
                      className="px-4 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {newStaffLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Stylist</span>
                    </button>
                  </div>
                </form>
              )}


              {details?.staff && details.staff.length > 0 ? (
                <div className="space-y-3">
                  {details.staff.map((st) => {
                    const perms: StylistPermissions =
                      st.permissions || DEFAULT_STYLIST_PERMISSIONS;
                    const isSavingThis = savingStaffId === st.id;

                    const moduleKeys: { key: keyof StylistPermissions; label: string; icon: string }[] = [
                      { key: 'customers', label: 'Customers', icon: '👥' },
                      { key: 'sales', label: 'Sales & Billing', icon: '🧾' },
                      { key: 'appointments', label: 'Appointments', icon: '📅' },
                      { key: 'reminders', label: 'Reminders', icon: '🔔' },
                      { key: 'expenses', label: 'Expenses', icon: '💰' },
                      { key: 'reports', label: 'Reports', icon: '📊' },
                      { key: 'team', label: 'Team', icon: '✂️' },
                      { key: 'profile', label: 'Profile', icon: '⚙️' },
                    ];

                    return (
                      <div
                        key={st.id}
                        className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs space-y-3.5"
                      >
                        {/* Header: Stylist Info & Status Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F0F0] pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 text-xs">{st.name}</span>
                              <span className="text-[11px] font-medium text-neutral-500">({st.role})</span>
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                              Phone: {st.phone ? `+91 ${st.phone}` : '—'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* WhatsApp Invite Action */}
                            {st.phone && (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppInvite(st)}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 transition-colors cursor-pointer"
                                title={st.invitation_status === 'invited' ? 'Resend WhatsApp Invite' : 'Send WhatsApp Invite'}
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600" />
                                <span>{st.invitation_status === 'invited' ? 'Resend Invite' : 'WhatsApp Invite'}</span>
                              </button>
                            )}

                            {/* Invitation Status */}
                            {st.invitation_status === 'active' ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                App Active
                              </span>
                            ) : st.invitation_status === 'invited' ? (
                              <span
                                className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                                title={st.invited_at ? `Invited on ${formatDateTime(st.invited_at)}` : 'Invited via WhatsApp'}
                              >
                                Invited {st.invited_at ? `(${formatDate(st.invited_at)})` : ''}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                                Not Invited
                              </span>
                            )}
                            <StatusBadge status={st.is_active ? 'active' : 'inactive'} />

                            {/* Delete Stylist Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(st.id, st.name)}
                              className="p-1 rounded text-neutral-400 hover:text-rose-600 transition-colors"
                              title="Delete stylist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>


                        {/* Permissions Grid */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                              Module Permissions:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleAllPermissions(st, true)}
                                disabled={isSavingThis}
                                className="text-[10px] font-bold text-neutral-900 hover:underline cursor-pointer"
                              >
                                Grant All
                              </button>
                              <span className="text-neutral-300">|</span>
                              <button
                                type="button"
                                onClick={() => handleToggleAllPermissions(st, false)}
                                disabled={isSavingThis}
                                className="text-[10px] font-bold text-neutral-500 hover:underline cursor-pointer"
                              >
                                Revoke All
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {moduleKeys.map(({ key, label, icon }) => {
                              const isGranted = perms[key];
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => handleTogglePermission(st, key)}
                                  disabled={isSavingThis}
                                  className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left ${
                                    isGranted
                                      ? 'border-black bg-black text-white font-semibold shadow-xs'
                                      : 'border-neutral-200 bg-neutral-50/50 text-neutral-500 font-normal hover:border-neutral-300'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span className="text-xs">{icon}</span>
                                    <span className="text-[11px]">{label}</span>
                                  </span>
                                  <span
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                      isGranted
                                        ? 'bg-white text-black'
                                        : 'bg-neutral-200 text-neutral-500'
                                    }`}
                                  >
                                    {isGranted ? '✓' : ''}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-[#E5E7EB] rounded-xl bg-white">
                  No staff members registered for this salon in <code className="text-neutral-900 font-semibold">public.staff</code>.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-3">
              {details?.services && details.services.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {details.services.map((svc) => (
                    <div
                      key={svc.id}
                      className="p-3 rounded-lg border border-[#E5E7EB] bg-white shadow-xs flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-neutral-900">{svc.name}</div>
                        <div className="text-[11px] text-neutral-500">{svc.duration_minutes} mins</div>
                      </div>
                      <div className="font-mono font-semibold text-neutral-900">
                        {formatCurrency(svc.price_minor)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-[#E5E7EB] rounded-xl bg-white">
                  No catalog services configured for this salon.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BILLING & PAYMENTS WITH EXACT DATE FILTER */}
          {activeTab === 'billing' && (() => {
            // Compute filtered bills for this salon
            const filteredBills = (details?.bills || []).filter((b) => {
              // 1. Exact Date Filter or Preset Range
              if (billExactDate.trim()) {
                const d = new Date(b.issued_at || b.created_at);
                if (isNaN(d.getTime())) return false;
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                if (`${yyyy}-${mm}-${dd}` !== billExactDate.trim()) return false;
              } else if (billPresetRange !== 'all') {
                const now = new Date();
                const d = new Date(b.issued_at || b.created_at);
                if (isNaN(d.getTime())) return false;
                if (billPresetRange === 'today' && d.toDateString() !== now.toDateString()) return false;
                if (billPresetRange === 'yesterday') {
                  const y = new Date(now);
                  y.setDate(now.getDate() - 1);
                  if (d.toDateString() !== y.toDateString()) return false;
                }
                if (billPresetRange === 'last_7_days') {
                  const past = new Date(now);
                  past.setDate(now.getDate() - 7);
                  if (d < past || d > now) return false;
                }
                if (billPresetRange === 'this_month') {
                  if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
                }
              }

              // 2. Search query (matches invoice #, customer name/phone, notes)
              if (billSearch.trim()) {
                const q = billSearch.toLowerCase();
                const invMatch = (b.invoice_number || '').toLowerCase().includes(q);
                const custNameMatch = (b.customer?.name || '').toLowerCase().includes(q);
                const custPhoneMatch = (b.customer?.phone || '').includes(q);
                const notesMatch = (b.notes || '').toLowerCase().includes(q);
                if (!invMatch && !custNameMatch && !custPhoneMatch && !notesMatch) return false;
              }

              // 3. Status filter
              if (billStatus !== 'all' && (b.status || '').toLowerCase() !== billStatus.toLowerCase()) {
                return false;
              }

              // 4. Payment method filter
              if (billPaymentMethod !== 'all') {
                const payments = details?.payments || [];
                const linkedP = payments.find((p) => p.bill_id === b.id);
                if (!linkedP || linkedP.method.toLowerCase() !== billPaymentMethod.toLowerCase()) {
                  return false;
                }
              }

              return true;
            });

            const totalBilledMinor = filteredBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
            const paidCount = filteredBills.filter((b) => b.status === 'paid').length;
            const pendingCount = filteredBills.filter((b) => b.status === 'pending').length;
            const hasActiveFilters = !!billExactDate || billPresetRange !== 'all' || !!billSearch.trim() || billStatus !== 'all' || billPaymentMethod !== 'all';

            const handleExportSalonBills = () => {
              if (filteredBills.length === 0) return;
              const exportRows = filteredBills.map((b) => ({
                'Invoice Number': b.invoice_number,
                'Issued Date': formatDateTime(b.issued_at || b.created_at),
                Customer: b.customer?.name || 'Walk-in',
                Phone: b.customer?.phone || '—',
                'Total (INR)': Number(((b.total_minor || 0) / 100).toFixed(2)),
                Status: b.status,
              }));
              exportToCSV(
                exportRows,
                `${shop?.name || 'salon'}_bills_${billExactDate || billPresetRange}`
              );
            };

            return (
              <div className="space-y-4">
                {/* Salon Bill Filter Toolbar */}
                <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Exact Single Date Picker */}
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                          Filter by Specific Date:
                        </label>
                        <input
                          type="date"
                          value={billExactDate}
                          onChange={(e) => {
                            setBillExactDate(e.target.value);
                            setBillPresetRange('all');
                          }}
                          className={`w-full text-xs font-mono font-semibold px-2.5 py-1.5 rounded-lg border ${
                            billExactDate ? 'border-black bg-white ring-1 ring-black' : 'border-neutral-200 bg-white'
                          } text-neutral-900 focus:outline-none focus:border-black cursor-pointer shadow-xs`}
                        />
                      </div>
                      {billExactDate && (
                        <button
                          type="button"
                          onClick={() => setBillExactDate('')}
                          className="mt-4 px-2 py-1 text-[11px] font-semibold text-neutral-600 hover:text-black cursor-pointer underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Omni Search for Invoice # / Client */}
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                        Search Invoice / Client:
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          placeholder="Invoice #, customer name, phone..."
                          value={billSearch}
                          onChange={(e) => setBillSearch(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-black shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preset Pills and Status / Method Dropdowns */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200">
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {[
                        { id: 'all', label: 'All Bills' },
                        { id: 'today', label: 'Today' },
                        { id: 'yesterday', label: 'Yesterday' },
                        { id: 'last_7_days', label: '7D' },
                        { id: 'this_month', label: 'This Month' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setBillExactDate('');
                            setBillPresetRange(p.id as any);
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            billPresetRange === p.id && !billExactDate
                              ? 'bg-black text-white font-bold shadow-xs'
                              : 'bg-white border border-neutral-200 text-neutral-600 hover:text-black'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={billStatus}
                        onChange={(e) => setBillStatus(e.target.value)}
                        className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <select
                        value={billPaymentMethod}
                        onChange={(e) => setBillPaymentMethod(e.target.value)}
                        className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Modes</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                      </select>

                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => {
                            setBillExactDate('');
                            setBillPresetRange('all');
                            setBillSearch('');
                            setBillStatus('all');
                            setBillPaymentMethod('all');
                          }}
                          className="px-2 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-black text-[11px] font-semibold cursor-pointer"
                          title="Reset filters"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filter Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-neutral-200 border-l-4 border-l-black bg-white shadow-xs">
                    <span className="text-neutral-500">Invoices Matching Filter:</span>
                    <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                      {filteredBills.length} of {details?.bills.length || 0} total
                    </div>
                    {billExactDate && (
                      <span className="text-[10px] text-neutral-500 font-mono">Date: {billExactDate}</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 border-l-4 border-l-black bg-white shadow-xs">
                    <span className="text-neutral-500">Total Billed in Scope:</span>
                    <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                      {formatCurrency(totalBilledMinor)}
                    </div>
                    <span className="text-[10px] text-neutral-500">Across filtered invoices</span>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 border-l-4 border-l-black bg-white shadow-xs">
                    <span className="text-neutral-500">Settled vs Pending:</span>
                    <div className="text-base font-bold font-mono text-neutral-900 mt-0.5 flex items-center gap-2">
                      <span className="text-emerald-700">{paidCount} Paid</span>
                      <span className="text-neutral-400">•</span>
                      <span className="text-neutral-600">{pendingCount} Pending</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">Payment status split</span>
                  </div>
                </div>

                {/* Filtered Invoices List */}
                {filteredBills.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                        Invoices ({filteredBills.length})
                      </h5>
                      <button
                        type="button"
                        onClick={handleExportSalonBills}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-black hover:underline cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden text-xs shadow-xs max-h-80 overflow-y-auto">
                      {filteredBills.map((b) => {
                        const linkedP = (details?.payments || []).find((p) => p.bill_id === b.id);
                        return (
                          <div key={b.id} className="p-3 flex items-center justify-between bg-white hover:bg-neutral-50 transition-colors">
                            <div className="overflow-hidden pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-neutral-900">{b.invoice_number}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                                  {linkedP?.method ? linkedP.method.toUpperCase() : 'CASH'}
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-500 mt-0.5">
                                {formatDateTime(b.issued_at || b.created_at)} • {b.customer?.name || 'Walk-in'} {b.customer?.phone ? `(${b.customer.phone})` : ''}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-neutral-900">
                                {formatCurrency(b.total_minor)}
                              </div>
                              <StatusBadge status={b.status} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-300 rounded-xl bg-white space-y-2">
                    <p className="font-semibold text-neutral-700">No bills match the selected date or search criteria.</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          setBillExactDate('');
                          setBillPresetRange('all');
                          setBillSearch('');
                          setBillStatus('all');
                          setBillPaymentMethod('all');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-semibold cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Free sales limit:</span>
                  <span className="font-semibold text-neutral-900">
                    {details?.shop.free_sales_limit ?? 100}
                    {details?.shop.free_sales_limit ? ' (custom)' : ' (default)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    placeholder="e.g. 500"
                    disabled={savingLimit || !details}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveLimit(false)}
                    disabled={savingLimit || !details}
                    className="px-3 py-2 rounded-lg bg-neutral-900 text-white font-semibold disabled:opacity-50"
                  >
                    {savingLimit ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveLimit(true)}
                    disabled={savingLimit || !details?.shop.free_sales_limit}
                    className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-neutral-700 font-semibold disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
                {limitMsg && (
                  <p className={limitMsg.ok ? 'text-emerald-600' : 'text-red-600'}>{limitMsg.text}</p>
                )}
                <p className="text-neutral-500">
                  How many bills this salon can create on the free plan before it needs Pro. Leave empty / Reset for the default of 100.
                </p>
              </div>
              {details?.settings ? (
                <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Appointment Reminders:</span>
                    <span className="font-semibold text-neutral-900">
                      {details.settings.appointment_reminder_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Reminder Lead Time:</span>
                    <span className="font-mono text-neutral-900">
                      {details.settings.appointment_reminder_minutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Daily Closing Auto-Report:</span>
                    <span className="font-semibold text-neutral-900">
                      {details.settings.daily_closing_enabled ? `Enabled (${details.settings.daily_closing_time})` : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Payment Followup:</span>
                    <span className="font-semibold text-neutral-900">
                      {details.settings.payment_followup_enabled ? `Every ${details.settings.payment_followup_interval_days} days` : 'Disabled'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-[#E5E7EB] rounded-xl bg-white">
                  No automated settings row configured in <code className="text-neutral-900 font-semibold">public.shop_settings</code>.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TELEMETRY (Rule 1: Honest unavailable state) */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <UnavailableBanner
                title="Device & App Telemetry Unavailable"
                sourceTable="public.telemetry"
                message="Client device telemetry and app installation tracking are not recorded in the connected Supabase database for this salon."
                details="To see device models, OS versions, and app builds, the mobile application must insert events into public.telemetry."
              />
              <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs space-y-2 text-neutral-700">
                <div className="font-semibold text-neutral-900">Expected Telemetry Fields:</div>
                <ul className="list-disc list-inside space-y-1 text-neutral-500 font-mono text-[11px]">
                  <li>device_id: UUID / Hardware string</li>
                  <li>platform: 'android' | 'ios'</li>
                  <li>app_version: e.g. '1.0.0'</li>
                  <li>build_number: integer</li>
                  <li>last_active: timestamptz</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
