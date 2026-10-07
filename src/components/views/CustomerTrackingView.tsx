import React, { useMemo, useState } from 'react';
import {
  Users,
  Search,
  Building2,
  Calendar,
  Star,
  MessageCircle,
  Phone,
  X,
  UserCheck,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Customer, Shop, Bill } from '../../types/database';
import { DataTable, Column } from '../common/DataTable';
import { ExportButton } from '../common/ExportButton';
import { formatDateTime } from '../../utils/dateUtils';

interface CustomerTrackingViewProps {
  customers: Customer[];
  shops: Shop[];
  bills: Bill[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
}

export const CustomerTrackingView: React.FC<CustomerTrackingViewProps> = ({
  customers,
  shops,
  bills,
  loading = false,
  onSelectSalon,
}) => {
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const [exactDate, setExactDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');
  const [starredOnly, setStarredOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map of shopId -> deduplicated canonical shop
  const shopMap = useMemo(() => {
    const map = new Map<string, Shop>();
    shops.forEach((s) => map.set(s.id, s));
    return map;
  }, [shops]);

  // Deduplicated shops for dropdown
  const deduplicatedShops = useMemo(() => {
    const seen = new Set<string>();
    return shops
      .filter((s) => {
        const norm = s.name.trim().toLowerCase();
        if (seen.has(norm)) return false;
        seen.add(norm);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shops]);

  // Count bills per customer id or customer phone if available
  const billCountByCustomer = useMemo(() => {
    const counts = new Map<string, number>();
    bills.forEach((b) => {
      if (b.customer_id) {
        counts.set(b.customer_id, (counts.get(b.customer_id) || 0) + 1);
      }
      if (b.customer?.phone) {
        counts.set(b.customer.phone, (counts.get(b.customer.phone) || 0) + 1);
      }
    });
    return counts;
  }, [bills]);

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

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // 1. Salon filter
      if (salonFilter !== 'all' && c.shop_id !== salonFilter) {
        return false;
      }

      // 2. Starred filter
      if (starredOnly && !c.is_starred) {
        return false;
      }

      // 3. Exact Date
      if (exactDate) {
        if (!c.created_at) return false;
        const cDate = new Date(c.created_at).toISOString().split('T')[0];
        if (cDate !== exactDate) return false;
      }

      // 4. Presets (7d, 30d) if no exact single date
      if (!exactDate && datePreset !== 'all') {
        if (!c.created_at) return false;
        const cTime = new Date(c.created_at).getTime();
        const now = Date.now();
        if (datePreset === '7d' && now - cTime > 7 * 86400000) return false;
        if (datePreset === '30d' && now - cTime > 30 * 86400000) return false;
      }

      // 5. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').includes(q);
        const shop = shopMap.get(c.shop_id);
        const shopMatch = shop ? shop.name.toLowerCase().includes(q) : false;
        if (!nameMatch && !phoneMatch && !shopMatch) return false;
      }

      return true;
    });
  }, [customers, salonFilter, starredOnly, exactDate, datePreset, searchQuery, shopMap]);

  const resetFilters = () => {
    setSalonFilter('all');
    setExactDate('');
    setDatePreset('all');
    setStarredOnly(false);
    setSearchQuery('');
  };

