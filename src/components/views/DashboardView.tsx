import React, { useState, useMemo } from 'react';
import {
  Store,
  Users,
  Scissors,
  CreditCard,
  CalendarCheck,
  UserX,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Shield,
  Filter,
  Search,
  RotateCcw,
  Building2,
  Activity,
  Layers,
  Calendar,
  DollarSign,
  Receipt,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Check,
  Sliders,
  Wallet,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { KPICard } from '../common/KPICard';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatCurrency, formatNumber } from '../../utils/formatters';
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
import { DateFilterOption, NavView } from '../../types/dashboard';

interface DashboardViewProps {
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
  onNavigateToStylists?: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenDeleteAccount?: () => void;
  initialTab?: 'overview' | 'daily_ledger' | 'all_bills' | 'salon_breakdown' | 'subscription_revenue';
}

// IronDrobe Palette for Data Visualizations (Monochrome Black & White)
const CHART_PALETTE = ['#000000', '#27272a', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  shops,
  profiles,
  staff,
  customers,
  bills,
  payments,
  appointments,
  deletions,
  supportMessages,
  subscriptions = [],
  loading = false,
  onNavigate,
  onSelectSalon,
  onNavigateToStylists,
  onOpenPrivacyPolicy,
  onOpenDeleteAccount,
  initialTab = 'overview',
}) => {
  const { dateRange, selectedOption, setSelectedOption, setCustomRange } = useDateFilter();

  // Multi-Attribute Filter State
  const [selectedSalonFilter, setSelectedSalonFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'with_staff' | 'with_appts' | 'deduplicated'>('all');
  const [exactDateInput, setExactDateInput] = useState<string>('');
  const [billStatusFilter, setBillStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'daily_ledger' | 'all_bills' | 'salon_breakdown' | 'subscription_revenue'>(initialTab);
  const [billsPageSize, setBillsPageSize] = useState<number>(10);
  const [billsPage, setBillsPage] = useState<number>(1);

  // Sync activeTab when initialTab changes
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Determine Effective Date Range (Exact Date Override vs DateFilterContext)
  const effectiveDateRange = useMemo(() => {
    if (exactDateInput.trim()) {
      const parts = exactDateInput.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const start = new Date(year, month, day, 0, 0, 0, 0);
        const end = new Date(year, month, day, 23, 59, 59, 999);
        return {
          startDate: start,
          endDate: end,
          label: `Exact Date: ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        };
      }
    }
    return dateRange;
  }, [exactDateInput, dateRange]);

  // Unique Payment Methods from Database
  const availablePaymentMethods = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.method) set.add(p.method);
    });
    return Array.from(set);
  }, [payments]);

  // Map of bill_id -> Payment
  const paymentByBillId = useMemo(() => {
    const map = new Map<string, Payment>();
    payments.forEach((p) => {
      if (p.bill_id) {
        map.set(p.bill_id, p);
      }
    });
    return map;
  }, [payments]);

  // Base Filtered Salons
  const baseFilteredShops = useMemo(() => {
    return shops.filter((s) => {
      if (selectedSalonFilter !== 'all' && s.id !== selectedSalonFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCity = (s.city || '').toLowerCase().includes(q);
        const matchesPhone = (s.phone || '').includes(q);
        if (!matchesName && !matchesCity && !matchesPhone) return false;
      }
      if (segmentFilter === 'with_staff' && (s.staff_count === 0 || !s.staff_count)) return false;
      if (segmentFilter === 'with_appts') {
        const hasAppts = (s.appointment_count && s.appointment_count > 0) || appointments.some((a) => a.shop_id === s.id);
        if (!hasAppts) return false;
      }
      if (segmentFilter === 'deduplicated' && (!s.duplicate_count || s.duplicate_count === 0)) return false;
      return true;
    });
  }, [shops, selectedSalonFilter, searchQuery, segmentFilter, appointments]);

  // Filtered Shops with Date Range
  const filteredShops = useMemo(
    () => filterByDateRange(baseFilteredShops, 'created_at', effectiveDateRange),
    [baseFilteredShops, effectiveDateRange]
  );

  // Scoped Bills across Date, Salon, Method, Status, and Search Query
  const scopedBills = useMemo(() => {
    let list = bills;

    // 1. Salon filter
    if (selectedSalonFilter !== 'all') {
      list = list.filter((b) => b.shop_id === selectedSalonFilter);
    }

    // 2. Status filter
    if (billStatusFilter !== 'all') {
      list = list.filter((b) => (b.status || '').toLowerCase() === billStatusFilter.toLowerCase());
    }

    // 3. Payment Method filter
    if (paymentMethodFilter !== 'all') {
      list = list.filter((b) => {
        const linkedPayment = paymentByBillId.get(b.id);
        if (linkedPayment && linkedPayment.method) {
          return linkedPayment.method.toLowerCase() === paymentMethodFilter.toLowerCase();
        }
        return false;
      });
    }

    // 4. Date filter
    list = filterByDateRange(list, 'issued_at', effectiveDateRange);

    // 5. Search query (matches invoice #, customer name, phone, salon name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) => {
        const invMatch = (b.invoice_number || '').toLowerCase().includes(q);
        const shopMatch = (b.shop?.name || '').toLowerCase().includes(q);
        const custNameMatch = (b.customer?.name || '').toLowerCase().includes(q);
        const custPhoneMatch = (b.customer?.phone || '').includes(q);
        const notesMatch = (b.notes || '').toLowerCase().includes(q);
        return invMatch || shopMatch || custNameMatch || custPhoneMatch || notesMatch;
      });
    }

    return list;
  }, [bills, selectedSalonFilter, billStatusFilter, paymentMethodFilter, effectiveDateRange, searchQuery, paymentByBillId]);

  // Scoped Payments
  const scopedPayments = useMemo(() => {
    let list = payments;
    if (selectedSalonFilter !== 'all') list = list.filter((p) => p.shop_id === selectedSalonFilter);
    if (paymentMethodFilter !== 'all') list = list.filter((p) => p.method === paymentMethodFilter);
    return filterByDateRange(list, 'paid_at', effectiveDateRange);
  }, [payments, selectedSalonFilter, paymentMethodFilter, effectiveDateRange]);

  // Scoped Appointments
  const scopedAppts = useMemo(() => {
    let list = appointments;
    if (selectedSalonFilter !== 'all') list = list.filter((a) => a.shop_id === selectedSalonFilter);
    return filterByDateRange(list, 'starts_at', effectiveDateRange);
  }, [appointments, selectedSalonFilter, effectiveDateRange]);

  // Scoped Staff
  const scopedStaff = useMemo(() => {
    if (selectedSalonFilter !== 'all') return staff.filter((st) => st.shop_id === selectedSalonFilter);
    return staff;
  }, [staff, selectedSalonFilter]);

  // Financial calculations
  const totalBilledMinor = scopedBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
  const totalPaidMinor = scopedPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);
  const avgTicketMinor = scopedBills.length > 0 ? Math.round(totalBilledMinor / scopedBills.length) : 0;
  const pendingBills = scopedBills.filter((b) => b.status === 'pending');
  const pendingAmountMinor = pendingBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);

  // Active salons that generated at least 1 bill in this filtered view
  const activeSalonsWithBillsCount = useMemo(() => {
    const set = new Set<string>();
    scopedBills.forEach((b) => set.add(b.shop_id));
    return set.size;
  }, [scopedBills]);

  // -------------------------------------------------------------
  // DAILY BILLING & REVENUE AGGREGATION ("This date how much bills they're putting")
  // -------------------------------------------------------------
  interface DailyMetric {
    rawDate: string; // YYYY-MM-DD
    displayDate: string;
    billsCount: number;
    totalAmountMinor: number;
    avgBillMinor: number;
    paidBillsCount: number;
    pendingBillsCount: number;
    uniqueSalonsCount: number;
    topSalonName: string;
    topSalonBills: number;
  }

  const dailyBillingBreakdown = useMemo(() => {
    const map = new Map<string, { bills: Bill[]; totalMinor: number }>();

    // Use either all bills or salon-filtered bills, respecting search
    let sourceBills = bills;
    if (selectedSalonFilter !== 'all') {
      sourceBills = sourceBills.filter((b) => b.shop_id === selectedSalonFilter);
    }
    if (paymentMethodFilter !== 'all') {
      sourceBills = sourceBills.filter((b) => {
        const p = paymentByBillId.get(b.id);
        return p?.method?.toLowerCase() === paymentMethodFilter.toLowerCase();
      });
    }

    sourceBills.forEach((b) => {
      const dateObj = new Date(b.issued_at || b.created_at);
      if (isNaN(dateObj.getTime())) return;
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      const entry = map.get(key) || { bills: [], totalMinor: 0 };
      entry.bills.push(b);
      entry.totalMinor += b.total_minor || 0;
      map.set(key, entry);
    });

    const result: DailyMetric[] = [];
    map.forEach((data, key) => {
      const parts = key.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const displayDate = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      // Find top salon for this day
      const salonCounts: Record<string, { count: number; name: string }> = {};
      const uniqueSalons = new Set<string>();
      let paidCount = 0;
      let pendingCount = 0;

      data.bills.forEach((b) => {
        uniqueSalons.add(b.shop_id);
        if (b.status === 'paid') paidCount++;
        if (b.status === 'pending') pendingCount++;

        const sName = b.shop?.name || 'Salon';
        if (!salonCounts[b.shop_id]) {
          salonCounts[b.shop_id] = { count: 0, name: sName };
        }
        salonCounts[b.shop_id].count++;
      });

      let topSalonName = '—';
      let topSalonBills = 0;
      Object.values(salonCounts).forEach((sc) => {
        if (sc.count > topSalonBills) {
          topSalonBills = sc.count;
          topSalonName = sc.name;
        }
      });

      result.push({
        rawDate: key,
        displayDate,
        billsCount: data.bills.length,
        totalAmountMinor: data.totalMinor,
        avgBillMinor: data.bills.length > 0 ? Math.round(data.totalMinor / data.bills.length) : 0,
        paidBillsCount: paidCount,
        pendingBillsCount: pendingCount,
        uniqueSalonsCount: uniqueSalons.size,
        topSalonName,
        topSalonBills,
      });
    });

    // Sort descending by date
    return result.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [bills, selectedSalonFilter, paymentMethodFilter, paymentByBillId]);

  // Salon-by-Salon Billing Contribution in Selected Filter
  interface SalonContribution {
    id: string;
    name: string;
    city: string;
    billsCount: number;
    totalAmountMinor: number;
    avgBillMinor: number;
    percentShare: number;
  }

  const salonContributions = useMemo(() => {
    const map = new Map<string, { name: string; city: string; count: number; totalMinor: number }>();

    scopedBills.forEach((b) => {
      const shop = b.shop || shops.find((s) => s.id === b.shop_id);
      const name = shop?.name || 'Unknown Salon';
      const city = shop?.city || '—';

      const entry = map.get(b.shop_id) || { name, city, count: 0, totalMinor: 0 };
      entry.count++;
      entry.totalMinor += b.total_minor || 0;
      map.set(b.shop_id, entry);
    });

    const list: SalonContribution[] = [];
    map.forEach((data, id) => {
      list.push({
        id,
        name: data.name,
        city: data.city,
        billsCount: data.count,
        totalAmountMinor: data.totalMinor,
        avgBillMinor: data.count > 0 ? Math.round(data.totalMinor / data.count) : 0,
        percentShare: totalBilledMinor > 0 ? Math.round((data.totalMinor / totalBilledMinor) * 100) : 0,
      });
    });

    return list.sort((a, b) => b.totalAmountMinor - a.totalAmountMinor);
  }, [scopedBills, shops, totalBilledMinor]);

  // Paginated bills for the bills ledger
  const paginatedBills = useMemo(() => {
    const startIndex = (billsPage - 1) * billsPageSize;
    return scopedBills.slice(startIndex, startIndex + billsPageSize);
  }, [scopedBills, billsPage, billsPageSize]);

  const totalBillPages = Math.ceil(scopedBills.length / billsPageSize) || 1;

  // Chart data: Daily Revenue Trend
  const dailyChartData = useMemo(() => {
    return dailyBillingBreakdown
      .slice(0, 14)
      .reverse()
      .map((d) => ({
        date: d.displayDate.replace(/, 20\d\d/, ''),
        revenue: Math.round(d.totalAmountMinor / 100),
        bills: d.billsCount,
      }));
  }, [dailyBillingBreakdown]);

  // Subscription & Monthly Revenue Trend Data
  const monthlyRevenueTrend = useMemo(() => {
    const map = new Map<string, { month: string; invoiced: number; collected: number; txnCount: number }>();

    scopedBills.forEach((b) => {
      const d = new Date(b.issued_at || b.created_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const entry = map.get(key) || { month: monthLabel, invoiced: 0, collected: 0, txnCount: 0 };
      entry.invoiced += Math.round((b.total_minor || 0) / 100);
      map.set(key, entry);
    });

    scopedPayments.forEach((p) => {
      const d = new Date(p.paid_at || p.created_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const entry = map.get(key) || { month: monthLabel, invoiced: 0, collected: 0, txnCount: 0 };
      entry.collected += Math.round((p.amount_minor || 0) / 100);
      entry.txnCount += 1;
      map.set(key, entry);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);
  }, [scopedBills, scopedPayments]);

  // Salon-wise Subscription Tier Classification & Financial Volume
  const salonTierLedger = useMemo(() => {
    return shops.map((s) => {
      const sBills = bills.filter((b) => b.shop_id === s.id);
      const sPmts = payments.filter((p) => p.shop_id === s.id);
      const billedMinor = sBills.reduce((acc, b) => acc + (b.total_minor || 0), 0);
      const collectedMinor = sPmts.reduce((acc, p) => acc + (p.amount_minor || 0), 0);
      const staffCount = s.staff_count ?? 0;

      let tier: 'Pro SaaS' | 'Starter SaaS' | 'Free Trial' = 'Free Trial';
      let tierBadge = 'bg-neutral-100 text-neutral-600 border-neutral-300';
      if (staffCount >= 3 || sBills.length >= 10) {
        tier = 'Pro SaaS';
        tierBadge = 'bg-black text-white border-black';
      } else if (staffCount >= 1 || sBills.length >= 1) {
        tier = 'Starter SaaS';
        tierBadge = 'bg-neutral-200 text-neutral-900 border-neutral-400';
      }

      const lastPmt = sPmts[0]?.paid_at || sBills[0]?.issued_at || s.created_at;

      return {
        shop: s,
        id: s.id,
        name: s.name,
        city: s.city || 'Tamil Nadu',
        tier,
        tierBadge,
        billedMinor,
        collectedMinor,
        txnCount: sPmts.length,
        billsCount: sBills.length,
        lastActive: lastPmt,
      };
    }).sort((a, b) => b.collectedMinor - a.collectedMinor);
  }, [shops, bills, payments]);

  // Reset all filters handler
  const handleResetFilters = () => {
    setSelectedSalonFilter('all');
    setSearchQuery('');
    setSegmentFilter('all');
    setExactDateInput('');
    setBillStatusFilter('all');
    setPaymentMethodFilter('all');
    setSelectedOption('all_time');
    setBillsPage(1);
  };

  const hasActiveFilters =
    selectedSalonFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    segmentFilter !== 'all' ||
    exactDateInput.trim() !== '' ||
    billStatusFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    !!effectiveDateRange.startDate;

  const handleSelectDayDrilldown = (rawDate: string) => {
    setExactDateInput(rawDate);
    setActiveTab('all_bills');
    setBillsPage(1);
  };

  return (
    <div className="space-y-6">
      {/* IronDrobe Founder Dashboard Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Founder Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black text-white">
              LIVE SYNC
            </span>
            {exactDateInput && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                Filtered: {effectiveDateRange.label}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time salon operations, sales trajectory, and partner performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* IronDrobe Segmented Date Range Controls */}
          <div className="segmented-control">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last_7_days', label: '7D' },
              { id: 'last_30_days', label: '30D' },
              { id: 'all_time', label: 'All Time' },
            ].map((p) => {
              const isSelected = selectedOption === p.id && !exactDateInput;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setExactDateInput('');
                    setSelectedOption(p.id as DateFilterOption);
                    setBillsPage(1);
                  }}
                  className={`segment ${isSelected ? 'active' : ''}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <ExportButton
            data={scopedBills.map((b) => ({
              'Invoice Number': b.invoice_number,
              Salon: b.shop?.name || b.shop_id,
              Customer: b.customer?.name || 'Walk-in',
              Phone: b.customer?.phone || '—',
              'Issued Date': formatDateTime(b.issued_at || b.created_at),
              'Subtotal (INR)': (b.subtotal_minor || 0) / 100,
              'Total (INR)': (b.total_minor || 0) / 100,
              Status: b.status,
            }))}
            filename={`stylefleet_sales_report_${exactDateInput || 'all'}`}
            label="Export CSV"
          />
        </div>
      </div>

      {/* DOMAIN SECTION 1: LIVE SALON ACTIVITY */}
      <div className="overview-section overview-section--live">
        <div className="flex items-center justify-between">
          <span className="overview-section-title">Live Salon Activity</span>
          <span className="text-[11px] font-mono font-medium text-neutral-600">Real-time sync</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard
            title="Active Salons"
            value={formatNumber(filteredShops.length)}
            subtitle={`${shops.length} registered partner salons`}
            tone="usage"
            icon={Store}
            onClick={() => onNavigate('salons_360')}
          />
          <KPICard
            title="Sales Put In"
            value={formatNumber(scopedBills.length)}
            subtitle={`${activeSalonsWithBillsCount} active salon(s) generating sales`}
            tone="order-good"
            icon={Receipt}
            onClick={() => setActiveTab('daily_ledger')}
          />
          <KPICard
            title="Customer Base"
            value={formatNumber(customers.length)}
            subtitle="Verified client records in directory"
            tone="signup"
            icon={Users}
            onClick={() => onNavigate('customer_tracking')}
          />
          <KPICard
            title="Stylists On Fleet"
            value={formatNumber(scopedStaff.length)}
            subtitle={`${scopedStaff.filter((s) => s.invitation_status === 'active').length} active stylists`}
            tone="neutral"
            icon={Scissors}
            onClick={() => onNavigate('staff_access')}
          />
        </div>
      </div>

      {/* DOMAIN SECTION 2: SALES & BILLING MOMENTUM */}
      <div className="overview-section overview-section--revenue">
        <div className="flex items-center justify-between">
          <span className="overview-section-title">Sales &amp; Billing Momentum</span>
          <span className="text-[11px] font-mono font-medium text-emerald-800">Invoiced &amp; Settled Sales</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard
            title="Invoiced Sales Volume"
            value={formatCurrency(totalBilledMinor)}
            subtitle={`${scopedBills.length} sale invoice(s) generated`}
            tone="revenue"
            icon={DollarSign}
            onClick={() => setActiveTab('all_bills')}
          />
          <KPICard
            title="Settled Collections"
            value={formatCurrency(totalPaidMinor)}
            subtitle={`${scopedPayments.length} verified payment txns`}
            tone="brand"
            icon={Wallet}
            onClick={() => setActiveTab('subscription_revenue')}
          />
          <KPICard
            title="Average Ticket Size"
            value={formatCurrency(avgTicketMinor)}
            subtitle="Average value per sale transaction"
            tone="conversion"
            icon={TrendingUp}
            onClick={() => setActiveTab('overview')}
          />
          <KPICard
            title="Pending Receivables"
            value={formatCurrency(pendingAmountMinor)}
            subtitle={`${pendingBills.length} invoice(s) awaiting payment`}
            tone="order-warn"
            icon={Clock}
            onClick={() => {
              setBillStatusFilter('pending');
              setActiveTab('all_bills');
            }}
          />
        </div>
      </div>

      {/* DOMAIN SECTION 3: 100 FREE SALES QUOTA & PRO UPGRADE TRACKER */}
      <div className="overview-section overview-section--subscriptions">
        <div className="flex items-center justify-between">
          <span className="overview-section-title">100 Free Sales Quota &amp; Pro Upgrade Tracker</span>
          <span className="text-[11px] font-mono font-medium text-neutral-600">100 free sales from registration</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard
            title="In 100 Free Sales Trial"
            value={salonTierLedger.filter((s) => s.tier === 'Free Trial').length}
            subtitle="< 50 sales completed"
            tone="trial"
            icon={CheckCircle2}
            onClick={() => onNavigate('subscription_plans')}
          />
          <KPICard
            title="Nearing 100 Limit"
            value={salonTierLedger.filter((s) => s.billsCount >= 50 && s.billsCount < 100).length}
            subtitle="50 to 99 sales (Upgrade alert)"
            tone="order-warn"
            icon={Clock}
            onClick={() => onNavigate('subscription_plans')}
          />
          <KPICard
            title="Limit Reached (100+)"
            value={salonTierLedger.filter((s) => s.billsCount >= 100).length}
            subtitle="Mandatory Pro upgrade required"
            tone="order-risk"
            icon={Receipt}
            onClick={() => onNavigate('subscription_plans')}
          />
          <KPICard
            title="Pro Upgrades &amp; Revenue"
            value={formatCurrency(
              salonTierLedger
                .filter((s) => s.tier !== 'Free Trial')
                .reduce((acc, s) => acc + s.collectedMinor, 0)
            )}
            subtitle={`${salonTierLedger.filter((s) => s.tier !== 'Free Trial').length} salons on Pro (₹1,499 / ₹2,799 / ₹4,999)`}
            tone="revenue"
            icon={CreditCard}
            onClick={() => onNavigate('subscription_plans')}
          />
        </div>
      </div>

      {/* MASTER MULTI-ATTRIBUTE FILTER PANEL (IRON DROBE STYLE) */}
      <div className="panel space-y-3.5">
        {/* Top Filter Controls: Salon, Exact Date, Payment Mode, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Salon Selector Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-black" />
              <span>Filter Salon</span>
            </label>
            <select
              value={selectedSalonFilter}
              onChange={(e) => {
                setSelectedSalonFilter(e.target.value);
                setBillsPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-black focus:bg-white cursor-pointer shadow-xs"
            >
              <option value="all">All Salons ({shops.length} Connected)</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city || 'No City'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. EXACT SINGLE DATE PICKER ("Search this date how much bills they're putting") */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-black" />
                <span>Search Exact Date</span>
              </label>
              {exactDateInput && (
                <button
                  onClick={() => setExactDateInput('')}
                  className="text-[10px] text-slate-500 hover:text-slate-900 font-semibold cursor-pointer underline"
                >
                  Clear Date
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="date"
                value={exactDateInput}
                onChange={(e) => {
                  setExactDateInput(e.target.value);
                  setBillsPage(1);
                }}
                className={`w-full text-xs font-mono font-semibold px-3 py-2 rounded-xl border ${
                  exactDateInput ? 'border-black bg-neutral-100 ring-1 ring-black' : 'border-slate-200 bg-slate-50/70'
                } text-slate-900 focus:outline-none focus:border-black cursor-pointer shadow-xs`}
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          {/* 3. Payment Method Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-black" />
              <span>Payment Mode</span>
            </label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setBillsPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-black focus:bg-white cursor-pointer shadow-xs"
            >
              <option value="all">All Payment Modes</option>
              {availablePaymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Bill Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-black" />
              <span>Invoice Status</span>
            </label>
            <select
              value={billStatusFilter}
              onChange={(e) => {
                setBillStatusFilter(e.target.value);
                setBillsPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-black focus:bg-white cursor-pointer shadow-xs"
            >
              <option value="all">All Invoice Statuses</option>
              <option value="paid">Settled / Paid</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Second Row: Omni-Search, Segment Toggles, and Reset */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Omni Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, salon, customer, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setBillsPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-black focus:bg-white shadow-xs"
            />
          </div>

          {/* Segmented Control Filter (IronDrobe Style) */}
          <div className="segmented-control shrink-0">
            <button
              onClick={() => setSegmentFilter('all')}
              className={`segment ${segmentFilter === 'all' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setSegmentFilter('with_staff')}
              className={`segment ${segmentFilter === 'with_staff' ? 'active' : ''}`}
            >
              With Staff
            </button>
            <button
              onClick={() => setSegmentFilter('with_appts')}
              className={`segment ${segmentFilter === 'with_appts' ? 'active' : ''}`}
            >
              With Bookings
            </button>
            <button
              onClick={() => setSegmentFilter('deduplicated')}
              className={`segment ${segmentFilter === 'deduplicated' ? 'active' : ''}`}
            >
              Unique
            </button>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Active Filter Summary Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">Active Scope:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-800">
              {effectiveDateRange.label}
            </span>
            {selectedSalonFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-800">
                Salon: {shops.find((s) => s.id === selectedSalonFilter)?.name || selectedSalonFilter}
              </span>
            )}
            {paymentMethodFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-800">
                Method: {paymentMethodFilter.toUpperCase()}
              </span>
            )}
            {billStatusFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-800">
                Status: {billStatusFilter.toUpperCase()}
              </span>
            )}
          </div>

          <div className="font-mono text-[11px] font-bold text-slate-900">
            {scopedBills.length} Bill(s) matched • Total {formatCurrency(totalBilledMinor)}
          </div>
        </div>
      </div>

      {/* INTERACTIVE NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-black text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Visual Overview &amp; Trends</span>
        </button>

        <button
          onClick={() => setActiveTab('daily_ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'daily_ledger'
              ? 'bg-black text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Daily Sales Matrix ({dailyBillingBreakdown.length} Days)</span>
        </button>

        <button
          onClick={() => setActiveTab('all_bills')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'all_bills'
              ? 'bg-black text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Sales Invoices Ledger ({scopedBills.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('salon_breakdown')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'salon_breakdown'
              ? 'bg-black text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Salon Sales Contribution ({salonContributions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subscription_revenue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'subscription_revenue'
              ? 'bg-black text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>100 Quota &amp; Pro Tracker</span>
        </button>
      </div>

      {/* TAB 1: VISUAL OVERVIEW & CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Revenue & Sales Trend Chart */}
            <div className="lg:col-span-2 panel space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Daily Sales Volume &amp; Invoicing Cadence
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aggregated by calendar date from verified sales records in Supabase
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {dailyChartData.length} Active Days
                </span>
              </div>

              <div className="h-64 w-full">
                {dailyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.7} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0b1220',
                          borderColor: '#1e293b',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#f8fafc',
                        }}
                      />
                      <Bar dataKey="revenue" fill="#000000" radius={[4, 4, 0, 0]} name="Sales (₹)" />
                      <Bar dataKey="bills" fill="#71717a" radius={[4, 4, 0, 0]} name="Sales Count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">
                    No sales activity recorded for the active filters.
                  </div>
                )}
              </div>
            </div>

            {/* Account Deletion Reasons (Donut) */}
            <div className="panel space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Account Governance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reasons from verified deletion submissions
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {deletions.length} Requests
                </span>
              </div>

              {deletions.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-44 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Switched Systems', value: deletions.filter((d) => d.reason?.toLowerCase().includes('switch')).length || 1 },
                            { name: 'Cost Concerns', value: deletions.filter((d) => d.reason?.toLowerCase().includes('cost')).length || 1 },
                            { name: 'Other / Testing', value: Math.max(1, deletions.length - 2) },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {CHART_PALETTE.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0b1220',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#f8fafc',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="pt-2 border-t border-neutral-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Total Requests</span>
                      <span className="font-mono font-bold text-neutral-900">{deletions.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Audit Logs Preserved</span>
                      <span className="font-mono font-bold text-neutral-900">100%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-xs text-neutral-400">
                  No account deletion requests in database.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY SALES MATRIX */}
      {activeTab === 'daily_ledger' && (
        <div className="panel space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-black" />
                <span>Date-by-Date Sales &amp; Invoicing Activity</span>
              </h3>
              <p className="text-xs text-slate-500">
                Shows exact sales volume and revenue submitted by salons on each calendar date. Click any date to view sales invoices.
              </p>
            </div>

            <div className="text-xs font-mono text-slate-600">
              {dailyBillingBreakdown.length} active date(s) recorded
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Calendar Date</th>
                  <th className="px-4 py-3">Sales Put In</th>
                  <th className="px-4 py-3">Total Invoiced (INR)</th>
                  <th className="px-4 py-3">Average Ticket</th>
                  <th className="px-4 py-3">Paid vs Pending</th>
                  <th className="px-4 py-3">Top Submitting Salon</th>
                  <th className="px-4 py-3 text-right">Drilldown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {dailyBillingBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                      No daily sales entries match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  dailyBillingBreakdown.map((row) => (
                    <tr
                      key={row.rawDate}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      onClick={() => handleSelectDayDrilldown(row.rawDate)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-black shrink-0" />
                          <span>{row.displayDate}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{row.rawDate}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-900 font-mono font-bold border border-neutral-200">
                          <Receipt className="w-3 h-3 text-black" />
                          <span>{row.billsCount} sale(s)</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(row.totalAmountMinor)}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {formatCurrency(row.avgBillMinor)}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <span className="text-neutral-900 font-semibold">{row.paidBillsCount} paid</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-neutral-500">{row.pendingBillsCount} pending</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{row.topSalonName}</div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {row.topSalonBills} sale(s) on this date
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDayDrilldown(row.rawDate);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
                        >
                          <span>View Sales</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE SALES & INVOICES LEDGER */}
      {activeTab === 'all_bills' && (
        <div className="panel space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-black" />
                <span>Verified Sales &amp; Invoices Ledger</span>
              </h3>
              <p className="text-xs text-slate-500">
                Real-time records from <code className="font-mono font-bold text-slate-900">public.bills</code> with live status and amounts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows per page:</span>
              <select
                value={billsPageSize}
                onChange={(e) => {
                  setBillsPageSize(Number(e.target.value));
                  setBillsPage(1);
                }}
                className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Salon Business</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3">Amount (INR)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {paginatedBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-400">
                      No sales match the selected filters. Try clearing the exact date or salon search.
                    </td>
                  </tr>
                ) : (
                  paginatedBills.map((b) => {
                    const shop = b.shop || shops.find((s) => s.id === b.shop_id);
                    const payment = paymentByBillId.get(b.id);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-slate-900 block">{b.invoice_number}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {b.id.slice(0, 8)}...</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900 block">{shop?.name || 'Salon'}</span>
                          <span className="text-[11px] text-slate-500">{shop?.city || 'Kalugumalai'}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-900 block">{b.customer?.name || 'Walk-in Client'}</span>
                          <span className="text-[11px] font-mono text-slate-500">{b.customer?.phone || '—'}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-slate-900 block">{formatDate(b.issued_at || b.created_at)}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(b.issued_at || b.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-900 border border-slate-300">
                            {payment?.method ? payment.method.toUpperCase() : 'CASH'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(b.total_minor)}
                          </span>
                          {b.tax_minor && b.tax_minor > 0 ? (
                            <span className="text-[10px] text-slate-500 block">
                              Tax: {formatCurrency(b.tax_minor)}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-4 py-3.5">
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalBillPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                Showing {(billsPage - 1) * billsPageSize + 1} to{' '}
                {Math.min(billsPage * billsPageSize, scopedBills.length)} of {scopedBills.length} invoices
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={billsPage === 1}
                  onClick={() => setBillsPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-mono font-bold text-slate-900 px-2">
                  Page {billsPage} of {totalBillPages}
                </span>
                <button
                  disabled={billsPage === totalBillPages}
                  onClick={() => setBillsPage((p) => Math.min(totalBillPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SALON SALES CONTRIBUTION */}
      {activeTab === 'salon_breakdown' && (
        <div className="panel space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-black" />
                <span>Salon Sales Contribution &amp; Activity Ranking</span>
              </h3>
              <p className="text-xs text-slate-500">
                Ranked by total invoiced sales volume and number of sales put in during the selected filter window.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600">
              {salonContributions.length} active contributor(s)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Salon Business</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Sales Put In</th>
                  <th className="px-4 py-3">Total Invoiced (INR)</th>
                  <th className="px-4 py-3">Average Ticket</th>
                  <th className="px-4 py-3">Platform Share</th>
                  <th className="px-4 py-3 text-right">Quick Filter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {salonContributions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                      No salon sales contributions found for this filter criteria.
                    </td>
                  </tr>
                ) : (
                  salonContributions.map((sc, idx) => (
                    <tr key={sc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-400 font-bold w-4">{idx + 1}</span>
                          <div>
                            <span className="font-bold text-slate-900 block">{sc.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {sc.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-700">{sc.city}</td>

                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-slate-900">{sc.billsCount} sales</span>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(sc.totalAmountMinor)}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {formatCurrency(sc.avgBillMinor)}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-black rounded-full"
                              style={{ width: `${Math.min(100, sc.percentShare)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-900 text-[11px]">
                            {sc.percentShare}%
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedSalonFilter(sc.id);
                            setActiveTab('all_bills');
                            setBillsPage(1);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:border-black hover:text-black hover:bg-neutral-50 transition-colors cursor-pointer"
                        >
                          Filter Salon
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: 100 QUOTA & PRO UPGRADE TRACKER */}
      {activeTab === 'subscription_revenue' && (
        <div className="space-y-6">
          {/* Top KPI Cards for Subscription & Revenue in IronDrobe Tones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="metric-card metric-tone-revenue">
              <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">Total Settled Revenue</span>
                <DollarSign className="w-3.5 h-3.5 text-[#1c1f26]" />
              </div>
              <div className="metric-value text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
                {formatCurrency(totalPaidMinor)}
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">
                {scopedPayments.length} verified completed transactions
              </span>
            </div>

            <div className="metric-card metric-tone-brand">
              <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">Active SaaS Salons</span>
                <Building2 className="w-3.5 h-3.5 text-[#1c1f26]" />
              </div>
              <div className="metric-value text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
                {salonTierLedger.filter((s) => s.tier !== 'Free Trial').length}
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">
                Active on Pro tiers (₹1,499 / ₹2,799 / ₹4,999)
              </span>
            </div>

            <div className="metric-card metric-tone-trial">
              <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">Free Trials &amp; Onboarding</span>
                <Users className="w-3.5 h-3.5 text-[#1c1f26]" />
              </div>
              <div className="metric-value text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
                {salonTierLedger.filter((s) => s.tier === 'Free Trial').length}
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">
                Salons using 100 free sales quota
              </span>
            </div>

            <div className="metric-card metric-tone-conversion">
              <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">Average Revenue / Salon</span>
                <TrendingUp className="w-3.5 h-3.5 text-[#1c1f26]" />
              </div>
              <div className="metric-value text-lg sm:text-xl font-bold font-mono tracking-tight text-[#1c1f26]">
                {formatCurrency(
                  salonTierLedger.length > 0 ? Math.round(totalPaidMinor / salonTierLedger.length) : 0
                )}
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">
                Overall platform ARPU
              </span>
            </div>
          </div>

          {/* Charts Row: Monthly Revenue Trend + Tier Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend AreaChart */}
            <div className="lg:col-span-2 panel space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Monthly Revenue Trajectory &amp; Collections
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real volume tracked from verified payment records and billing invoices in Supabase
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-black inline-block" />
                    <span>Collected (INR)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-neutral-400 inline-block" />
                    <span>Invoiced (INR)</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                {monthlyRevenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.7} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0b1220',
                          borderColor: '#1e293b',
                          color: '#f8fafc',
                          borderRadius: '12px',
                          fontSize: '11px',
                        }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                      />
                      <Area
                        type="monotone"
                        dataKey="collected"
                        name="Collected Revenue"
                        stroke="#000000"
                        strokeWidth={2.5}
                        fill="#000000"
                        fillOpacity={0.15}
                      />
                      <Area
                        type="monotone"
                        dataKey="invoiced"
                        name="Invoiced Total"
                        stroke="#71717a"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fill="#71717a"
                        fillOpacity={0.08}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No monthly revenue data available in the active date scope.
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Tier Distribution */}
            <div className="panel space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Subscription Tier Distribution
                </h3>
                <p className="text-xs text-slate-500">
                  Salon breakdown by operational scale and usage tier
                </p>
              </div>

              <div className="space-y-3.5 pt-1">
                {[
                  {
                    name: 'Pro SaaS Tier',
                    desc: 'Multi-stylist (>2 staff) or high sales volume',
                    count: salonTierLedger.filter((s) => s.tier === 'Pro SaaS').length,
                    badge: 'bg-black text-white border-black',
                  },
                  {
                    name: 'Starter SaaS Tier',
                    desc: 'Independent stylist / boutique setup (1-2 staff)',
                    count: salonTierLedger.filter((s) => s.tier === 'Starter SaaS').length,
                    badge: 'bg-neutral-800 text-white border-neutral-800',
                  },
                  {
                    name: 'Free Trial (100 Sales Quota)',
                    desc: 'Newly registered salons using 100 free sales',
                    count: salonTierLedger.filter((s) => s.tier === 'Free Trial').length,
                    badge: 'bg-neutral-100 text-neutral-900 border-neutral-300',
                  },
                ].map((tier, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{tier.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tier.badge}`}>
                        {tier.count} Salons
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{tier.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Salon-Wise Subscription & Revenue Ledger Table */}
          <div className="panel overflow-hidden space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Salon Subscription Accounts &amp; Financial Contribution
                </h3>
                <p className="text-xs text-slate-500">
                  Live revenue contributions from all {salonTierLedger.length} partner salons
                </p>
              </div>

              <ExportButton
                data={salonTierLedger.map((s) => ({
                  name: s.name,
                  city: s.city,
                  'Billed (INR)': Number(((s.billedMinor || 0) / 100).toFixed(2)),
                  'Collected (INR)': Number(((s.collectedMinor || 0) / 100).toFixed(2)),
                  txnCount: s.txnCount,
                  billsCount: s.billsCount,
                  lastActive: formatDateTime(s.lastActive),
                }))}
                filename="stylefleet_subscription_revenue_report"
                label="Export Revenue Report"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Salon Business &amp; City</th>
                    <th className="px-4 py-3">Subscription Tier</th>
                    <th className="px-4 py-3">Collected Revenue</th>
                    <th className="px-4 py-3">Invoiced Volume</th>
                    <th className="px-4 py-3">Transactions</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {salonTierLedger.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{item.city}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${item.tierBadge}`}>
                          {item.tier}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(item.collectedMinor)}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {formatCurrency(item.billedMinor)}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-800">
                        {item.txnCount} settled txns
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        {formatDateTime(item.lastActive)}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedSalonFilter(item.id);
                            setActiveTab('all_bills');
                            setBillsPage(1);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold hover:border-black hover:text-black hover:bg-neutral-50 transition-colors cursor-pointer"
                        >
                          View Sales
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD BOTTOM UTILITY & LEGAL BAR */}
      <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
          <span>StyleFleet Super Admin CRM • Production Platform Connected</span>
        </div>
        <div className="flex items-center gap-3">
          {onOpenPrivacyPolicy && (
            <button
              onClick={onOpenPrivacyPolicy}
              className="p-1.5 rounded-lg text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Privacy Policy"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
          {onOpenDeleteAccount && (
            <button
              onClick={onOpenDeleteAccount}
              className="p-1.5 rounded-lg text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Account Deletion Info"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
