import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Store,
  User,
  Phone,
  MapPin,
  Calendar,
  Receipt,
  Scissors,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Shop, Profile, Staff, Customer, Bill, Payment, Appointment } from '../../types/database';
import { supabase } from '../../services/supabase';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface SalonFreshDetailPageProps {
  shop: Shop;
  profiles: Profile[];
  staff: Staff[];
  customers: Customer[];
  bills: Bill[];
  appointments: Appointment[];
  payments: Payment[];
  onBack: () => void;
  onRefresh?: () => void;
}

interface SalonService {
  id: string;
  name: string;
  price_minor: number;
  duration_minutes: number;
  is_active: boolean;
  category_id?: string | null;
}

export const SalonFreshDetailPage: React.FC<SalonFreshDetailPageProps> = ({
  shop,
  profiles,
  staff,
  customers,
  bills,
  appointments,
  payments,
  onBack,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'services' | 'bills' | 'appointments'>('overview');
  const [services, setServices] = useState<SalonService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Match owner profile
  const ownerProfile = useMemo(() => {
    if (shop.owner_profile_id) {
      const p = profiles.find((prof) => prof.id === shop.owner_profile_id);
      if (p) return p;
    }
    const cleanShopPhone = (shop.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanShopPhone) {
      const p = profiles.find((prof) => (prof.phone || '').replace(/\D/g, '').slice(-10) === cleanShopPhone);
      if (p) return p;
    }
    return null;
  }, [shop, profiles]);

  // Associated staff for this shop
  const salonStaff = useMemo(() => {
    return staff.filter((s) => s.shop_id === shop.id);
  }, [staff, shop.id]);

  // Associated bills for this shop
  const salonBills = useMemo(() => {
    return bills.filter((b) => b.shop_id === shop.id);
  }, [bills, shop.id]);

  // Associated appointments for this shop
  const salonAppointments = useMemo(() => {
    return appointments.filter((a) => a.shop_id === shop.id);
  }, [appointments, shop.id]);

  // Total revenue calculated strictly from bills
  const totalRevenue = useMemo(() => {
    return salonBills.reduce((acc, b) => {
      if (b.status !== 'deleted') {
        return acc + (b.total_minor || 0);
      }
      return acc;
    }, 0);
  }, [salonBills]);

  // Fetch real services configured for this salon
  useEffect(() => {
    let isMounted = true;
    async function loadServices() {
      setServicesLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, name, price_minor, duration_minutes, is_active, category_id')
          .eq('shop_id', shop.id)
          .order('name', { ascending: true });

        if (!error && data && isMounted) {
          setServices(data);
        }
      } catch (err) {
        console.warn('Error fetching services for salon:', err);
      } finally {
        if (isMounted) setServicesLoading(false);
      }
    }

    loadServices();
    return () => {
      isMounted = false;
    };
  }, [shop.id]);

  // Friendly date formatter
  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6 font-sans text-neutral-900 pb-12">
      {/* 1. TOP NAVIGATION & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e0e5e9] pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#004e64] hover:bg-[#003d4f] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e0e5e9] bg-white hover:bg-neutral-50 text-[#004e64] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#004e64]" />
              <span>Refresh</span>
            </button>
          )}
          <span className="text-xs font-mono text-[#004e64] bg-[#e0e5e9] px-2.5 py-1 rounded border border-[#004e64]/20">
            ID: {shop.id.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* 2. SALON PROFILE HERO BANNER */}
      <div className="bg-white rounded-2xl border border-[#e0e5e9] p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#004e64] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {shop.name ? shop.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
                  {shop.name}
                </h1>
                <div className="flex items-center gap-2 text-xs text-neutral-600 mt-0.5">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#004e64]" />
                    {shop.city || 'Tamil Nadu'}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-neutral-800">
                    <Phone className="w-3.5 h-3.5 text-[#004e64]" />
                    {shop.phone || 'No phone'}
                  </span>
                  <span>•</span>
                  <span className="text-neutral-500 font-mono">
                    Joined {formatDate(shop.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {shop.address && (
              <p className="text-xs text-neutral-600 pt-1">
                <span className="font-semibold text-neutral-800">Address: </span>
                {shop.address}{shop.pin_code ? ` - ${shop.pin_code}` : ''}
              </p>
            )}
          </div>

          {/* Plan Limit / Status badge */}
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e0e5e9] border border-[#004e64]/30 text-[#004e64] text-xs font-bold font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {shop.free_sales_limit && shop.free_sales_limit > 100
                  ? 'PRO PLAN (UNLIMITED)'
                  : 'FREE PLAN (100 LIMIT)'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">
              GST: {shop.gstin ? shop.gstin : 'Not Registered'}
            </span>
          </div>
        </div>

        {/* 4 Primary KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[#e0e5e9]">
          <div className="bg-[#e0e5e9]/30 rounded-xl p-3.5 border border-[#e0e5e9]">
            <div className="text-[11px] font-bold text-[#004e64] uppercase font-mono">
              Total Revenue
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-1 font-mono">
              ₹{Math.round(totalRevenue / 100).toLocaleString()}
            </div>
          </div>

          <div className="bg-[#e0e5e9]/30 rounded-xl p-3.5 border border-[#e0e5e9]">
            <div className="text-[11px] font-bold text-[#004e64] uppercase font-mono">
              Bills Issued
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-1 font-mono">
              {salonBills.length}
            </div>
          </div>

          <div className="bg-[#e0e5e9]/30 rounded-xl p-3.5 border border-[#e0e5e9]">
            <div className="text-[11px] font-bold text-[#004e64] uppercase font-mono">
              Stylists & Staff
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-1 font-mono">
              {salonStaff.length}
            </div>
          </div>

          <div className="bg-[#e0e5e9]/30 rounded-xl p-3.5 border border-[#e0e5e9]">
            <div className="text-[11px] font-bold text-[#004e64] uppercase font-mono">
              Services Offered
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-1 font-mono">
              {services.length}
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTION TABS (Two-color scheme: #004e64 & #e0e5e9) */}
      <div className="flex items-center gap-1.5 border-b border-[#e0e5e9] pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#004e64] text-white shadow-xs'
              : 'bg-[#e0e5e9] text-[#004e64] hover:bg-[#d0d8dd]'
          }`}
        >
          Owner & Business Info
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'bg-[#004e64] text-white shadow-xs'
              : 'bg-[#e0e5e9] text-[#004e64] hover:bg-[#d0d8dd]'
          }`}
        >
          Staff & Stylists ({salonStaff.length})
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'services'
              ? 'bg-[#004e64] text-white shadow-xs'
              : 'bg-[#e0e5e9] text-[#004e64] hover:bg-[#d0d8dd]'
          }`}
        >
          Services ({services.length})
        </button>

        <button
          onClick={() => setActiveTab('bills')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'bills'
              ? 'bg-[#004e64] text-white shadow-xs'
              : 'bg-[#e0e5e9] text-[#004e64] hover:bg-[#d0d8dd]'
          }`}
        >
          Bills & Orders ({salonBills.length})
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'appointments'
              ? 'bg-[#004e64] text-white shadow-xs'
              : 'bg-[#e0e5e9] text-[#004e64] hover:bg-[#d0d8dd]'
          }`}
        >
          Appointments ({salonAppointments.length})
        </button>
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: OWNER & BUSINESS DETAILS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Owner Profile Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase font-mono tracking-wider border-b border-neutral-100 pb-2">
              Salon Owner Profile
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase block font-mono">
                  Owner Full Name
                </span>
                <span className="text-sm font-bold text-neutral-900">
                  {ownerProfile?.full_name || shop.name}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase block font-mono">
                  Owner Phone Number
                </span>
                <span className="text-sm font-mono font-bold text-neutral-900">
                  {ownerProfile?.phone || shop.phone || '—'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase block font-mono">
                  Owner Profile ID
                </span>
                <span className="text-xs font-mono text-neutral-700 bg-neutral-100 px-2 py-1 rounded inline-block">
                  {shop.owner_profile_id || ownerProfile?.id || '—'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase block font-mono">
                  Profile Registration Date
                </span>
                <span className="text-xs font-mono text-neutral-700">
                  {formatDate(ownerProfile?.created_at || shop.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Business & Tax Configuration Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase font-mono tracking-wider border-b border-neutral-100 pb-2">
              Tax & Invoicing Settings
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase block font-mono">
                  GSTIN Number
                </span>
                <span className="text-sm font-mono font-bold text-neutral-900">
                  {shop.gstin || 'None'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase block font-mono">
                  GST Rate
                </span>
                <span className="text-sm font-mono font-bold text-neutral-900">
                  {shop.gst_rate !== undefined ? `${shop.gst_rate}%` : '0%'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase block font-mono">
                  Invoice Prefix
                </span>
                <span className="text-sm font-mono font-bold text-[#004e64]">
                  {shop.invoice_prefix || 'INV'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase block font-mono">
                  Free Quota Limit
                </span>
                <span className="text-sm font-mono font-bold text-neutral-900">
                  {shop.free_sales_limit || 100} Sales
                </span>
              </div>

              <div className="col-span-2 pt-2 border-t border-neutral-100">
                <span className="text-[11px] font-bold text-neutral-500 uppercase block font-mono">
                  Brand Theme Color
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="w-4 h-4 rounded-full border border-neutral-300"
                    style={{ backgroundColor: shop.accent_color || '#000000' }}
                  />
                  <span className="font-mono text-xs font-bold text-neutral-800">
                    {shop.accent_color || '#000000'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF & STYLISTS */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50">
            <h3 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">
              Registered Staff Members ({salonStaff.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50 font-mono">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {salonStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-neutral-400">
                      No staff members configured for this salon.
                    </td>
                  </tr>
                ) : (
                  salonStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-900">
                        {s.name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-semibold text-[#0f172a]">
                          {s.role || 'Stylist'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-700">
                        {s.phone || '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            s.is_active
                              ? 'bg-neutral-100 text-neutral-900 border border-neutral-300'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-600 text-[11px]">
                        {formatDate(s.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICES CATALOG */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50">
            <h3 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">
              Services Menu ({services.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50 font-mono">
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-center">Duration</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {servicesLoading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-neutral-400">
                      Loading services catalog...
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-neutral-400">
                      No services entered for this salon.
                    </td>
                  </tr>
                ) : (
                  services.map((srv) => (
                    <tr key={srv.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-900">
                        {srv.name}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900">
                        ₹{(srv.price_minor / 100).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-neutral-700">
                        {srv.duration_minutes} mins
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            srv.is_active
                              ? 'bg-neutral-100 text-neutral-900 border border-neutral-300'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {srv.is_active ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BILLS & ORDERS */}
      {activeTab === 'bills' && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50">
            <h3 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">
              Invoices & Orders History ({salonBills.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50 font-mono">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {salonBills.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-neutral-400">
                      No bills issued yet by this salon.
                    </td>
                  </tr>
                ) : (
                  salonBills.map((b) => (
                    <tr key={b.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#004e64]">
                        {b.invoice_number}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-700 text-[11px]">
                        {formatDate(b.issued_at || b.created_at)}
                      </td>
                      <td className="py-3 px-3 text-neutral-900 font-medium">
                        {b.customer?.name || 'Walk-in Client'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900">
                        ₹{(b.total_minor / 100).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-200">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50">
            <h3 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">
              Appointments ({salonAppointments.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50 font-mono">
                  <th className="py-3 px-4">Schedule Time</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Stylist</th>
                  <th className="py-3 px-3 text-center">Duration</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {salonAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-neutral-400">
                      No appointments recorded for this salon.
                    </td>
                  </tr>
                ) : (
                  salonAppointments.map((a) => (
                    <tr key={a.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        {formatDate(a.starts_at)}
                      </td>
                      <td className="py-3 px-3 text-neutral-800 font-medium">
                        {a.customer?.name || 'Client'}
                      </td>
                      <td className="py-3 px-3 text-neutral-700">
                        {a.staff?.name || 'Any Staff'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-neutral-700">
                        {a.duration_minutes}m
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-200">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
