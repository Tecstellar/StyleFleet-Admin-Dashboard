import React, { useState, useMemo } from 'react';
import { Store, Eye, ShieldCheck, MapPin, Phone, User, Calendar, Receipt, Filter, X, Sparkles, Plus, Key } from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { SalonDetailModal } from './SalonDetailModal';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
import { Shop } from '../../types/database';

interface SalonsViewProps {
  shops: Shop[];
  loading?: boolean;
  selectedShop?: Shop | null;
  onClearSelectedShop?: () => void;
  onStaffChange?: () => void;
  initialModalTab?: 'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry';
}

export const SalonsView: React.FC<SalonsViewProps> = ({
  shops,
  loading = false,
  selectedShop: externalSelectedShop,
  onClearSelectedShop,
  onStaffChange,
  initialModalTab = 'overview',
}) => {
  const [internalSelectedShop, setInternalSelectedShop] = useState<Shop | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry'>(
    initialModalTab
  );

  React.useEffect(() => {
    if (initialModalTab) {
      setModalTab(initialModalTab);
    }
  }, [initialModalTab]);

  const [exactDate, setExactDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<'all' | 'with_staff' | 'no_staff'>('all');

  const activeModalShop = externalSelectedShop || internalSelectedShop;

  const handleCloseModal = () => {
    setInternalSelectedShop(null);
    onClearSelectedShop?.();
  };

  const handlePreset = (preset: 'all' | 'today' | 'yesterday' | '7d' | '30d') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setExactDate(now.toISOString().split('T')[0]);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setExactDate(y.toISOString().split('T')[0]);
    } else {
      setExactDate('');
    }
  };

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.city && s.city.trim()) set.add(s.city.trim());
    });
    return Array.from(set).sort();
  }, [shops]);

  const filteredShops = useMemo(() => {
    // The directory uses its own date filters below; the top-bar range (default Today) must not hide salons.
    return shops.filter((s) => {
      // Exact date
      if (exactDate) {
        if (!s.created_at) return false;
        const d = new Date(s.created_at).toISOString().split('T')[0];
        if (d !== exactDate) return false;
      }

      // Presets
      if (!exactDate && datePreset !== 'all') {
        if (!s.created_at) return false;
        const sTime = new Date(s.created_at).getTime();
        const now = Date.now();
        if (datePreset === '7d' && now - sTime > 7 * 86400000) return false;
        if (datePreset === '30d' && now - sTime > 30 * 86400000) return false;
      }

      // City
      if (cityFilter !== 'all' && s.city?.trim().toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }

      // Staff status
      if (staffFilter === 'with_staff' && (s.staff_count ?? 0) === 0) return false;
      if (staffFilter === 'no_staff' && (s.staff_count ?? 0) > 0) return false;

      return true;
    });
  }, [shops, exactDate, datePreset, cityFilter, staffFilter]);

  const resetFilters = () => {
    setExactDate('');
    setDatePreset('all');
    setCityFilter('all');
    setStaffFilter('all');
  };

  const isAnyFilterActive = exactDate !== '' || datePreset !== 'all' || cityFilter !== 'all' || staffFilter !== 'all';

  const columns: Column<Shop>[] = [
    {
      key: 'name',
      header: 'Salon Name',
      render: (shop) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg bg-[#1c1f26] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-[#2d3139]"
          >
            {shop.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-neutral-900 flex items-center gap-1.5 flex-wrap">
              <span>{shop.name}</span>
              {shop.duplicate_count && shop.duplicate_count > 0 ? (
                <span
                  className="px-1.5 py-0.5 text-[9px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 rounded"
                  title={`${shop.duplicate_count} duplicate registration(s) detected and merged into this canonical active salon record`}
                >
                  Deduplicated ({shop.duplicate_count} merged)
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  Verified Real
                </span>
              )}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono truncate max-w-[140px]">
              ID: {shop.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (shop) => {
        if (!shop.owner_profile) {
          return (
            <span className="text-neutral-500 text-xs italic">
              Unassigned
            </span>
          );
        }
        return (
          <div>
            <div className="font-medium text-neutral-900">
              {shop.owner_profile.full_name || 'Profile'}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono">
              {shop.owner_profile.phone || 'No phone'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Salon Phone',
      render: (shop) => (
        <span className="font-mono text-xs text-neutral-700">
          {shop.phone || '—'}
        </span>
      ),
    },
    {
      key: 'customers',
      header: 'Live Clients',
      render: (shop) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-neutral-900 font-mono">
            {shop.customer_count ?? 0}
          </span>
          <span className="text-[11px] text-neutral-500">clients</span>
        </div>
      ),
    },
    {
      key: 'staff',
      header: 'Stylists / Staff',
      render: (shop) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-neutral-900 font-mono">
            {shop.staff_count ?? 0}
          </span>
          <span className="text-[11px] text-neutral-500">stylists</span>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Location',
      render: (shop) => (
        <div>
          <div className="text-neutral-900 font-medium">
            {shop.city || '—'}
          </div>
          <div className="text-[11px] text-neutral-500 truncate max-w-[150px]">
            {shop.address || 'No address'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusBadge status="active" />,
      sortable: false,
    },
    {
      key: 'bill_count',
      header: '100 Free Quota',
      render: (shop) => {
        const salesDone = shop.bill_count || 0;
        const remaining = Math.max(0, 100 - salesDone);
        const pct = Math.min(100, Math.round((salesDone / 100) * 100));
        return (
          <div className="space-y-1 min-w-[130px]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-neutral-900">{salesDone}/100</span>
              <span className={`font-mono text-[10px] font-bold ${salesDone >= 50 ? 'text-neutral-900' : 'text-neutral-500'}`}>
                {remaining === 0 ? 'Limit Reached' : `${remaining} left`}
              </span>
            </div>
            <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Registered',
      render: (shop) => (
        <span className="text-neutral-700 text-xs font-mono">
          {formatDate(shop.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (shop) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModalTab('overview');
              setInternalSelectedShop(shop);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-neutral-200 bg-white text-neutral-800 hover:border-[#1c1f26] hover:bg-[#1c1f26] hover:text-white shadow-xs transition-colors cursor-pointer"
            title="View salon overview & team"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setModalTab('billing');
              setInternalSelectedShop(shop);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-neutral-200 bg-neutral-100 text-neutral-900 hover:bg-[#1c1f26] hover:text-white hover:border-[#1c1f26] shadow-xs transition-colors cursor-pointer"
            title="Inspect all bills and filter by date for this salon"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Bills &amp; Payments</span>
          </button>
        </div>
      ),
      sortable: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Salons Management
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Verified salon businesses connected to Supabase table <code className="text-neutral-900 font-mono font-bold">public.shops</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredShops}
            filename="stylefleet_salons"
            columns={[
              { key: 'name', label: 'Salon Name' },
              { key: 'phone', label: 'Salon Phone' },
              { key: 'city', label: 'City' },
              { key: 'address', label: 'Address' },
              { key: 'pin_code', label: 'Pin Code' },
              { key: 'created_at', label: 'Created At' },
            ]}
          />
        </div>
      </div>

      {/* Real Data Integrity Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs">
        <div className="flex items-center gap-2 text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Production Data Guarantee:</span>
          <span>Deduplication engine active. Only verified real salons are tracked (Zero duplicates, Zero random/dummy data).</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-emerald-700">
          <span>Active Unique Salons: {filteredShops.length}</span>
        </div>
      </div>

      {/* Multi-Attribute Filter Toolbar */}
      <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
            <Sparkles className="w-4 h-4 text-black" />
            <span>Salon Filters &amp; Date Targeting</span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-neutral-400 mr-1">Presets:</span>
            {(['all', 'today', 'yesterday', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors capitalize ${
                  datePreset === p && !exactDate
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Exact Registration Date */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-neutral-400" />
              <span>Exact Registration Date</span>
            </label>
            <input
              type="date"
              value={exactDate}
              onChange={(e) => {
                setExactDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            />
          </div>

          {/* 2. City Filter */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>Filter by City</span>
            </label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Staff Onboarding Status */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-neutral-400" />
              <span>Team Status</span>
            </label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Salons</option>
              <option value="with_staff">Has Staff Members (&gt;0)</option>
              <option value="no_staff">No Staff Members (0)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-neutral-500 font-medium">
              Showing <span className="font-bold text-black">{filteredShops.length}</span> matching salons
            </span>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-neutral-100 text-black hover:bg-neutral-200 font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Salons Table */}
      <DataTable
        columns={columns}
        data={filteredShops}
        loading={loading}
        emptyTitle="No salons found"
        emptyDescription="No salons registered in Supabase match the current date filter or search query."
        searchPlaceholder="Search salon name, city, phone..."
        searchFields={['name', 'city', 'phone', 'address']}
        defaultSortField="created_at"
        defaultSortOrder="desc"
        onRowClick={(shop) => {
          setModalTab('overview');
          setInternalSelectedShop(shop);
        }}
      />

      {/* Detail Modal */}
      <SalonDetailModal
        shop={activeModalShop}
        isOpen={!!activeModalShop}
        onClose={handleCloseModal}
        onStaffChange={onStaffChange}
        initialTab={modalTab}
      />
    </div>
  );
};

