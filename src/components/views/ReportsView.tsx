import React, { useState, useMemo } from 'react';
import { FileBarChart, Store, Users, UserX, Calendar, CreditCard, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ExportButton } from '../common/ExportButton';
import { UnavailableBanner } from '../common/UnavailableBanner';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Shop, Profile, Bill, Appointment, AccountDeletion } from '../../types/database';

interface ReportsViewProps {
  shops: Shop[];
  profiles: Profile[];
  bills: Bill[];
  appointments: Appointment[];
  deletions: AccountDeletion[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  shops,
  profiles,
  bills,
  appointments,
  deletions,
}) => {
  const { dateRange } = useDateFilter();
  const [reportType, setReportType] = useState<'salons' | 'financial' | 'appointments' | 'deletions' | 'unavailable'>('salons');

  const filteredShops = useMemo(() => filterByDateRange(shops, 'created_at', dateRange), [shops, dateRange]);
  const filteredBills = useMemo(() => filterByDateRange(bills, 'issued_at', dateRange), [bills, dateRange]);
  const filteredAppts = useMemo(() => filterByDateRange(appointments, 'starts_at', dateRange), [appointments, dateRange]);
  const filteredDeletions = useMemo(() => filterByDateRange(deletions, 'created_at', dateRange), [deletions, dateRange]);

  // Aggregate monthly/daily salons report
  const salonReportRows = useMemo(() => {
    return filteredShops.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone || '—',
      city: s.city || '—',
      address: s.address || '—',
      created_at: formatDateTime(s.created_at),
    }));
  }, [filteredShops]);

  // Aggregate billing report
  const billingReportRows = useMemo(() => {
    return filteredBills.map((b) => ({
      invoice_number: b.invoice_number,
      salon: b.shop?.name || b.shop_id,
      amount: formatCurrency(b.total_minor),
      status: b.status,
      issued_at: formatDateTime(b.issued_at),
    }));
  }, [filteredBills]);

  // Aggregate deletions report
  const deletionReportRows = useMemo(() => {
    return filteredDeletions.map((d) => ({
      id: d.id,
      salon: d.shop_name || '—',
      phone: d.phone || '—',
      reason: d.reason || 'Unspecified',
      status: d.status,
      deleted_at: formatDateTime(d.deleted_at),
    }));
  }, [filteredDeletions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-[#D9A441]" />
            <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
              Audit &amp; Intelligence Reports
            </h1>
          </div>
          <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
            Strictly compiled from real Supabase records within the active date filter ({dateRange.label}).
          </p>
        </div>

        {/* Export Button for current report */}
        {reportType === 'salons' && (
          <ExportButton
            data={salonReportRows}
            filename="stylefleet_salons_report"
            label="Export Salons Report"
          />
        )}
        {reportType === 'financial' && (
          <ExportButton
            data={billingReportRows}
            filename="stylefleet_financial_report"
            label="Export Financial Report"
          />
        )}
        {reportType === 'deletions' && (
          <ExportButton
            data={deletionReportRows}
            filename="stylefleet_deletions_report"
            label="Export Deletions Report"
          />
        )}
      </div>

      {/* Report Categories Navigation */}
      <div className="flex items-center gap-2 border-b border-[#2D3154] light:border-slate-200 pb-3 overflow-x-auto text-xs">
        {[
          { id: 'salons', label: `Salon Registrations (${filteredShops.length})`, icon: Store },
          { id: 'financial', label: `Billing & Revenue (${filteredBills.length})`, icon: CreditCard },
          { id: 'appointments', label: `Appointments Volume (${filteredAppts.length})`, icon: Calendar },
          { id: 'deletions', label: `Account Deletions (${filteredDeletions.length})`, icon: UserX },
          { id: 'unavailable', label: 'App / Telemetry / Trials Reports', icon: FileBarChart },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors shrink-0 ${
                isActive
                  ? 'bg-[#D9A441] text-[#161826] font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1E2136] light:hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* REPORT CONTENT */}
      {reportType === 'salons' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white overflow-hidden text-xs">
            <div className="p-4 border-b border-[#2D3154] flex justify-between items-center">
              <h3 className="font-semibold text-white light:text-slate-900">
                Salon Registration Log
              </h3>
              <span className="font-mono text-neutral-400">{filteredShops.length} records in range</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#161826]/70 light:bg-slate-50 border-b border-[#2D3154] text-neutral-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Salon</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D3154]/40">
                  {filteredShops.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-400">
                        No salon registrations in this date window.
                      </td>
                    </tr>
                  ) : (
                    filteredShops.map((s) => (
                      <tr key={s.id} className="hover:bg-[#20243b]/40">
                        <td className="px-4 py-3 font-semibold text-white light:text-slate-900">{s.name}</td>
                        <td className="px-4 py-3 font-mono text-neutral-300">{s.phone || '—'}</td>
                        <td className="px-4 py-3 text-neutral-300">{s.city || '—'}</td>
                        <td className="px-4 py-3 text-neutral-400 truncate max-w-xs">{s.address || '—'}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDateTime(s.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportType === 'financial' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white overflow-hidden text-xs">
            <div className="p-4 border-b border-[#2D3154] flex justify-between items-center">
              <h3 className="font-semibold text-white light:text-slate-900">
                Salon Invoice Activity Report
              </h3>
              <span className="font-mono text-neutral-400">{filteredBills.length} invoices in range</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#161826]/70 light:bg-slate-50 border-b border-[#2D3154] text-neutral-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Invoice Number</th>
                    <th className="px-4 py-3">Salon</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D3154]/40">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-400">
                        No billing records in this date window.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => (
                      <tr key={b.id} className="hover:bg-[#20243b]/40">
                        <td className="px-4 py-3 font-mono font-semibold text-[#D9A441]">{b.invoice_number}</td>
                        <td className="px-4 py-3 text-white light:text-slate-900">{b.shop?.name || b.shop_id}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-white light:text-slate-900">
                          {formatCurrency(b.total_minor)}
                        </td>
                        <td className="px-4 py-3 uppercase text-[11px] font-mono text-neutral-300">{b.status}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDateTime(b.issued_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportType === 'appointments' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white overflow-hidden text-xs">
            <div className="p-4 border-b border-[#2D3154] flex justify-between items-center">
              <h3 className="font-semibold text-white light:text-slate-900">
                Salon Bookings &amp; Appointments Report
              </h3>
              <span className="font-mono text-neutral-400">{filteredAppts.length} bookings in range</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#161826]/70 light:bg-slate-50 border-b border-[#2D3154] text-neutral-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Scheduled Time</th>
                    <th className="px-4 py-3">Salon</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D3154]/40">
                  {filteredAppts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-400">
                        No appointments booked in this date window.
                      </td>
                    </tr>
                  ) : (
                    filteredAppts.map((a) => (
                      <tr key={a.id} className="hover:bg-[#20243b]/40">
                        <td className="px-4 py-3 font-mono text-white">{formatDateTime(a.starts_at)}</td>
                        <td className="px-4 py-3 text-neutral-300">{a.shop?.name || a.shop_id}</td>
                        <td className="px-4 py-3 text-neutral-300">{a.customer?.name || 'Walk-in'}</td>
                        <td className="px-4 py-3 text-neutral-300">{a.status}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{a.duration_minutes} mins</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportType === 'deletions' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white overflow-hidden text-xs">
            <div className="p-4 border-b border-[#2D3154] flex justify-between items-center">
              <h3 className="font-semibold text-white light:text-slate-900">
                Account Deletion &amp; Churn Report
              </h3>
              <span className="font-mono text-rose-400">{filteredDeletions.length} deletions in range</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#161826]/70 light:bg-slate-50 border-b border-[#2D3154] text-neutral-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Salon Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Deletion Reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D3154]/40">
                  {filteredDeletions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-400">
                        No account deletion records in this date window.
                      </td>
                    </tr>
                  ) : (
                    filteredDeletions.map((d) => (
                      <tr key={d.id} className="hover:bg-[#20243b]/40">
                        <td className="px-4 py-3 font-semibold text-white light:text-slate-900">{d.shop_name || '—'}</td>
                        <td className="px-4 py-3 font-mono text-neutral-300">{d.phone || '—'}</td>
                        <td className="px-4 py-3 text-rose-300">{d.reason || 'Unspecified'}</td>
                        <td className="px-4 py-3 font-mono uppercase text-[11px] text-neutral-300">{d.status}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDateTime(d.deleted_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportType === 'unavailable' && (
        <div className="space-y-4">
          <UnavailableBanner
            title="App Versions, Telemetry & Trial Reports Unavailable"
            sourceTable="public.telemetry, public.trials, public.app_versions"
            message="These reports require mobile client telemetry logs and subscription tracking tables that do not currently exist in the Supabase schema."
            details="To unlock App Performance and Trial Conversion Reports, create the required tables in Supabase and configure telemetry collection."
          />
        </div>
      )}
    </div>
  );
};
