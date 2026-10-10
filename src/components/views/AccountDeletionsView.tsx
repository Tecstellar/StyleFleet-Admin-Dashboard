import React, { useState, useMemo } from 'react';
import {
  UserX,
  AlertTriangle,
  PieChart as PieIcon,
  ExternalLink,
  MessageCircle,
  Calendar,
  Filter,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { calculateDeletionReasonStats } from '../../services/deletionsService';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime } from '../../utils/dateUtils';
import { AccountDeletion } from '../../types/database';

interface AccountDeletionsViewProps {
  deletions: AccountDeletion[];
  loading?: boolean;
  onOpenDeleteAccountInstructions?: () => void;
}

const MONO_PALETTE = ['#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1E293B', '#475569'];

export const AccountDeletionsView: React.FC<AccountDeletionsViewProps> = ({
  deletions,
  loading = false,
  onOpenDeleteAccountInstructions,
}) => {
  const { dateRange } = useDateFilter();
  const [scope, setScope] = useState<'all' | 'filtered'>('all');

  // Filtered deletions by current global date range
  const filteredDeletions = useMemo(() => {
    return filterByDateRange(deletions, 'created_at', dateRange);
  }, [deletions, dateRange]);

  // Active records to display based on selected scope (defaulting to 'all' so lifetime audit is immediately visible)
  const activeDeletions = useMemo(() => {
    return scope === 'all' ? deletions : filteredDeletions;
  }, [scope, deletions, filteredDeletions]);

  // Compute exact reasons statistics and percentages from active records
  const reasonStats = useMemo(() => {
    return calculateDeletionReasonStats(activeDeletions);
  }, [activeDeletions]);

  const pieData = useMemo(() => {
    return reasonStats.map((s) => ({ name: s.reason, value: s.count }));
  }, [reasonStats]);

  const columns: Column<AccountDeletion>[] = [
    {
      key: 'shop_name',
      header: 'Salon Name',
      render: (d) => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">
            {d.shop_name || 'Unspecified Salon'}
          </div>
          {d.phone ? (
            <a
              href={`https://wa.me/91${d.phone.replace(/\D/g, '').slice(-10)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-700 hover:underline font-mono inline-flex items-center gap-1 mt-0.5"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-3 h-3 text-emerald-600" />
              {d.phone}
            </a>
          ) : (
            <div className="text-[11px] text-slate-400 font-mono">No phone</div>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Deletion Reason',
      render: (d) => (
        <span className="font-medium text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 text-xs inline-block">
          {d.reason || 'No reason specified'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <StatusBadge status={d.status || 'processed'} />,
    },
    {
      key: 'shop_id',
      header: 'Shop ID',
      render: (d) => (
        <span className="font-mono text-[11px] text-slate-500 truncate max-w-[140px] block select-all">
          {d.shop_id || '—'}
        </span>
      ),
    },
    {
      key: 'deleted_at',
      header: 'Deleted Date & Time',
      render: (d) => (
        <span className="font-mono text-xs text-slate-700 font-medium">
          {formatDateTime(d.deleted_at || d.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-rose-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Account Deletions &amp; Churn Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified account deletion requests from Supabase table <code className="text-slate-900 font-semibold font-mono">public.account_deletions</code> ({deletions.length} total lifetime records).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Scope Filter Switcher */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time ({deletions.length})
            </button>
            <button
              onClick={() => setScope('filtered')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                scope === 'filtered'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {dateRange.label} ({filteredDeletions.length})
            </button>
          </div>

          {onOpenDeleteAccountInstructions && (
            <button
              onClick={onOpenDeleteAccountInstructions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:text-black hover:border-slate-400 transition-colors cursor-pointer shadow-2xs"
              title="Open Public Account Deletion Instructions Page"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Public Deletion Page</span>
            </button>
          )}

          <ExportButton
            data={activeDeletions}
            filename={`stylefleet_account_deletions_${scope}`}
            columns={[
              { key: 'shop_name', label: 'Salon Name' },
              { key: 'phone', label: 'Phone' },
              { key: 'reason', label: 'Reason' },
              { key: 'status', label: 'Status' },
              { key: 'shop_id', label: 'Shop ID' },
              { key: 'deleted_at', label: 'Deleted At' },
            ]}
          />
        </div>
      </div>

      {/* Notice Banner when Date Filter returns 0 records */}
      {scope === 'filtered' && filteredDeletions.length === 0 && deletions.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              No account deletions occurred during <strong>{dateRange.label}</strong>. However, there are <strong>{deletions.length}</strong> lifetime deletion records stored in Supabase.
            </span>
          </div>
          <button
            onClick={() => setScope('all')}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold transition-colors cursor-pointer shrink-0 ml-3 shadow-2xs"
          >
            Show All {deletions.length} Records
          </button>
        </div>
      )}

      {/* Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reasons Distribution Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Exact Reasons Analysis
              </h3>
              <p className="text-xs text-slate-500">
                Calculated directly from verified database rows ({activeDeletions.length} records analyzed).
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {scope === 'all' ? 'All Time Scope' : dateRange.label}
            </span>
          </div>

          <div className="space-y-3">
            {reasonStats.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No deletion records to analyze for this scope.
              </div>
            ) : (
              reasonStats.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-900">
                      {item.reason}
                    </span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: MONO_PALETTE[idx % MONO_PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col items-center justify-center shadow-2xs">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 self-start">
            Reason Breakdown
          </h4>
          {pieData.length > 0 ? (
            <div className="w-full h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={MONO_PALETTE[index % MONO_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#0F172A',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-12">No deletion records.</div>
          )}
        </div>
      </div>

      {/* Deletions Table */}
      <DataTable
        columns={columns}
        data={activeDeletions}
        loading={loading}
        emptyTitle="No account deletion records found"
        emptyDescription={
          scope === 'filtered'
            ? `There are no account deletion requests during ${dateRange.label}. Click "All Time" above to view all ${deletions.length} lifetime records.`
            : 'There are no account deletion requests in the connected Supabase database.'
        }
        searchPlaceholder="Search salon name, phone, reason, or shop ID..."
        searchFields={['shop_name', 'phone', 'reason', 'shop_id']}
        defaultSortField="deleted_at"
        defaultSortOrder="desc"
      />
    </div>
  );
};
