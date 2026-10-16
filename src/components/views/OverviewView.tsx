import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  ChevronDown,
  MapPin,
  ExternalLink,
  Phone,
  MessageCircle,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { ExportButton } from '../common/ExportButton';
import { useDateFilter } from '../../context/DateFilterContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, filterByDateRange } from '../../utils/dateUtils';
import {
  Shop,
  Profile,
  Staff,
  Customer,
  Bill,
  Payment,
  Appointment,
  AccountDeletion,
  SupportMessage,
} from '../../types/database';
import { NavView } from '../../types/dashboard';
import { SalonFreshDetailPage } from './SalonFreshDetailPage';

interface OverviewViewProps {
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
}

const cleanDigits = (p?: string | null) => (p ? p.replace(/\D/g, '').slice(-10) : '');

export const OverviewView: React.FC<OverviewViewProps> = ({
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
}) => {
  const { dateRange, selectedOption } = useDateFilter();
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedDetailSalon, setSelectedDetailSalon] = useState<Shop | null>(null);

  // Scoped bills for the selected date range
  const scopedBills = useMemo(() => {
    return filterByDateRange(bills, 'issued_at', dateRange);
  }, [bills, dateRange]);

  // Aggregate shop performance
  const salonPerformance = useMemo(() => {
    // 1. Group bills by shop
    const billsByShop = new Map<string, Bill[]>();
    scopedBills.forEach((b) => {
      if (!b.shop_id) return;
      if (!billsByShop.has(b.shop_id)) billsByShop.set(b.shop_id, []);
      billsByShop.get(b.shop_id)!.push(b);
    });

    const lifetimeBillsByShop = new Map<string, Bill[]>();
    bills.forEach((b) => {
      if (!b.shop_id) return;
      if (!lifetimeBillsByShop.has(b.shop_id)) lifetimeBillsByShop.set(b.shop_id, []);
      lifetimeBillsByShop.get(b.shop_id)!.push(b);
    });

    // 2. Group staff by shop
    const staffByShop = new Map<string, Staff[]>();
    staff.forEach((s) => {
      if (!s.shop_id) return;
      if (!staffByShop.has(s.shop_id)) staffByShop.set(s.shop_id, []);
      staffByShop.get(s.shop_id)!.push(s);
    });

    // 3. Group customers by shop
    const customersByShop = new Map<string, Customer[]>();
    customers.forEach((c) => {
      if (!c.shop_id) return;
      if (!customersByShop.has(c.shop_id)) customersByShop.set(c.shop_id, []);
      customersByShop.get(c.shop_id)!.push(c);
    });

    // 4. Map profiles
    const profilesMap = new Map<string, Profile>();
    profiles.forEach((p) => profilesMap.set(p.id, p));

    return shops.map((s) => {
      const sBills = billsByShop.get(s.id) || [];
      const sLifetimeBills = lifetimeBillsByShop.get(s.id) || [];
      const sStaff = staffByShop.get(s.id) || [];
      const sCustomers = customersByShop.get(s.id) || [];

      const billed = sBills.reduce((acc, b) => (b.status !== 'deleted' ? acc + (b.total_minor || 0) : acc), 0);
      const lifetimeBilled = sLifetimeBills.reduce((acc, b) => (b.status !== 'deleted' ? acc + (b.total_minor || 0) : acc), 0);

      const ownerProf = s.owner_profile_id ? profilesMap.get(s.owner_profile_id) : null;
      const ownerName = ownerProf?.full_name || s.name;
      const ownerPhone = ownerProf?.phone || s.phone;

      const isLive = sLifetimeBills.length > 0;
      const freeLimit = s.free_sales_limit || 100;
      const isPro = freeLimit > 100;

      return {
        ...s,
        shopObj: s,
        billed,
        lifetimeBilled,
        billCount: sBills.length,
        lifetimeSalesCount: sLifetimeBills.length,
        staffCount: sStaff.length,
        totalCustomerCount: sCustomers.length,
        ownerName,
        ownerPhone,
        isLive,
        isPro,
        freeLimit,
      };
    });
  }, [shops, scopedBills, bills, staff, customers, profiles]);

  // Unique cities list
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.city) set.add(s.city.trim());
    });
    return Array.from(set);
  }, [shops]);

  // Counts for the 3 clean tabs
  const tabCounts = useMemo(() => {
    const total = salonPerformance.length;
    const active = salonPerformance.filter((s) => s.isLive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [salonPerformance]);

  // Filtered salons
  const displayedSalons = useMemo(() => {
    return salonPerformance.filter((s) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          s.name.toLowerCase().includes(q) ||
          (s.city && s.city.toLowerCase().includes(q)) ||
          (s.phone && s.phone.includes(q)) ||
          (s.ownerName && s.ownerName.toLowerCase().includes(q)) ||
          (s.ownerPhone && s.ownerPhone.includes(q));
        if (!matches) return false;
      }

      // 2. City Filter
      if (cityFilter !== 'all' && s.city?.toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }

      // 3. Tab Filter
      if (activeTabFilter === 'active' && !s.isLive) return false;
      if (activeTabFilter === 'inactive' && s.isLive) return false;

      return true;
    });
  }, [salonPerformance, searchQuery, cityFilter, activeTabFilter]);

  // IF SALON IS CLICKED, RENDER FRESH FULL PAGE WITH CLEAR DARK LETTERS
  if (selectedDetailSalon) {
    return (
      <SalonFreshDetailPage
        shop={selectedDetailSalon}
        profiles={profiles}
        staff={staff}
        customers={customers}
        bills={bills}
        appointments={appointments}
        payments={payments}
        onBack={() => setSelectedDetailSalon(null)}
      />
    );
  }

  return (
    <div className="space-y-6 font-sans text-neutral-900 select-none pb-12">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e0e5e9] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#004e64] tracking-tight">
            Overview
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Salon directory and executive platform ledger
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Export Button */}
          <ExportButton
            data={displayedSalons.map((s) => ({
              'Salon Name': s.name,
              'Owner Name': s.ownerName,
              'Phone': s.phone || s.ownerPhone || '—',
              'City': s.city || 'Tamil Nadu',
              'Registered Date': s.created_at ? formatDate(s.created_at) : '—',
              'Status': s.isLive ? 'Active' : 'Inactive',
              'Plan': s.isPro ? 'PRO' : 'FREE',
              'Sales Count': s.lifetimeSalesCount,
              'Total Billed (INR)': Math.round(s.lifetimeBilled / 100),
            }))}
            filename={`stylefleet_overview_${new Date().toISOString().split('T')[0]}`}
            label="Export CSV"
          />

          {/* Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-lg border border-[#e0e5e9] bg-white hover:bg-neutral-50 text-[#004e64] transition-colors cursor-pointer shadow-2xs"
            title="Refresh Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. UNIFIED 2-COLOR FILTER TOOLBAR (#004e64 & #e0e5e9) */}
      <div className="bg-white rounded-2xl border border-[#e0e5e9] p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 3 Clean Filter Tabs: All, Active, Inactive */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'all'
                  ? 'bg-[#004e64] text-white shadow-xs'
                  : 'bg-[#e0e5e9] text-[#004e64] hover:bg-[#d0d8dd]'
              }`}
            >
              All Salons ({tabCounts.total})
            </button>

            <button
              onClick={() => setActiveTabFilter('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'active'
                  ? 'bg-[#004e64] text-white shadow-xs'
                  : 'bg-[#e0e5e9] text-[#004e64] hover:bg-[#d0d8dd]'
              }`}
            >
              Active ({tabCounts.active})
            </button>

            <button
              onClick={() => setActiveTabFilter('inactive')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'inactive'
                  ? 'bg-[#004e64] text-white shadow-xs'
                  : 'bg-[#e0e5e9] text-[#004e64] hover:bg-[#d0d8dd]'
              }`}
            >
              Inactive ({tabCounts.inactive})
            </button>
          </div>

          {/* Search Input & City Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[#004e64]/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search salon, owner, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#e0e5e9] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#004e64] shadow-2xs"
              />
            </div>

            {uniqueCities.length > 0 && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#e0e5e9] bg-white text-[#004e64] font-medium focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">All Cities</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 3. SALONS OVERVIEW TABLE (CLEAR DARK LETTERS, 2-COLOR DESIGN) */}
        <div className="overflow-x-auto border-t border-[#e0e5e9] pt-3">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#e0e5e9] text-[10px] font-bold uppercase tracking-wider text-[#004e64] bg-[#e0e5e9]/40 font-mono">
                <th className="py-3 px-3">SALON NAME</th>
                <th className="py-3 px-3">OWNER NAME</th>
                <th className="py-3 px-3">PHONE</th>
                <th className="py-3 px-3">LOCATION</th>
                <th className="py-3 px-3">REGISTERED</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3 text-center">PLAN</th>
                <th className="py-3 px-3 text-center">ORDERS / BILLS</th>
                <th className="py-3 px-3 text-right">TOTAL SALES</th>
                <th className="py-3 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e5e9]/60 text-neutral-900">
              {displayedSalons.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-neutral-400">
                    No salon records match the selected filter.
                  </td>
                </tr>
              ) : (
                displayedSalons.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-[#e0e5e9]/20 transition-colors"
                  >
                    {/* 1. SALON NAME (Clickable to Fresh Page) */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => {
                          if (onSelectSalon) onSelectSalon(s.shopObj);
                          else setSelectedDetailSalon(s.shopObj);
                        }}
                        className="text-left font-bold text-neutral-900 hover:text-[#004e64] hover:underline cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{s.name}</span>
                        <ChevronRight className="w-3 h-3 text-[#004e64]/60 shrink-0" />
                      </button>
                    </td>

                    {/* 2. OWNER NAME */}
                    <td className="py-3 px-3 font-semibold text-neutral-800">
                      {s.ownerName}
                    </td>

                    {/* 3. PHONE */}
                    <td className="py-3 px-3 font-mono text-neutral-800">
                      <a
                        href={`https://wa.me/91${cleanDigits(s.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#004e64] transition-colors"
                      >
                        {s.phone || s.ownerPhone || '—'}
                      </a>
                    </td>

                    {/* 4. LOCATION */}
                    <td className="py-3 px-3 text-neutral-700">
                      <div>{s.city || 'Kalugumalai'}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">Tamil Nadu</div>
                    </td>

                    {/* 5. REGISTERED */}
                    <td className="py-3 px-3 font-mono text-neutral-600 text-[11px]">
                      {s.created_at ? formatDate(s.created_at) : '—'}
                    </td>

                    {/* 6. STATUS (Strict 2-Color Mono Badges) */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          s.isLive
                            ? 'bg-[#004e64] text-white shadow-2xs'
                            : 'bg-[#e0e5e9] text-[#004e64] border border-[#004e64]/20'
                        }`}
                      >
                        {s.isLive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>

                    {/* 7. PLAN (PRO / FREE) */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          s.isPro
                            ? 'bg-[#004e64] text-white shadow-2xs'
                            : 'bg-[#e0e5e9] text-[#004e64] border border-[#004e64]/20'
                        }`}
                      >
                        {s.isPro ? 'PRO' : 'FREE'}
                      </span>
                    </td>

                    {/* 8. ORDERS / BILLS */}
                    <td className="py-3 px-3 text-center font-bold text-neutral-900 font-mono">
                      {s.lifetimeSalesCount}
                    </td>

                    {/* 9. TOTAL SALES (₹) */}
                    <td className="py-3 px-3 text-right font-black text-neutral-900 font-mono">
                      ₹{Math.round(s.lifetimeBilled / 100).toLocaleString()}
                    </td>

                    {/* 10. ACTION (Open Fresh Page) */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          if (onSelectSalon) onSelectSalon(s.shopObj);
                          else setSelectedDetailSalon(s.shopObj);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-[#004e64] hover:bg-[#003d4f] text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <span>View Salon</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
