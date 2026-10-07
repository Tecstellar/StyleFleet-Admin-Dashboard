import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  Smartphone,
  Calendar,
  Receipt,
  Users,
  Scissors,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { KPICard } from '../common/KPICard';
import { ExportButton } from '../common/ExportButton';
import { StatusBadge } from '../common/StatusBadge';
import { useDateFilter } from '../../context/DateFilterContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Shop, Bill, Appointment, Staff, Customer, TelemetryRecord } from '../../types/database';
import { DateFilterOption, NavView } from '../../types/dashboard';

interface ProductAnalyticsViewProps {
  shops: Shop[];
  bills: Bill[];
  appointments: Appointment[];
  staff: Staff[];
  customers: Customer[];
  telemetryRecords?: TelemetryRecord[];
  loading?: boolean;
  onNavigate?: (view: NavView) => void;
}

export const ProductAnalyticsView: React.FC<ProductAnalyticsViewProps> = ({
  shops,
  bills,
  appointments,
  staff,
  customers,
  telemetryRecords = [],
  loading = false,
  onNavigate,
}) => {
  const { selectedOption, setSelectedOption } = useDateFilter();
  const [selectedCity, setSelectedCity] = useState<string>('all');

  const filterPresets: { label: string; value: DateFilterOption }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: '7D', value: 'last_7_days' },
    { label: '30D', value: 'last_30_days' },
    { label: 'All Time', value: 'all_time' },
  ];

  // Feature adoption computations
  const totalSalons = shops.length;
  const salonsWithBills = useMemo(() => {
    const ids = new Set(bills.map((b) => b.shop_id));
    return ids.size;
  }, [bills]);

  const salonsWithAppointments = useMemo(() => {
    const ids = new Set(appointments.map((a) => a.shop_id));
    return ids.size;
  }, [appointments]);

  const salonsWithStaff = useMemo(() => {
    const ids = new Set(staff.map((s) => s.shop_id));
    return ids.size;
  }, [staff]);

  const featureUsageData = useMemo(() => {
    return [
      {
        feature: 'Sales Billing',
        adoption: totalSalons > 0 ? Math.round((salonsWithBills / totalSalons) * 100) : 0,
        volume: bills.length,
        category: 'Core Commerce',
      },
      {
        feature: 'Appointments',
        adoption: totalSalons > 0 ? Math.round((salonsWithAppointments / totalSalons) * 100) : 0,
        volume: appointments.length,
        category: 'Operations',
      },
      {
        feature: 'Stylist Roster',
        adoption: totalSalons > 0 ? Math.round((salonsWithStaff / totalSalons) * 100) : 0,
        volume: staff.length,
        category: 'Staff Management',
      },
      {
        feature: 'Client CRM',
        adoption: 100,
        volume: customers.length,
        category: 'Retention',
      },
    ];
  }, [totalSalons, salonsWithBills, salonsWithAppointments, salonsWithStaff, bills.length, appointments.length, staff.length, customers.length]);

  // Hourly usage distribution
  const hourlyData = useMemo(() => {
    const counts = Array(24).fill(0);
    bills.forEach((b) => {
      const h = new Date(b.created_at).getHours();
      counts[h] += 1;
    });
    return counts.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      bills: count,
    }));
  }, [bills]);

  return (
    <div className="space-y-6">
      {/* IronDrobe Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.08em] text-neutral-500 uppercase font-mono">
              PRODUCT INTELLIGENCE
            </span>
            <span className="text-neutral-300">•</span>
            <span className="text-[11px] text-neutral-500 font-medium">Feature Adoption & Usage</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">
            Product Analytics
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Filter */}
          <div className="inline-flex p-1 bg-neutral-100 rounded-lg border border-neutral-200">
            {filterPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setSelectedOption(preset.value)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  selectedOption === preset.value
                    ? 'bg-black text-white shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <ExportButton data={featureUsageData} filename="stylefleet-product-analytics.csv" />
        </div>
      </div>

      {/* Domain Overview: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Core Billing Adoption"
          value={`${totalSalons > 0 ? Math.round((salonsWithBills / totalSalons) * 100) : 0}%`}
          subtitle={`${salonsWithBills} of ${totalSalons} active salons`}
          icon={Receipt}
          tone="usage"
        />
        <KPICard
          title="Appointment Utilization"
          value={`${totalSalons > 0 ? Math.round((salonsWithAppointments / totalSalons) * 100) : 0}%`}
          subtitle={`${appointments.length} total appointments`}
          icon={Calendar}
          tone="brand"
        />
        <KPICard
          title="Staff Delegation"
          value={`${totalSalons > 0 ? Math.round((salonsWithStaff / totalSalons) * 100) : 0}%`}
          subtitle={`${staff.length} stylists onboarded`}
          icon={Scissors}
          tone="trial"
        />
        <KPICard
          title="CRM Client Base"
          value={formatNumber(customers.length)}
          subtitle="Customers registered"
          icon={Users}
          tone="revenue"
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Adoption Bar Chart */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Feature Adoption Rate</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Percentage of registered salons using each core module</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">
              Live Data
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureUsageData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis dataKey="feature" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={110} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Adoption']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="adoption" fill="#000000" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoicing Peak Hours */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Platform Peak Activity Hours</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Sales invoice volume distributed across time of day (24H)</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">
              {bills.length} Invoices
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [val, 'Sales']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="bills" fill="#18181b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feature Breakdown Table */}
      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">Core Modules & Footprint</h3>
          <span className="text-xs text-neutral-500 font-medium">Supabase Real-Time</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50/75 text-neutral-500 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-100">
              <tr>
                <th className="px-4 py-3">Feature Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Active Footprint</th>
                <th className="px-4 py-3">Total Activity Volume</th>
                <th className="px-4 py-3 text-right">Adoption Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {featureUsageData.map((f, i) => (
                <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-neutral-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-black" />
                    {f.feature}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{f.category}</td>
                  <td className="px-4 py-3 font-mono font-bold text-neutral-900">
                    {f.adoption}% of Salons
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-700">
                    {formatNumber(f.volume)} records
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StatusBadge
                      status={f.adoption > 70 ? 'active' : f.adoption > 30 ? 'pending' : 'expired'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
