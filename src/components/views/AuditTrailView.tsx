import React, { useMemo } from 'react';
import { History, Shield, CreditCard, CalendarCheck, UserX, Store } from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';
import { Payment, Bill, Appointment, AccountDeletion, Shop } from '../../types/database';

interface AuditTrailItem {
  id: string;
  type: 'Payment' | 'Invoice' | 'Booking' | 'Deletion' | 'Salon Registration';
  entity: string;
  description: string;
  timestamp: string;
  status: string;
  raw: any;
}

interface AuditTrailViewProps {
  payments: Payment[];
  bills: Bill[];
  appointments: Appointment[];
  deletions: AccountDeletion[];
  shops: Shop[];
  loading?: boolean;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  payments,
  bills,
  appointments,
  deletions,
  shops,
  loading = false,
}) => {
  const { dateRange } = useDateFilter();

  // Combine real database records into unified immutable chronological audit trail
  const combinedAuditItems: AuditTrailItem[] = useMemo(() => {
    const items: AuditTrailItem[] = [];

    // 1. Payments
    payments.forEach((p) => {
      items.push({
        id: p.id,
        type: 'Payment',
        entity: p.shop?.name || `Shop #${p.shop_id.slice(0, 8)}`,
        description: `Settled payment of ${formatCurrency(p.amount_minor)} via ${p.method} (Ref: ${p.reference || 'Billing'})`,
        timestamp: p.paid_at,
        status: p.status,
        raw: p,
      });
    });

    // 2. Bills
    bills.forEach((b) => {
      items.push({
        id: b.id,
        type: 'Invoice',
        entity: b.shop?.name || `Shop #${b.shop_id.slice(0, 8)}`,
        description: `Invoice ${b.invoice_number} generated for ${formatCurrency(b.total_minor)}`,
        timestamp: b.issued_at,
        status: b.status,
        raw: b,
      });
    });

    // 3. Appointments
    appointments.forEach((a) => {
      items.push({
        id: a.id,
        type: 'Booking',
        entity: a.shop?.name || `Shop #${a.shop_id.slice(0, 8)}`,
        description: `Appointment scheduled for ${a.customer?.name || 'Walk-in'} (${a.duration_minutes} mins)`,
        timestamp: a.created_at || a.starts_at,
        status: a.status,
        raw: a,
      });
    });

    // 4. Account Deletions
    deletions.forEach((d) => {
      items.push({
        id: d.id,
        type: 'Deletion',
        entity: d.shop_name || `Phone: ${d.phone}`,
        description: `Account deletion executed. Reason: "${d.reason}"`,
        timestamp: d.deleted_at || d.created_at,
        status: d.status,
        raw: d,
      });
    });

    // 5. Shop Registrations
    shops.forEach((s) => {
      items.push({
        id: s.id,
        type: 'Salon Registration',
        entity: s.name,
        description: `New salon registered in ${s.city || 'Tamil Nadu'} with contact phone ${s.phone || 'N/A'}`,
        timestamp: s.created_at,
        status: 'active',
        raw: s,
      });
    });

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [payments, bills, appointments, deletions, shops]);

  const filteredItems = useMemo(() => {
    return filterByDateRange(combinedAuditItems, 'timestamp', dateRange);
  }, [combinedAuditItems, dateRange]);

  const columns: Column<AuditTrailItem>[] = [
    {
      key: 'type',
      header: 'Operation Type',
      render: (item) => {
        let colorClass = 'bg-[#D9A441]/20 text-[#D9A441] border-[#D9A441]/30';
        if (item.type === 'Payment') colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (item.type === 'Deletion') colorClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
        if (item.type === 'Booking') colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border font-semibold ${colorClass}`}>
            {item.type}
          </span>
        );
      },
    },
    {
      key: 'entity',
      header: 'Associated Entity',
      render: (item) => (
        <span className="font-semibold text-white light:text-slate-900">
          {item.entity}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Audit Description',
      render: (item) => (
        <span className="text-neutral-300 light:text-slate-700">
          {item.description}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'State',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (item) => (
        <span className="font-mono text-xs text-neutral-400">
          {formatDateTime(item.timestamp)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#D9A441]" />
            <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
              Platform Audit Trail
            </h1>
          </div>
          <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
            Verified chronological log of transactional mutations, registrations, payments, and account deletions.
          </p>
        </div>

        <ExportButton
          data={filteredItems}
          filename="stylefleet_audit_trail"
          columns={[
            { key: 'type', label: 'Operation Type' },
            { key: 'entity', label: 'Entity' },
            { key: 'description', label: 'Description' },
            { key: 'status', label: 'Status' },
            { key: 'timestamp', label: 'Timestamp' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
        loading={loading}
        emptyTitle="No audit records found"
        emptyDescription="No database events found matching the active date window."
        searchPlaceholder="Search operation, entity, description..."
        searchFields={['type', 'entity', 'description']}
        defaultSortField="timestamp"
        defaultSortOrder="desc"
      />
    </div>
  );
};
