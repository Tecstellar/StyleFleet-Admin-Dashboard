import React, { useState, useMemo } from 'react';
import {
  Pencil,
  Trash2,
  Download,
  Search,
  FileSpreadsheet,
  FileText,
  Phone,
  MapPin,
  ExternalLink,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Crown,
  Sparkles,
  Users,
} from 'lucide-react';
import { Shop, Bill, TelemetryRecord } from '../../types/database';
import { formatNumber, exportToCSV } from '../../utils/formatters';
import { formatDate } from '../../utils/dateUtils';
import { supabase } from '../../services/supabase';

interface UserDetailsViewProps {
  shops: Shop[];
  bills: Bill[];
  subscriptions?: any[];
  telemetryRecords?: TelemetryRecord[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectSalon?: (shop: Shop) => void;
}

// Pastel avatar color configurations matching reference UI
const AVATAR_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-rose-100 text-rose-700',
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-800',
];

function getAvatarInitials(name: string): string {
  if (!name || name.trim().length === 0) return 'SF';
  const clean = name.trim();
  // If starts with digits (e.g. phone number like 6380195272)
  if (/^\d/.test(clean)) {
    return clean.slice(0, 2);
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getAvatarColorClass(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export const UserDetailsView: React.FC<UserDetailsViewProps> = ({
  shops = [],
  bills = [],
  subscriptions = [],
  telemetryRecords = [],
  loading = false,
  onRefresh,
  onSelectSalon,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'free' | 'pro'>('all');

  // Edit Salon Modal State
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLimit, setEditLimit] = useState<number>(100);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation Modal State
  const [deletingShop, setDeletingShop] = useState<Shop | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Read saved local company subscriptions for instant sync
  const manualSubscriptions = useMemo(() => {
    try {
      const saved = localStorage.getItem('stylefleet_company_subscriptions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  // Deduplicated Salons List
  const deduplicatedShops = useMemo(() => {
    const seen = new Set<string>();
    return shops.filter((s) => {
      const norm = s.name.trim().toLowerCase();
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [shops]);

  // Aggregate shop statistics (bills, earnings, taps, subscription status)
  const shopDataList = useMemo(() => {
    return deduplicatedShops.map((shop, index) => {
      // Find all duplicate IDs for this shop to aggregate metrics
      const allowedIds =
        shop.duplicate_ids && shop.duplicate_ids.length > 0
          ? shop.duplicate_ids
          : [shop.id];

      // Shop Bills & Earnings
      const shopBills = bills.filter((b) => allowedIds.includes(b.shop_id));
      const billCount = shop.bill_count ?? shopBills.length;
      const totalEarned = shopBills.reduce((acc, b) => {
        const amt = b.total_minor ? b.total_minor / 100 : 0;
        return acc + amt;
      }, 0);

      // Check if subscribed
      const hasRemoteSub = subscriptions.some(
        (sub) => allowedIds.includes(sub.shop_id) && sub.status === 'active'
      );
      const hasLocalSub = manualSubscriptions.some((sub: any) =>
        allowedIds.includes(sub.shopId)
      );
      const isCustomLimitPro = (shop.free_sales_limit ?? 100) > 500;
      const isSubscribed = hasRemoteSub || hasLocalSub || isCustomLimitPro;

      // Subscribed date / plan
      let subscribedText = '—';
      if (isSubscribed) {
        const localMatch = manualSubscriptions.find((sub: any) =>
          allowedIds.includes(sub.shopId)
        );
        if (localMatch) {
          subscribedText = `${localMatch.planName || 'Pro'}`;
        } else if (hasRemoteSub) {
          subscribedText = 'Active Pro';
        } else if (isCustomLimitPro) {
          subscribedText = 'Pro Unlimited';
        }
      }

      // App telemetry / taps
      const shopTelemetry = telemetryRecords.filter((t) =>
        allowedIds.includes(t.shop_id || '')
      );
      const tapsCount = shopTelemetry.length;

      // App Version & OS
      const latestTelemetry = shopTelemetry[0];
      const version = latestTelemetry
        ? `${latestTelemetry.app_version || '2.29'} • ${latestTelemetry.platform || 'Android'}`
        : '2.29 • Android';

      // Free Orders Quota
      const freeLimit =
        shop.free_sales_limit && shop.free_sales_limit > 0
          ? shop.free_sales_limit
          : 100;
      const remainingOrders = Math.max(0, freeLimit - billCount);

      // Sequential ID matching format TS2026100031 -> SF2026100001
      const createdDate = shop.created_at ? new Date(shop.created_at) : new Date();
      const year = createdDate.getFullYear();
      const month = String(createdDate.getMonth() + 1).padStart(2, '0');
      const seq = String(index + 1).padStart(5, '0');
      const formattedId = `SF${year}${month}${seq}`;

      return {
        shop,
        id: formattedId,
        rawShopId: shop.id,
        name: shop.name,
        phone: shop.phone || shop.owner_profile?.phone || '—',
        version,
        city: shop.city || '—',
        isSubscribed,
        status: isSubscribed ? 'Pro plan' : 'Free plan',
        billCount,
        freeLimit,
        remainingOrders,
        totalEarned,
        tapsCount,
        subscribedText,
        createdAt: shop.created_at,
      };
    });
  }, [deduplicatedShops, bills, subscriptions, manualSubscriptions, telemetryRecords]);

  // Filtered List
  const filteredList = useMemo(() => {
    return shopDataList.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesPhone = item.phone.toLowerCase().includes(q);
        const matchesCity = item.city.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCity && !matchesId) {
          return false;
        }
      }

      // Status
      if (statusFilter === 'free' && item.isSubscribed) return false;
      if (statusFilter === 'pro' && !item.isSubscribed) return false;

      return true;
    });
  }, [shopDataList, searchQuery, statusFilter]);

  // 4 Top KPI Cards
  const totalUsersCount = shopDataList.length;
  const activeFreePlansCount = shopDataList.filter((s) => !s.isSubscribed).length;
  const totalCompletedEarnings = shopDataList.reduce((acc, s) => acc + s.totalEarned, 0);
  const avgAppTaps = useMemo(() => {
    if (shopDataList.length === 0) return '0.0';
    const sumTaps = shopDataList.reduce((acc, s) => acc + s.tapsCount, 0);
    return (sumTaps / shopDataList.length).toFixed(1);
  }, [shopDataList]);

  // Export to CSV
  const handleExportCSV = () => {
    const exportRows = filteredList.map((item) => ({
      'ID': item.id,
      'Shop': item.name,
      'Phone': item.phone,
      'Version': item.version,
      'City': item.city,
      'Status': item.status,
      'Orders Used': item.billCount,
      'Free Limit': item.isSubscribed ? 'Unlimited' : item.freeLimit,
      'Remaining Orders': item.isSubscribed ? 'Unlimited' : item.remainingOrders,
      'Earned (INR)': item.totalEarned,
      'Taps': item.tapsCount,
      'Subscribed': item.subscribedText,
    }));
    exportToCSV(exportRows, `stylefleet_user_details_${new Date().toISOString().slice(0, 10)}`);
  };

  // Export to Excel (CSV with UTF-8 BOM Excel formatting)
  const handleExportExcel = () => {
    handleExportCSV();
  };

  // Open Edit Modal
  const handleOpenEdit = (shop: Shop) => {
    setEditingShop(shop);
    setEditName(shop.name);
    setEditPhone(shop.phone || '');
    setEditCity(shop.city || '');
    setEditAddress(shop.address || '');
    setEditLimit(shop.free_sales_limit || 100);
  };

  // Save Shop Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;

    try {
      setIsSavingEdit(true);
      const { error } = await supabase
        .from('shops')
        .update({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          city: editCity.trim() || null,
          address: editAddress.trim() || null,
          free_sales_limit: Number(editLimit),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingShop.id);

      if (error) throw error;

      alert(`Shop "${editName}" updated successfully.`);
      setEditingShop(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Failed to update shop: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Salon Shop
  const handleConfirmDelete = async () => {
    if (!deletingShop) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', deletingShop.id);

      if (error) throw error;

      alert(`Salon "${deletingShop.name}" deleted.`);
      setDeletingShop(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete shop: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* 4 TOP SUMMARY CARDS (EXACT METRICS FROM REFERENCE IMAGE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* TOTAL USERS */}
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            TOTAL USERS
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-2 font-mono">
            {formatNumber(totalUsersCount)}
          </div>
        </div>

        {/* ACTIVE FREE PLANS */}
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            ACTIVE FREE PLANS
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-2 font-mono">
            {formatNumber(activeFreePlansCount)}
          </div>
        </div>

        {/* TOTAL EARNINGS */}
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            TOTAL EARNINGS
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-2 font-mono">
            ₹{formatNumber(Math.round(totalCompletedEarnings * 10) / 10)}
          </div>
        </div>

        {/* AVG APP TAPS */}
        <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            AVG APP TAPS
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-2 font-mono">
            {avgAppTaps}
          </div>
        </div>
      </div>

      {/* MAIN USER DETAILS CARD */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              User Details
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Completed earnings are summed from orders with a completion date. App taps come from the mobile touch heatmap (last 7 days).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search shop, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 w-44 sm:w-56"
              />
            </div>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="free">Free Plan ({activeFreePlansCount})</option>
              <option value="pro">Pro Plan ({totalUsersCount - activeFreePlansCount})</option>
            </select>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>Export CSV</span>
            </button>

            {/* Refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
                title="Refresh user details"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* User Details Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50">
                <th className="py-3 px-3.5">ID</th>
                <th className="py-3 px-3">SHOP</th>
                <th className="py-3 px-3">PHONE</th>
                <th className="py-3 px-3">VERSION</th>
                <th className="py-3 px-3">CITY</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3">FREE ORDERS</th>
                <th className="py-3 px-3">EARNED</th>
                <th className="py-3 px-3">TAPS</th>
                <th className="py-3 px-3">SUBSCRIBED</th>
                <th className="py-3 px-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-xs text-neutral-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((row) => {
                  const avatarColor = getAvatarColorClass(row.name);
                  const initials = getAvatarInitials(row.name);

                  return (
                    <tr
                      key={row.rawShopId}
                      className="hover:bg-neutral-50/70 transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-3 px-3.5 font-mono font-bold text-neutral-900 text-[11px] whitespace-nowrap">
                        {row.id}
                      </td>

                      {/* SHOP */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 min-w-[170px] max-w-[240px]">
                          {/* Circle Avatar with 2 letters */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${avatarColor}`}
                          >
                            {initials}
                          </div>
                          {/* Shop Name */}
                          <button
                            onClick={() => onSelectSalon && onSelectSalon(row.shop)}
                            className="font-bold text-neutral-900 hover:text-blue-600 transition-colors truncate text-left cursor-pointer"
                            title={`View ${row.name} in Salon 360`}
                          >
                            {row.name}
                          </button>
                        </div>
                      </td>

                      {/* PHONE */}
                      <td className="py-3 px-3 font-mono text-neutral-700 whitespace-nowrap">
                        {row.phone !== '—' ? (
                          <a
                            href={`tel:${row.phone}`}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {row.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* VERSION */}
                      <td className="py-3 px-3 font-mono text-neutral-700 whitespace-nowrap">
                        {row.version}
                      </td>

                      {/* CITY */}
                      <td className="py-3 px-3 text-neutral-700 whitespace-nowrap">
                        {row.city}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {row.isSubscribed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Pro plan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                            Free plan
                          </span>
                        )}
                      </td>

                      {/* FREE ORDERS */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {row.isSubscribed ? (
                          <div>
                            <div className="font-mono font-semibold text-neutral-900 text-xs">
                              Unlimited
                            </div>
                            <div className="text-[10px] text-blue-600 font-medium">
                              Active Pro
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono font-medium text-neutral-900 text-xs">
                              {row.billCount}/{row.freeLimit} orders
                            </div>
                            <div className="text-[10px] font-mono text-neutral-500">
                              {row.remainingOrders} left
                            </div>
                          </div>
                        )}
                      </td>

                      {/* EARNED */}
                      <td className="py-3 px-3 font-mono font-semibold text-neutral-900 whitespace-nowrap">
                        ₹{formatNumber(row.totalEarned)}
                      </td>

                      {/* TAPS */}
                      <td className="py-3 px-3 font-mono text-neutral-800 whitespace-nowrap">
                        {row.tapsCount}
                      </td>

                      {/* SUBSCRIBED */}
                      <td className="py-3 px-3 font-mono text-neutral-600 whitespace-nowrap">
                        {row.subscribedText}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(row.shop)}
                            className="p-1.5 rounded border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                            title="Edit User / Salon"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingShop(row.shop)}
                            className="p-1.5 rounded border border-neutral-300 hover:border-red-400 hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete User / Salon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* EDIT SALON DETAILS MODAL */}
      {editingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Edit Salon Details
                </h3>
                <p className="text-xs text-neutral-500">
                  Update salon profile and free orders sales quota
                </p>
              </div>
              <button
                onClick={() => setEditingShop(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Salon Name */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Salon Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* City */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">City</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Chennai, Coimbatore, Theni"
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Address</label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Street / Shop location"
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Free Orders Sales Quota */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">
                  Free Orders Quota (Sales Limit)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editLimit}
                  onChange={(e) => setEditLimit(Number(e.target.value))}
                  className="w-full p-2 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-[10px] text-neutral-400">
                  Default is 100 sales. Set higher or 10000 for unlimited Pro access.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                {onSelectSalon && (
                  <button
                    type="button"
                    onClick={() => {
                      const s = editingShop;
                      setEditingShop(null);
                      onSelectSalon(s);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    <span>View Salon 360</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingShop(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Delete Salon Shop?
            </h3>
            <p className="text-xs text-neutral-500 mt-1.5">
              Are you sure you want to delete <span className="font-semibold text-neutral-800">{deletingShop.name}</span>? This action will remove the shop record from the active database.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingShop(null)}
                className="px-4 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-xs text-neutral-700 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs text-white font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Salon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