  const isAnyFilterActive =
    salonFilter !== 'all' ||
    exactDate !== '' ||
    datePreset !== 'all' ||
    starredOnly ||
    searchQuery.trim() !== '';

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Client Details',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center shrink-0">
            {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-neutral-900">
              <span>{c.name || 'Unnamed Client'}</span>
              {c.is_starred && (
                <span title="Starred VIP Client">
                  <Star className="w-3.5 h-3.5 fill-black text-black" />
                </span>
              )}
            </div>
            {c.notes && (
              <p className="text-[11px] text-neutral-500 truncate max-w-xs">{c.notes}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact & WhatsApp',
      render: (c) => {
        const cleanPhone = (c.phone || '').replace(/\D/g, '');
        const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-neutral-900">
              {c.phone || 'No Phone'}
            </span>
            {cleanPhone.length >= 10 && (
              <a
                href={`https://wa.me/${waNumber}?text=Hello%20${encodeURIComponent(c.name || 'Valued Customer')}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded-md bg-neutral-100 hover:bg-black hover:text-white text-neutral-700 transition-colors"
                title="Direct WhatsApp Chat"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
            {cleanPhone.length >= 10 && (
              <a
                href={`tel:${c.phone}`}
                className="p-1 rounded-md bg-neutral-100 hover:bg-black hover:text-white text-neutral-700 transition-colors"
                title="Call Phone"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'shop_id',
      header: 'Registered Salon',
      render: (c) => {
        const shop = shopMap.get(c.shop_id);
        if (!shop) {
          return <span className="font-mono text-xs text-neutral-400">{c.shop_id.slice(0, 8)}...</span>;
        }
        return (
          <button
            onClick={() => onSelectSalon && onSelectSalon(shop)}
            className="text-left font-semibold text-neutral-900 hover:underline hover:text-black flex items-center gap-1 group"
          >
            <Building2 className="w-3.5 h-3.5 text-neutral-400 group-hover:text-black" />
            <span>{shop.name}</span>
          </button>
        );
      },
    },
    {
      key: 'bills_count',
      header: 'Activity Ledger',
      render: (c) => {
        const billCount =
          billCountByCustomer.get(c.id) ||
          (c.phone ? billCountByCustomer.get(c.phone) : 0) ||
          0;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Receipt className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-bold text-neutral-900">{billCount}</span>
            <span className="text-[11px] text-neutral-500">bills</span>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'First Seen / Date',
      render: (c) => (
        <span className="font-mono text-xs text-neutral-600">
          {formatDateTime(c.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-black text-white shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Customer Tracking &amp; CRM Directory
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live customer records stored across all partner salons in <code className="text-black font-semibold font-mono">public.customers</code>.
            </p>
          </div>
        </div>

        <ExportButton
          data={filteredCustomers}
          filename="stylefleet_customers"
          columns={[
            { key: 'name', label: 'Customer Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'shop_id', label: 'Salon ID' },
            { key: 'is_starred', label: 'Is Starred VIP' },
            { key: 'notes', label: 'Notes' },
            { key: 'created_at', label: 'Registration Date' },
          ]}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Tracked Clients</span>
            <Users className="w-4 h-4 text-black" />
          </div>
          <div className="text-3xl font-black font-mono text-black">
            {customers.length}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Registered in database</span>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Filtered Matches</span>
            <UserCheck className="w-4 h-4 text-neutral-700" />
          </div>
          <div className="text-3xl font-black font-mono text-black">
            {filteredCustomers.length}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Matching active filters</span>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Starred VIP Clients</span>
            <Star className="w-4 h-4 text-neutral-900 fill-black" />
          </div>
          <div className="text-3xl font-black font-mono text-black">
            {customers.filter((c) => c.is_starred).length}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Tagged by salon owners</span>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Salons with Clients</span>
            <Building2 className="w-4 h-4 text-neutral-700" />
          </div>
          <div className="text-3xl font-black font-mono text-black">
            {new Set(customers.map((c) => c.shop_id)).size}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Active salon client bases</span>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
            <Sparkles className="w-4 h-4 text-black" />
            <span>Search &amp; Multi-Attribute Date / Salon Filters</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Omni Search */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Search Client
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, phone number..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 2. Salon Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-neutral-400" />
              <span>Filter by Salon</span>
            </label>
            <select
              value={salonFilter}
              onChange={(e) => setSalonFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Salons ({deduplicatedShops.length})</option>
              {deduplicatedShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Exact Date Picker */}
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

          {/* 4. VIP Starred Filter */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <Star className="w-3 h-3 text-neutral-400" />
              <span>Customer Tier</span>
            </label>
            <button
              onClick={() => setStarredOnly(!starredOnly)}
              className={`w-full px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                starredOnly
                  ? 'bg-black text-white border-black'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${starredOnly ? 'fill-white text-white' : 'text-neutral-500'}`} />
              <span>{starredOnly ? 'VIP Starred Only' : 'All Customers'}</span>
            </button>
          </div>
        </div>

        {/* Clear Filters Bar */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-neutral-500 font-medium">
              Showing <span className="font-bold text-black">{filteredCustomers.length}</span> matching clients
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

      {/* Customer Data Table */}
      <DataTable
        columns={columns}
        data={filteredCustomers}
        loading={loading}
        searchPlaceholder="Filter listed clients..."
        emptyTitle="No Client Records Found"
        emptyDescription="No customer records in public.customers match the selected date, salon, or filter criteria."
      />
    </div>
  );
};
