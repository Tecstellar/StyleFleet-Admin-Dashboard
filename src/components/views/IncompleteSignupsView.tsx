import React, { useMemo, useState } from 'react';
import {
  UserX,
  AlertTriangle,
  Building2,
  Calendar,
  Search,
  MessageCircle,
  Phone,
  ArrowRight,
  X,
  Sparkles,
  Users,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import { Shop } from '../../types/database';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { formatDateTime } from '../../utils/dateUtils';

interface IncompleteSignupsViewProps {
  shops: Shop[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
}

export const IncompleteSignupsView: React.FC<IncompleteSignupsViewProps> = ({
  shops,
  loading = false,
  onSelectSalon,
}) => {
  const [blockerFilter, setBlockerFilter] = useState<'all' | 'no_staff' | 'no_bills' | 'missing_info'>('all');
  const [exactDate, setExactDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Deduplicate shops first so no duplicate canonical entries
  const deduplicatedShops = useMemo(() => {
    const seen = new Set<string>();
    return shops.filter((s) => {
      const norm = s.name.trim().toLowerCase();
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [shops]);

  // Identify Incomplete Salons
  const incompleteShops = useMemo(() => {
    return deduplicatedShops.filter((s) => {
      const hasZeroStaff = (s.staff_count ?? 0) === 0;
      const hasZeroBills = (s.bill_count ?? 0) === 0;
      const hasMissingInfo = !s.phone || !s.address;
      return hasZeroStaff || hasZeroBills || hasMissingInfo;
    });
  }, [deduplicatedShops]);

  // Handle Preset Click
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

  // Filter incomplete salons
  const filteredShops = useMemo(() => {
    return incompleteShops.filter((s) => {
      // 1. Blocker filter
      if (blockerFilter === 'no_staff' && (s.staff_count ?? 0) > 0) return false;
      if (blockerFilter === 'no_bills' && (s.bill_count ?? 0) > 0) return false;
      if (blockerFilter === 'missing_info' && s.phone && s.address) return false;

      // 2. Exact Date
      if (exactDate) {
        if (!s.created_at) return false;
        const sDate = new Date(s.created_at).toISOString().split('T')[0];
        if (sDate !== exactDate) return false;
      }

      // 3. Date Presets (7d, 30d) if no exact single date
      if (!exactDate && datePreset !== 'all') {
        if (!s.created_at) return false;
        const sTime = new Date(s.created_at).getTime();
        const now = Date.now();
        if (datePreset === '7d' && now - sTime > 7 * 86400000) return false;
        if (datePreset === '30d' && now - sTime > 30 * 86400000) return false;
      }

      // 4. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (s.name || '').toLowerCase().includes(q);
        const phoneMatch = (s.phone || '').includes(q);
        const cityMatch = (s.city || '').toLowerCase().includes(q);
        const ownerMatch = (s.owner_profile?.full_name || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !cityMatch && !ownerMatch) return false;
      }

      return true;
    });
  }, [incompleteShops, blockerFilter, exactDate, datePreset, searchQuery]);

  const resetFilters = () => {
    setBlockerFilter('all');
    setExactDate('');
    setDatePreset('all');
    setSearchQuery('');
  };

  const isAnyFilterActive =
    blockerFilter !== 'all' ||
    exactDate !== '' ||
    datePreset !== 'all' ||
    searchQuery.trim() !== '';

  const columns: Column<Shop>[] = [
    {
      key: 'name',
      header: 'Salon Business',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center shrink-0">
            {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div className="font-bold text-neutral-900">{s.name}</div>
            <div className="text-[11px] text-neutral-500">
              {s.city || 'Location unconfigured'} • Owner: {s.owner_profile?.full_name || 'Unlinked'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact & Outreach',
      render: (s) => {
        const phone = s.phone || s.owner_profile?.phone;
        const cleanPhone = (phone || '').replace(/\D/g, '');
        const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const ownerName = s.owner_profile?.full_name || 'Owner';
        const waMessage = `Hi ${ownerName}, welcome to StyleFleet! We noticed your salon '${s.name}' is set up. Need any assistance adding your staff or creating your first bill?`;

        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-neutral-900">
              {phone || 'No Phone Recorded'}
            </span>
            {cleanPhone.length >= 10 && (
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black text-white text-[11px] font-semibold hover:bg-neutral-800 transition-colors shadow-xs"
                title="Send WhatsApp Onboarding Assistance"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Nudge</span>
              </a>
            )}
            {cleanPhone.length >= 10 && (
              <a
                href={`tel:${cleanPhone}`}
                className="p-1 rounded-md bg-neutral-100 hover:bg-black hover:text-white text-neutral-700 transition-colors"
                title="Direct Phone Call"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'blockers',
      header: 'Onboarding Blockers',
      render: (s) => {
        const noStaff = (s.staff_count ?? 0) === 0;
        const noBills = (s.bill_count ?? 0) === 0;
        const noPhone = !s.phone;

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {noStaff && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">
                <Users className="w-3 h-3 text-neutral-700" />
                <span>0 Staff</span>
              </span>
            )}
            {noBills && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">
                <Receipt className="w-3 h-3 text-neutral-700" />
                <span>0 Bills</span>
              </span>
            )}
            {noPhone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">
                <AlertTriangle className="w-3 h-3 text-neutral-700" />
                <span>Missing Phone</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Signup Date',
      render: (s) => (
        <span className="font-mono text-xs text-neutral-600">
          {formatDateTime(s.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Assistance Action',
      render: (s) => (
        <button
          onClick={() => onSelectSalon && onSelectSalon(s)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-900 hover:bg-black hover:text-white transition-colors"
        >
          <span>Inspect Salon</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-black text-white shadow-xs">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Incomplete Signups &amp; Drop-off Recovery
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Salons registered in database that have not completed team setup or billed their first client.
            </p>
          </div>
        </div>

        <ExportButton
          data={filteredShops}
          filename="stylefleet_incomplete_signups"
          columns={[
            { key: 'name', label: 'Salon Name' },
            { key: 'phone', label: 'Salon Phone' },
            { key: 'city', label: 'City' },
            { key: 'staff_count', label: 'Staff Count' },
            { key: 'bill_count', label: 'Bill Count' },
            { key: 'created_at', label: 'Registered Date' },
          ]}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-neutral-200 border-l-3 border-l-[#1c1f26] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Incomplete Salons</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#1c1f26]" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
            {incompleteShops.length}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Require onboarding outreach</span>
        </div>

        <div className="p-3 rounded-lg border border-neutral-200 border-l-3 border-l-[#1c1f26] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Zero Staff Added</span>
            <Users className="w-3.5 h-3.5 text-neutral-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
            {deduplicatedShops.filter((s) => (s.staff_count ?? 0) === 0).length}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Awaiting team invitation</span>
        </div>

        <div className="p-3 rounded-lg border border-neutral-200 border-l-3 border-l-[#1c1f26] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Awaiting 1st Bill</span>
            <Receipt className="w-3.5 h-3.5 text-neutral-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
            {deduplicatedShops.filter((s) => (s.bill_count ?? 0) === 0).length}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Ready to start billing</span>
        </div>

        <div className="p-3 rounded-lg border border-neutral-200 border-l-3 border-l-[#1c1f26] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Fully Onboarded</span>
            <CheckCircle className="w-3.5 h-3.5 text-neutral-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
            {deduplicatedShops.filter((s) => (s.staff_count ?? 0) > 0 && (s.bill_count ?? 0) > 0).length}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Staff + billing active</span>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
            <Sparkles className="w-4 h-4 text-black" />
            <span>Targeting &amp; Date Filters</span>
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
          {/* 1. Search */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Search Salon / Owner
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, phone, city..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 2. Blocker Stage */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-neutral-400" />
              <span>Drop-off Stage</span>
            </label>
            <select
              value={blockerFilter}
              onChange={(e) => setBlockerFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Incomplete ({incompleteShops.length})</option>
              <option value="no_staff">No Staff Added</option>
              <option value="no_bills">No Bills Created</option>
              <option value="missing_info">Missing Phone / Address</option>
            </select>
          </div>

          {/* 3. Exact Registration Date */}
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
        </div>

        {/* Clear Filters */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-neutral-500 font-medium">
              Showing <span className="font-bold text-black">{filteredShops.length}</span> salons
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredShops}
        loading={loading}
        searchPlaceholder="Filter listed salons..."
        emptyTitle="No Incomplete Signups Found"
        emptyDescription="All salons matching your criteria have completed staff and billing onboarding steps!"
      />
    </div>
  );
};
