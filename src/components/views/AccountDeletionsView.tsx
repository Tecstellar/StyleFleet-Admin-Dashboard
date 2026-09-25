import React, { useMemo } from 'react';
import { UserX, AlertTriangle, ShieldAlert, PieChart as PieIcon } from 'lucide-react';
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
}

const GOLD_PALETTE = ['#D9A441', '#E0C068', '#B8863B', '#8C6239', '#5B4021'];

export const AccountDeletionsView: React.FC<AccountDeletionsViewProps> = ({
  deletions,
  loading = false,
}) => {
  const { dateRange } = useDateFilter();

  const filteredDeletions = useMemo(() => {
    return filterByDateRange(deletions, 'created_at', dateRange);
  }, [deletions, dateRange]);

  // Compute exact reasons statistics and percentages from real records
  const reasonStats = useMemo(() => {
    return calculateDeletionReasonStats(filteredDeletions);
  }, [filteredDeletions]);

  const pieData = useMemo(() => {
    return reasonStats.map((s) => ({ name: s.reason, value: s.count }));
  }, [reasonStats]);

  const columns: Column<AccountDeletion>[] = [
    {
      key: 'shop_name',
      header: 'Salon Name',
      render: (d) => (
        <div>
          <div className="font-semibold text-white light:text-slate-900">
            {d.shop_name || 'Unspecified Salon'}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono">
            {d.phone || 'No phone'}
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Deletion Reason',
      render: (d) => (
        <span className="font-medium text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-xs">
          {d.reason || 'No reason specified'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: 'platform',
      header: 'Platform / Version',
      render: () => (
        <span className="text-[11px] text-neutral-500 italic">
          Unavailable (No telemetry field)
        </span>
      ),
      sortable: false,
    },
    {
      key: 'deleted_at',
      header: 'Deleted Date',
      render: (d) => (
        <span className="font-mono text-xs text-neutral-400">
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
            <UserX className="w-5 h-5 text-rose-400" />
            <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
              Account Deletions &amp; Churn Analytics
            </h1>
          </div>
          <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
            Verified account deletion requests from Supabase table <code className="text-[#D9A441] font-mono">public.account_deletions</code>.
          </p>
        </div>

        <ExportButton
          data={filteredDeletions}
          filename="stylefleet_account_deletions"
          columns={[
            { key: 'shop_name', label: 'Salon Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'reason', label: 'Reason' },
            { key: 'status', label: 'Status' },
            { key: 'deleted_at', label: 'Deleted At' },
          ]}
        />
      </div>

      {/* Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reasons Distribution Table */}
        <div className="lg:col-span-2 rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-5 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-white light:text-slate-900">
              Exact Reasons Analysis
            </h3>
            <p className="text-xs text-neutral-400 light:text-slate-500">
              Calculated exclusively from verified database rows. No synthetic categories.
            </p>
          </div>

          <div className="space-y-3">
            {reasonStats.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-white light:text-slate-900">
                    {item.reason}
                  </span>
                  <span className="font-mono text-neutral-300 light:text-slate-600 font-semibold">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[#161826] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: GOLD_PALETTE[idx % GOLD_PALETTE.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-5 flex flex-col items-center justify-center shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 self-start">
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
                      <Cell key={`cell-${index}`} fill={GOLD_PALETTE[index % GOLD_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161826',
                      borderColor: '#D9A441',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-xs text-neutral-400 py-12">No deletion records.</div>
          )}
        </div>
      </div>

      {/* Deletions Table */}
      <DataTable
        columns={columns}
        data={filteredDeletions}
        loading={loading}
        emptyTitle="No account deletion records found"
        emptyDescription="There are no account deletion requests in the connected Supabase database for this filter."
        searchPlaceholder="Search salon name, phone, reason..."
        searchFields={['shop_name', 'phone', 'reason']}
        defaultSortField="deleted_at"
        defaultSortOrder="desc"
      />
    </div>
  );
};
