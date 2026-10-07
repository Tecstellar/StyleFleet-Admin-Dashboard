import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Users,
  Search,
  Phone,
  Mail,
  Store,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Filter,
} from 'lucide-react';
import { KPICard } from '../common/KPICard';
import { ExportButton } from '../common/ExportButton';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { Customer, Shop, Bill } from '../../types/database';

interface CrmAddedUsersViewProps {
  customers: Customer[];
  shops: Shop[];
  bills: Bill[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
}

export const CrmAddedUsersView: React.FC<CrmAddedUsersViewProps> = ({
  customers,
  shops,
  bills,
  loading = false,
  onSelectSalon,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSalonId, setSelectedSalonId] = useState<string>('all');

  const shopMap = useMemo(() => {
    return new Map(shops.map((s) => [s.id, s]));
  }, [shops]);

  // Client metrics
  const enhancedCustomers = useMemo(() => {
    return customers.map((c) => {
      const salon = shopMap.get(c.shop_id);
      const customerBills = bills.filter((b) => b.customer_id === c.id);
      const totalSpent = customerBills.reduce((acc, b) => acc + ((b.total_minor || 0) / 100), 0);
      const visitCount = customerBills.length;
      return {
        ...c,
        salonName: salon?.name || 'Unknown Salon',
        salonCity: salon?.city || '',
        totalSpent,
        visitCount,
      };
    });
  }, [customers, shopMap, bills]);

  const filteredCustomers = useMemo(() => {
    return enhancedCustomers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        c.salonName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSalon = selectedSalonId === 'all' || c.shop_id === selectedSalonId;

      return matchesSearch && matchesSalon;
    });
  }, [enhancedCustomers, searchQuery, selectedSalonId]);

  const totalClients = customers.length;
  const newClients30D = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return customers.filter((c) => new Date(c.created_at).getTime() > cutoff).length;
  }, [customers]);

  const returningClients = enhancedCustomers.filter((c) => c.visitCount > 1).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.08em] text-[#0d9488] uppercase font-mono">
              CLIENT RELATIONSHIP MANAGEMENT
            </span>
            <span className="text-neutral-300">•</span>
            <span className="text-[11px] text-neutral-500 font-medium">Salon Client Records & CRM Database</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">
            CRM Added Users
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton data={filteredCustomers} filename="stylefleet-crm-clients.csv" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Total CRM Clients"
          value={formatNumber(totalClients)}
          subtitle="Registered across all salons"
          icon={Users}
          tone="revenue"
        />
        <KPICard
          title="Added in Last 30 Days"
          value={formatNumber(newClients30D)}
          subtitle="Recent customer additions"
          icon={UserPlus}
          tone="brand"
        />
        <KPICard
          title="Repeat / Returning"
          value={formatNumber(returningClients)}
          subtitle={`${totalClients > 0 ? Math.round((returningClients / totalClients) * 100) : 0}% client retention`}
          icon={TrendingUp}
          tone="usage"
        />
        <KPICard
          title="Salons with CRM"
          value={shops.length}
          subtitle="Active customer databases"
          icon={Store}
          tone="trial"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="panel p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by client name, phone number, email or salon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={selectedSalonId}
            onChange={(e) => setSelectedSalonId(e.target.value)}
            className="text-xs bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Salons ({shops.length})</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CRM Users Directory Table */}
      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">
            Client Records ({filteredCustomers.length})
          </h3>
          <span className="text-xs text-neutral-500">Live Supabase CRM</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50/75 text-neutral-500 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-100">
              <tr>
                <th className="px-4 py-3">Client Profile</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Salon Origin</th>
                <th className="px-4 py-3">Registration Date</th>
                <th className="px-4 py-3">Sales Invoices</th>
                <th className="px-4 py-3">Lifetime Value</th>
                <th className="px-4 py-3 text-right">Relationship</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                    No CRM client records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-900">{c.name || 'Unnamed Client'}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">ID: {c.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <Phone className="w-3 h-3 text-neutral-400" />
                          <span>{c.phone}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400">No phone</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3 h-3 text-[#0d9488]" />
                        <span>{c.salonName}</span>
                      </div>
                      {c.salonCity && <div className="text-[10px] text-neutral-400 pl-4">{c.salonCity}</div>}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-neutral-800">
                      {c.visitCount} visits
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-teal-700">
                      {formatCurrency(c.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge
                        status={c.visitCount > 2 ? 'active' : c.visitCount === 1 ? 'pending' : 'closed'}
                      />
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
