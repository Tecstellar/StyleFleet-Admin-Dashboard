import React, { useState, useMemo } from 'react';
import {
  Users,
  Scissors,
  Store,
  Phone,
  Shield,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  MessageCircle,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Calendar,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { EmptyState } from '../common/EmptyState';
import {
  Shop,
  Staff,
  StylistPermissions,
  DEFAULT_STYLIST_PERMISSIONS,
} from '../../types/database';
import {
  createStaff,
  updateStaff,
  updateStaffPermissions,
  updateStaffInvitationStatus,
  deleteStaff,
} from '../../services/usersService';
import { formatDateTime, formatDate } from '../../utils/dateUtils';

interface StylistsViewProps {
  staff: Staff[];
  shops: Shop[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectSalon?: (shop: Shop) => void;
}

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.stylefleet.app&pcampaignid=web_share';

const MODULE_DEFINITIONS: {
  key: keyof StylistPermissions;
  label: string;
  description: string;
  icon: string;
}[] = [
  { key: 'customers', label: 'Customers', description: 'View and add client directory & history', icon: '👥' },
  { key: 'sales', label: 'Sales & Billing', description: 'Create and view bills, payments & invoices', icon: '🧾' },
  { key: 'appointments', label: 'Appointments', description: 'Book and manage client appointments & calendar', icon: '📅' },
  { key: 'reminders', label: 'Reminders', description: 'Send automated WhatsApp reminders to clients', icon: '🔔' },
  { key: 'expenses', label: 'Expenses', description: 'View and record salon operational expenses', icon: '💰' },
  { key: 'reports', label: 'Reports & BI', description: 'Access financial & performance analytics', icon: '📊' },
  { key: 'team', label: 'Team', description: 'View staff members, roster & commissions', icon: '✂️' },
  { key: 'profile', label: 'Profile & Settings', description: 'View and edit salon profile & shop configuration', icon: '⚙️' },
];

export const StylistsView: React.FC<StylistsViewProps> = ({
  staff,
  shops,
  loading = false,
  onRefresh,
  onSelectSalon,
}) => {
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('all');
  const [inviteStatusFilter, setInviteStatusFilter] = useState<string>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');

  // Modals
  const [permissionModalStaff, setPermissionModalStaff] = useState<Staff | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<Staff | null>(null);

  // Form states for Add/Edit
  const [formShopId, setFormShopId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('Stylist');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPermissions, setFormPermissions] = useState<StylistPermissions>(DEFAULT_STYLIST_PERMISSIONS);
  const [formSendInvite, setFormSendInvite] = useState(true);

  // Action pending states
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((st) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = st.name.toLowerCase().includes(query);
        const phoneMatch = st.phone ? st.phone.includes(query) : false;
        const shopMatch = st.shop?.name ? st.shop.name.toLowerCase().includes(query) : false;
        const roleMatch = st.role ? st.role.toLowerCase().includes(query) : false;
        if (!nameMatch && !phoneMatch && !shopMatch && !roleMatch) return false;
      }

      // 2. Shop filter
      if (selectedShopFilter !== 'all' && st.shop_id !== selectedShopFilter) {
        return false;
      }

      // 3. Invitation status filter
      if (inviteStatusFilter !== 'all') {
        const status = st.invitation_status || 'not_invited';
        if (inviteStatusFilter === 'active' && status !== 'active') return false;
        if (inviteStatusFilter === 'invited' && status !== 'invited') return false;
        if (inviteStatusFilter === 'not_invited' && status !== 'not_invited') return false;
      }

      // 4. Account active filter
      if (activeStatusFilter !== 'all') {
        if (activeStatusFilter === 'active' && !st.is_active) return false;
        if (activeStatusFilter === 'inactive' && st.is_active) return false;
      }

      return true;
    });
  }, [staff, searchQuery, selectedShopFilter, inviteStatusFilter, activeStatusFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = staff.length;
    const appActive = staff.filter((s) => s.invitation_status === 'active').length;
    const invited = staff.filter((s) => s.invitation_status === 'invited').length;
    const notInvited = staff.filter((s) => !s.invitation_status || s.invitation_status === 'not_invited').length;
    const activeAccounts = staff.filter((s) => s.is_active).length;

    return { total, appActive, invited, notInvited, activeAccounts };
  }, [staff]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormShopId(shops[0]?.id || '');
    setFormName('');
    setFormPhone('');
    setFormRole('Stylist');
    setFormIsActive(true);
    setFormPermissions(DEFAULT_STYLIST_PERMISSIONS);
    setFormSendInvite(true);
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (st: Staff) => {
    setEditingStaff(st);
    setFormShopId(st.shop_id);
    setFormName(st.name);
    setFormPhone(st.phone || '');
    setFormRole(st.role || 'Stylist');
    setFormIsActive(st.is_active);
    setFormPermissions(st.permissions || DEFAULT_STYLIST_PERMISSIONS);
    setFormSendInvite(false);
    setIsAddEditModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveStaffForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formShopId) {
      showFeedback('Please select a salon for this stylist', 'error');
      return;
    }
    if (!formName.trim()) {
      showFeedback('Stylist name is required', 'error');
      return;
    }

    const cleanPhone = formPhone.replace(/[^0-9]/g, '').slice(-10);
    if (formPhone.trim() && cleanPhone.length !== 10) {
      showFeedback('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    setActionLoading(true);

    try {
      if (editingStaff) {
        // Update existing
        const res = await updateStaff(editingStaff.id, {
          shop_id: formShopId,
          name: formName.trim(),
          phone: cleanPhone || null,
          role: formRole.trim(),
          is_active: formIsActive,
          permissions: formPermissions,
        });

        if (res.error) throw new Error(res.error);
        showFeedback(`Stylist "${formName}" updated successfully`);
      } else {
        // Create new
        const res = await createStaff({
          shop_id: formShopId,
          name: formName.trim(),
          phone: cleanPhone || null,
          role: formRole.trim(),
          is_active: formIsActive,
          permissions: formPermissions,
          invitation_status: 'not_invited',
        });

        if (res.error) throw new Error(res.error);
        showFeedback(`Stylist "${formName}" added successfully`);

        // If send invite was selected and phone exists, open WhatsApp invite
        if (formSendInvite && cleanPhone && res.data) {
          handleSendWhatsAppInvite(res.data);
        }
      }

      setIsAddEditModalOpen(false);
      onRefresh?.();
    } catch (err: any) {
      showFeedback(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Single Permission in Modal
  const handleTogglePermission = async (key: keyof StylistPermissions) => {
    if (!permissionModalStaff) return;
    const currentPerms = permissionModalStaff.permissions || DEFAULT_STYLIST_PERMISSIONS;
    const updated: StylistPermissions = {
      ...currentPerms,
      [key]: !currentPerms[key],
    };

    setPermissionModalStaff({
      ...permissionModalStaff,
      permissions: updated,
    });

    setActionLoading(true);
    const res = await updateStaffPermissions(permissionModalStaff.id, updated);
    setActionLoading(false);

    if (res.error) {
      showFeedback('Failed to update permission in Supabase', 'error');
    } else {
      showFeedback(`Permission "${key}" updated`);
      onRefresh?.();
    }
  };

  // Toggle All Permissions
  const handleToggleAllPermissions = async (grant: boolean) => {
    if (!permissionModalStaff) return;
    const updated: StylistPermissions = {
      customers: grant,
      sales: grant,
      appointments: grant,
      reminders: grant,
      expenses: grant,
      reports: grant,
      team: grant,
      profile: grant,
    };

    setPermissionModalStaff({
      ...permissionModalStaff,
      permissions: updated,
    });

    setActionLoading(true);
    const res = await updateStaffPermissions(permissionModalStaff.id, updated);
    setActionLoading(false);

    if (res.error) {
      showFeedback('Failed to update permissions', 'error');
    } else {
      showFeedback(grant ? 'All permissions granted' : 'All permissions revoked');
      onRefresh?.();
    }
  };

  // Toggle Active/Inactive toggle directly in list
  const handleToggleActive = async (st: Staff) => {
    const newStatus = !st.is_active;
    setActionLoading(true);
    const res = await updateStaff(st.id, { is_active: newStatus });
    setActionLoading(false);

    if (res.error) {
      showFeedback('Failed to toggle status', 'error');
    } else {
      showFeedback(`Stylist is now ${newStatus ? 'Active' : 'Inactive'}`);
      onRefresh?.();
    }
  };

  // Send WhatsApp Invite
  const handleSendWhatsAppInvite = async (st: Staff) => {
    if (!st.phone) {
      showFeedback('Cannot send WhatsApp invite: No phone number registered for this stylist', 'error');
      return;
    }

    const cleanPhone = st.phone.replace(/[^0-9]/g, '').slice(-10);
    const salonName = st.shop?.name || 'our salon';
    const message = encodeURIComponent(
      `Hello ${st.name}! You have been invited to join ${salonName} on StyleFleet.\n\n` +
      `Download the StyleFleet app from Google Play Store to manage appointments, bills, and clients:\n` +
      `${PLAY_STORE_URL}\n\n` +
      `Log in using your registered mobile number: +91 ${cleanPhone}`
    );

    const waUrl = `https://wa.me/91${cleanPhone}?text=${message}`;

    // Mark as invited in database
    await updateStaffInvitationStatus(st.id, 'invited', new Date().toISOString());
    onRefresh?.();

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showFeedback(`WhatsApp invitation opened for ${st.name}`);
  };

  // Delete Staff
  const handleDeleteStaff = async () => {
    if (!deleteConfirmStaff) return;
    setActionLoading(true);
    const res = await deleteStaff(deleteConfirmStaff.id);
    setActionLoading(false);

    if (res.error) {
      showFeedback(res.error || 'Failed to delete staff member', 'error');
    } else {
      showFeedback(`Stylist "${deleteConfirmStaff.name}" has been removed`);
      setDeleteConfirmStaff(null);
      onRefresh?.();
    }
  };

  // Copy phone number
  const handleCopyPhone = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
    showFeedback('Phone number copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-neutral-500 hover:text-black ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Total Stylists</span>
            <Scissors className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-2 font-mono">{metrics.total}</div>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">Across {shops.length} salons</span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">App Active</span>
            <Smartphone className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-2 font-mono">{metrics.appActive}</div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Logged in to mobile app</span>
        </div>

        <div className="p-4 rounded-xl border border-[#E8DEC4] bg-[#FAF7EE] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B8860B]">Invited via WhatsApp</span>
            <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-2 font-mono">{metrics.invited}</div>
          <span className="text-[11px] text-[#B8860B] mt-0.5 block">Invite link delivered</span>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600">Pending Invite</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-700 mt-2 font-mono">{metrics.notInvited}</div>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">Needs WhatsApp invite</span>
        </div>

        <div className="p-4 rounded-xl border border-[#D4AF37]/30 bg-[#FAF7EE]/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B8860B]">Active Roster</span>
            <CheckCircle2 className="w-4 h-4 text-[#B8860B]" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-2 font-mono">{metrics.activeAccounts}</div>
          <span className="text-[11px] text-[#B8860B] mt-0.5 block">Enabled for salon work</span>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl border border-[#E5E7EB] bg-white shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stylist by name, phone, salon, or role..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#D4AF37] focus:bg-white"
            />
          </div>

          {/* Salon Dropdown Filter */}
          <div className="min-w-[160px]">
            <select
              value={selectedShopFilter}
              onChange={(e) => setSelectedShopFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-neutral-800 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="all">All Salons ({shops.length})</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Invitation Status Filter */}
          <div className="min-w-[140px]">
            <select
              value={inviteStatusFilter}
              onChange={(e) => setInviteStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-neutral-800 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="all">All Invite Statuses</option>
              <option value="active">App Active</option>
              <option value="invited">Invited</option>
              <option value="not_invited">Not Invited</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton
            data={filteredStaff.map((s) => {
              const perms = s.permissions || DEFAULT_STYLIST_PERMISSIONS;
              return {
                Name: s.name,
                Role: s.role,
                Phone: s.phone ? `+91 ${s.phone}` : '—',
                Salon: s.shop?.name || '—',
                Status: s.is_active ? 'Active' : 'Inactive',
                Invitation: s.invitation_status || 'not_invited',
                InvitedAt: s.invited_at ? formatDate(s.invited_at) : '—',
                CustomersAccess: perms.customers ? 'Yes' : 'No',
                SalesAccess: perms.sales ? 'Yes' : 'No',
                AppointmentsAccess: perms.appointments ? 'Yes' : 'No',
                RemindersAccess: perms.reminders ? 'Yes' : 'No',
                ExpensesAccess: perms.expenses ? 'Yes' : 'No',
                ReportsAccess: perms.reports ? 'Yes' : 'No',
                TeamAccess: perms.team ? 'Yes' : 'No',
                ProfileAccess: perms.profile ? 'Yes' : 'No',
              };
            })}
            filename="stylefleet_stylists_roster.csv"
          />

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0D1C42] text-white hover:bg-[#08122B] text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Add Stylist</span>
          </button>


        </div>
      </div>

      {/* Stylist Roster Table */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500 animate-pulse">
            Loading team & stylists from Supabase...
          </div>
        ) : filteredStaff.length === 0 ? (
          <EmptyState
            title="No Stylists Found"
            description={
              searchQuery || selectedShopFilter !== 'all' || inviteStatusFilter !== 'all'
                ? 'No stylists match the selected filter criteria. Try adjusting your filters or search query.'
                : 'No stylists currently registered. Click "+ Add Stylist" to add the first stylist.'
            }
            actionText="+ Add First Stylist"
            onAction={handleOpenAdd}
          />

        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF7EE] border-b border-[#E5E7EB] text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Stylist</th>
                  <th className="py-3 px-4">Salon Assigned</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Invitation Status</th>
                  <th className="py-3 px-4">Active Roster</th>
                  <th className="py-3 px-4">Module Permissions</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {filteredStaff.map((st) => {
                  const perms = st.permissions || DEFAULT_STYLIST_PERMISSIONS;
                  const grantedCount = Object.values(perms).filter(Boolean).length;
                  const isAppActive = st.invitation_status === 'active';
                  const isInvited = st.invitation_status === 'invited';

                  return (
                    <tr key={st.id} className="hover:bg-[#FAF9F5] transition-colors group">
                      {/* Stylist Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-[#D4AF37] font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {st.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                              <span>{st.name}</span>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                                {st.role || 'Stylist'}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              ID: {st.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Salon Assigned */}
                      <td className="py-3.5 px-4">
                        {st.shop ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => onSelectSalon?.(st.shop!)}
                              className="font-semibold text-neutral-900 hover:text-[#B8860B] transition-colors text-xs flex items-center gap-1 group-hover:underline text-left"
                            >
                              <Store className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                              <span>{st.shop.name}</span>
                            </button>
                            {st.shop.city && (
                              <div className="text-[11px] text-neutral-500 mt-0.5">
                                {st.shop.city}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Mobile Number */}
                      <td className="py-3.5 px-4 font-mono">
                        {st.phone ? (
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-800 font-semibold">+91 {st.phone}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(st.id, st.phone!)}
                              className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded transition-colors"
                              title="Copy mobile number"
                            >
                              {copiedPhoneId === st.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">No phone</span>
                        )}
                      </td>

                      {/* Invitation Status */}
                      <td className="py-3.5 px-4">
                        {isAppActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>App Active</span>
                          </span>
                        ) : isInvited ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#FAF7EE] text-[#B8860B] border border-[#E8DEC4]"
                            title={st.invited_at ? `Invited on ${formatDateTime(st.invited_at)}` : 'Invited'}
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Invited {st.invited_at ? `(${formatDate(st.invited_at)})` : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                            <span>Not Invited</span>
                          </span>
                        )}
                      </td>

                      {/* Active Status Switch */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(st)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all border cursor-pointer ${
                            st.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200'
                          }`}
                          title={`Click to ${st.is_active ? 'deactivate' : 'activate'} this stylist`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              st.is_active ? 'bg-emerald-600' : 'bg-neutral-400'
                            }`}
                          />
                          <span>{st.is_active ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      {/* Permissions Summary */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setPermissionModalStaff(st)}
                          className="flex items-center gap-2 group/perm hover:bg-[#FAF7EE] p-1.5 rounded-lg border border-transparent hover:border-[#D4AF37]/40 transition-all text-left"
                        >
                          <Shield className="w-4 h-4 text-[#D4AF37]" />
                          <div>
                            <span className="font-bold text-neutral-900 block text-[11px]">
                              {grantedCount} of 8 modules
                            </span>
                            <span className="text-[10px] text-neutral-500 group-hover/perm:text-[#B8860B] transition-colors">
                              Click to configure &rarr;
                            </span>
                          </div>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Invite Button */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppInvite(st)}
                            disabled={!st.phone}
                            title={
                              st.phone
                                ? isInvited
                                  ? 'Resend WhatsApp Invitation'
                                  : 'Send WhatsApp Invitation'
                                : 'Phone number required'
                            }
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                              st.phone
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-300 cursor-not-allowed'
                            }`}
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden xl:inline text-[11px]">
                              {isInvited ? 'Resend' : 'Invite'}
                            </span>
                          </button>

                          {/* Permissions modal trigger */}
                          <button
                            type="button"
                            onClick={() => setPermissionModalStaff(st)}
                            className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white text-neutral-700 hover:text-black hover:border-[#D4AF37] hover:bg-[#FAF7EE] transition-colors"
                            title="Manage Access Permissions"
                          >
                            <Shield className="w-3.5 h-3.5 text-[#B8860B]" />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white text-neutral-700 hover:text-black hover:bg-neutral-50 transition-colors"
                            title="Edit Stylist Details"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-neutral-600" />
                          </button>

                          {/* Delete Stylist */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmStaff(st)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove Stylist"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: STYLIST PERMISSIONS CONTROL MODAL                           */}
      {/* ==================================================================== */}
      {permissionModalStaff && (
        <Modal
          isOpen={!!permissionModalStaff}
          onClose={() => setPermissionModalStaff(null)}
          title={`Stylist Permissions: ${permissionModalStaff.name}`}
          subtitle={`Salon: ${permissionModalStaff.shop?.name || 'Unassigned'} | Mobile: ${
            permissionModalStaff.phone ? `+91 ${permissionModalStaff.phone}` : '—'
          }`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Realtime enforcement note */}
            <div className="p-3.5 rounded-xl border border-[#D4AF37]/40 bg-[#FAF7EE] flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#B8860B] shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-800 leading-relaxed">
                <span className="font-bold text-neutral-900">Enforced by Company Admin HQ:</span> All permission updates persist directly in Supabase and take effect <strong>immediately</strong> on the stylist's mobile device without requiring re-login.
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Module Access Controls ({Object.values(permissionModalStaff.permissions || DEFAULT_STYLIST_PERMISSIONS).filter(Boolean).length}/8 Active)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAllPermissions(true)}
                  disabled={actionLoading}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#FAF7EE] text-[#B8860B] hover:bg-[#F3ECCE] border border-[#D4AF37]/50 transition-colors cursor-pointer"
                >
                  Grant All
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAllPermissions(false)}
                  disabled={actionLoading}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-300 transition-colors cursor-pointer"
                >
                  Revoke All
                </button>
              </div>
            </div>

            {/* 8 Module Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULE_DEFINITIONS.map(({ key, label, description, icon }) => {
                const perms = permissionModalStaff.permissions || DEFAULT_STYLIST_PERMISSIONS;
                const isGranted = perms[key];

                return (
                  <div
                    key={key}
                    onClick={() => handleTogglePermission(key)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                      isGranted
                        ? 'border-[#D4AF37] bg-[#FAF7EE]/60 shadow-xs'
                        : 'border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg shrink-0">{icon}</span>
                      <div>
                        <div className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                          <span>{label}</span>
                          {isGranted && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              Enabled
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                          {description}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-9 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                        isGranted ? 'bg-[#D4AF37]' : 'bg-neutral-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform absolute top-0.5 ${
                          isGranted ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
              <span className="text-[11px] text-neutral-400">
                Staff ID: <code className="font-mono">{permissionModalStaff.id}</code>
              </span>
              <button
                type="button"
                onClick={() => setPermissionModalStaff(null)}
                className="px-4 py-2 rounded-xl bg-[#0D1C42] text-white hover:bg-[#08122B] font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>


            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: ADD / EDIT STYLIST MODAL                                    */}
      {/* ==================================================================== */}
      {isAddEditModalOpen && (
        <Modal
          isOpen={isAddEditModalOpen}
          onClose={() => setIsAddEditModalOpen(false)}
          title={editingStaff ? `Edit Stylist: ${editingStaff.name}` : 'Add New Stylist to Salon'}
          subtitle="Configure stylist credentials, salon assignment, and access rights."
          maxWidth="lg"
        >
          <form onSubmit={handleSaveStaffForm} className="space-y-4">
            {/* Salon Selection */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Select Salon <span className="text-rose-500">*</span>
              </label>
              <select
                value={formShopId}
                onChange={(e) => setFormShopId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-neutral-900 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="">-- Choose a salon --</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.city ? `(${s.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Stylist Name */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Stylist Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-neutral-900 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Mobile Number (for OTP & WhatsApp Invite)
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 text-xs bg-neutral-100 border border-r-0 border-[#E5E7EB] rounded-l-xl text-neutral-600 font-semibold font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-xs rounded-r-xl border border-[#E5E7EB] bg-white text-neutral-900 font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                10-digit number used by stylist to sign in via Supabase OTP on mobile.
              </p>
            </div>

            {/* Role / Designation */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Role / Title
              </label>
              <input
                type="text"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                placeholder="e.g. Senior Stylist, Barber, Hairdresser, Colorist"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-neutral-900 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="formIsActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-[#E5E7EB] text-[#D4AF37] focus:ring-[#D4AF37]"
              />
              <label htmlFor="formIsActive" className="text-xs font-semibold text-neutral-800">
                Active in Salon Roster (Can take appointments and be assigned to bills)
              </label>
            </div>

            {/* Auto WhatsApp Invite Checkbox (only for new creation) */}
            {!editingStaff && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <input
                  type="checkbox"
                  id="formSendInvite"
                  checked={formSendInvite}
                  onChange={(e) => setFormSendInvite(e.target.checked)}
                  className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="formSendInvite" className="text-xs font-semibold text-emerald-900">
                  Prompt WhatsApp invitation immediately upon creation
                </label>
              </div>
            )}

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-neutral-700 hover:bg-neutral-50 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-[#0D1C42] text-white hover:bg-[#08122B] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />}
                <span>{editingStaff ? 'Update Stylist' : 'Save Stylist'}</span>
              </button>


            </div>
          </form>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION MODAL                                   */}
      {/* ==================================================================== */}
      {deleteConfirmStaff && (
        <Modal
          isOpen={!!deleteConfirmStaff}
          onClose={() => setDeleteConfirmStaff(null)}
          title="Remove Stylist"
          subtitle="Are you sure you want to remove this stylist from the salon?"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 leading-relaxed">
              This will remove <strong>{deleteConfirmStaff.name}</strong> from salon{' '}
              <strong>{deleteConfirmStaff.shop?.name || 'assigned salon'}</strong>. Past bills and historical reports will retain historical stylist attribution.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setDeleteConfirmStaff(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
