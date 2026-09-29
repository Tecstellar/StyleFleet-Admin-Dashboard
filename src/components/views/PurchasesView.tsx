import React, { useMemo } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { UnavailableBanner } from '../common/UnavailableBanner';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';
import { Payment } from '../../types/database';

interface PurchasesViewProps {
  payments: Payment[];
  loading?: boolean;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ payments, loading = false }) => {
  const { dateRange } = useDateFilter();

  const filteredPayments = useMemo(() => {
    return filterByDateRange(payments, 'paid_at', dateRange);
  }, [payments, dateRange]);

  const totalAmountMinor = filteredPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);

  const columns: Column<Payment>[] = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (p) => (
        <span className="font-mono text-xs text-[#D9A441]">
          {p.id.slice(0, 10)}...
        </span>
      ),
    },
    {
      key: 'shop',
      header: 'Salon Business',
      render: (p) => (
        <span className="font-semibold text-neutral-900">
          {p.shop?.name || p.shop_id}
        </span>
      ),
    },
    {
      key: 'bill',
      header: 'Invoice Reference',
      render: (p) => (
        <div>
          <div className="font-mono text-xs text-neutral-700">
            {p.bill?.invoice_number || 'Direct Payment'}
          </div>
          {p.reference && (
            <div className="text-[11px] text-neutral-500 truncate max-w-xs">{p.reference}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount_minor',
      header: 'Amount (INR)',
      render: (p) => (
        <span className="font-mono font-bold text-neutral-900">
          {formatCurrency(p.amount_minor)}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Payment Method',
      render: (p) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-[#FAF7EE] text-[#B8860B] border border-[#E8DEC4]">
          {p.method}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'paid_at',
      header: 'Timestamp',
      render: (p) => (
        <span className="font-mono text-xs text-neutral-500">
          {formatDateTime(p.paid_at)}
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
            <CreditCard className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Purchases &amp; Transactions
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Verified financial transaction records from Supabase table <code className="text-[#B8860B] font-mono">public.payments</code>.
          </p>
        </div>

        <ExportButton
          data={filteredPayments}
          filename="stylefleet_payments"
          columns={[
            { key: 'id', label: 'Payment ID' },
            { key: 'amount_minor', label: 'Amount Minor (Paise)' },
            { key: 'method', label: 'Method' },
            { key: 'status', label: 'Status' },
            { key: 'reference', label: 'Reference' },
            { key: 'paid_at', label: 'Paid At' },
          ]}
        />
      </div>

      {/* Honest Database Scope Banner */}
      <UnavailableBanner
        title="SaaS Platform Subscription Purchases Table Not Found"
        sourceTable="public.purchases / public.subscriptions"
        message="StyleFleet SaaS tier subscription purchases (App Store / Google Play / Razorpay SaaS) are not stored in the connected Supabase database. Displaying verified salon customer payments and billing settlements recorded in public.payments."
      />

      {/* Financial Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs">
          <span className="text-neutral-500">Collected Total:</span>
          <div className="text-2xl font-bold font-mono text-[#D4AF37] mt-1">
            {formatCurrency(totalAmountMinor)}
          </div>
          <span className="text-[10px] text-neutral-400 mt-1 block">Within active date filter</span>
        </div>

        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs">
          <span className="text-neutral-500">Transaction Count:</span>
          <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            {filteredPayments.length}
          </div>
          <span className="text-[10px] text-neutral-400 mt-1 block">Settled payment entries</span>
        </div>

        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs">
          <span className="text-neutral-500">Payment Gateway:</span>
          <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
            UPI / Direct Transfer
          </div>
          <span className="text-[10px] text-neutral-400 mt-1 block">Recorded in public.payments</span>
        </div>
      </div>

      {/* Payments Table */}
      <DataTable
        columns={columns}
        data={filteredPayments}
        loading={loading}
        emptyTitle="No payment records found"
        emptyDescription="Purchase data is not available in the connected database for this date range."
        searchPlaceholder="Search payment ID, salon, reference..."
        searchFields={['id', 'reference', 'method']}
        defaultSortField="paid_at"
        defaultSortOrder="desc"
      />
    </div>
  );
};
