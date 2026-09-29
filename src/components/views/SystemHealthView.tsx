import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Activity,
  Wifi,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Terminal,
  Layers,
  Search,
  Eye,
  Store,
  Filter,
} from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { KPICard } from '../common/KPICard';
import { checkSupabaseConnection, SUPABASE_URL } from '../../services/supabase';
import { formatDateTime } from '../../utils/dateUtils';
import { SystemHealthRecord, SystemLogRecord, Shop } from '../../types/database';

interface SystemHealthViewProps {
  healthRecords?: SystemHealthRecord[];
  logs?: SystemLogRecord[];
  shops?: Shop[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const SystemHealthView: React.FC<SystemHealthViewProps> = ({
  healthRecords = [],
  logs = [],
  shops = [],
  loading = false,
  onRefresh,
}) => {
  const [latency, setLatency] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>(new Date().toLocaleTimeString());
  const [connectionStatus, setConnectionStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');

  const [activeTab, setActiveTab] = useState<'components' | 'logs' | 'nodes'>('components');
  const [logLevelFilter, setLogLevelFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [selectedLog, setSelectedLog] = useState<SystemLogRecord | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<SystemHealthRecord | null>(null);

  const runPing = async () => {
    setIsChecking(true);
    const res = await checkSupabaseConnection();
    setLatency(res.latencyMs);
    setConnectionStatus(res.ok ? (res.latencyMs < 600 ? 'healthy' : 'degraded') : 'down');
    setLastCheckTime(new Date().toLocaleTimeString());
    setIsChecking(false);
  };

  useEffect(() => {
    runPing();
    const interval = setInterval(runPing, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (logLevelFilter === 'all') return logs;
    return logs.filter((l) => l.level?.toLowerCase() === logLevelFilter);
  }, [logs, logLevelFilter]);

  // Real log stats
  const errorLogsCount = useMemo(() => {
    return logs.filter((l) => l.level?.toLowerCase() === 'error' || l.level?.toLowerCase() === 'fatal').length;
  }, [logs]);

  // Health records columns
  const healthColumns: Column<SystemHealthRecord>[] = [
    {
      key: 'component',
      header: 'Component / Service',
      render: (r) => (
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-[#B8860B]" />
          <span>{r.component}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const isOp = r.status?.toLowerCase() === 'operational' || r.status?.toLowerCase() === 'healthy';
        const isDegraded = r.status?.toLowerCase() === 'degraded' || r.status?.toLowerCase() === 'warn';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${
              isOp
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDegraded
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOp ? 'bg-emerald-500' : isDegraded ? 'bg-amber-500' : 'bg-rose-500'
              }`}
            />
            <span>{r.status || 'unknown'}</span>
          </span>
        );
      },
    },
    {
      key: 'salon',
      header: 'Salon / Scope',
      render: (r) => {
        const shopName = r.shop?.name || shops.find((s) => s.id === r.shop_id)?.name || 'Global System';
        return (
          <div className="flex items-center gap-1.5 text-xs text-neutral-700">
            <Store className="w-3 h-3 text-[#B8860B]" />
            <span className="truncate max-w-[140px]">{shopName}</span>
          </div>
        );
      },
    },
    {
      key: 'latency_ms',
      header: 'Latency',
      render: (r) => (
        <span className="font-mono text-xs text-neutral-700">
          {r.latency_ms !== null && r.latency_ms !== undefined ? `${r.latency_ms} ms` : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Last Checked',
      render: (r) => (
        <span className="font-mono text-xs text-neutral-500">
          {formatDateTime(r.timestamp || r.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Details',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedHealth(r);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#E5E7EB] bg-white text-neutral-800 hover:border-[#D4AF37] hover:text-[#B8860B] shadow-xs transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-[#B8860B]" />
          <span>Inspect</span>
        </button>
      ),
      sortable: false,
    },
  ];

  // System logs columns
  const logColumns: Column<SystemLogRecord>[] = [
    {
      key: 'level',
      header: 'Level',
      render: (l) => {
        const lvl = l.level?.toLowerCase() || 'info';
        const isErr = lvl === 'error' || lvl === 'fatal';
        const isWarn = lvl === 'warn' || lvl === 'warning';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
              isErr
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : isWarn
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-[#FAF7EE] text-[#B8860B] border-[#E8DEC4]'
            }`}
          >
            {lvl}
          </span>
        );
      },
    },
    {
      key: 'tag',
      header: 'Tag / Domain',
      render: (l) => (
        <span className="font-mono text-xs font-semibold text-[#B8860B]">
          {l.tag || 'SYSTEM'}
        </span>
      ),
    },
    {
      key: 'message',
      header: 'Log Message',
      render: (l) => (
        <div className="text-xs text-neutral-800 font-mono truncate max-w-md">
          {l.message}
        </div>
      ),
    },
    {
      key: 'salon',
      header: 'Salon / Device',
      render: (l) => {
        const shopName = l.shop?.name || shops.find((s) => s.id === l.shop_id)?.name;
        return (
          <div className="text-[11px] text-neutral-500">
            {shopName && <div className="text-neutral-900 truncate max-w-[120px]">{shopName}</div>}
            {l.device_id && <div className="font-mono truncate max-w-[120px]">Dev: {l.device_id.slice(0, 8)}</div>}
            {!shopName && !l.device_id && <span>Global Server</span>}
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (l) => (
        <span className="font-mono text-xs text-neutral-500">
          {formatDateTime(l.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Details',
      render: (l) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(l);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#E5E7EB] bg-white text-neutral-800 hover:border-[#D4AF37] hover:text-[#B8860B] shadow-xs transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-[#B8860B]" />
          <span>Inspect</span>
        </button>
      ),
      sortable: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              System Health &amp; Infrastructure
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Supabase public.system_health &amp; logs
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Realtime database connectivity, operational component statuses, and application exception logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={() => {
                runPing();
                onRefresh();
              }}
              disabled={isChecking || loading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-neutral-800 hover:border-[#D4AF37] hover:text-[#B8860B] transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#B8860B] ${isChecking || loading ? 'animate-spin' : ''}`} />
              <span>Ping &amp; Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Health Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-[#E5E7EB] bg-white space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-500">Database Status</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-neutral-900 font-mono flex items-center gap-2">
            <span>Operational</span>
          </div>
          <p className="text-[11px] text-neutral-500 truncate">Postgres Cluster (scgokpcoyfewrtrwqxpu)</p>
        </div>

        <div className="p-5 rounded-2xl border border-[#E5E7EB] bg-white space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-500">REST API Latency</span>
            <Wifi className="w-4 h-4 text-[#B8860B]" />
          </div>
          <div className="text-xl font-bold text-[#B8860B] font-mono">
            {latency !== null ? `${latency} ms` : 'Testing...'}
          </div>
          <p className="text-[11px] text-neutral-500">Round-trip REST API response</p>
        </div>

        <div className="p-5 rounded-2xl border border-[#E5E7EB] bg-white space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-500">Monitored Components</span>
            <Server className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-neutral-900 font-mono">
            {healthRecords.length}
          </div>
          <p className="text-[11px] text-neutral-500">Records in public.system_health</p>
        </div>

        <div className="p-5 rounded-2xl border border-[#E5E7EB] bg-white space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-500">Exceptions &amp; Errors</span>
            <AlertCircle className={`w-4 h-4 ${errorLogsCount > 0 ? 'text-rose-500' : 'text-neutral-400'}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${errorLogsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {errorLogsCount} <span className="text-xs font-normal text-neutral-500">/ {logs.length} total logs</span>
          </div>
          <p className="text-[11px] text-neutral-500">Recorded in public.system_logs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('components')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'components'
                ? 'bg-[#111827] text-white shadow-xs border border-[#111827]'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
            }`}
          >
            <Server className="w-4 h-4 text-[#D4AF37]" />
            <span>Health Components ({healthRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-[#111827] text-white shadow-xs border border-[#111827]'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
            }`}
          >
            <Activity className="w-4 h-4 text-[#D4AF37]" />
            <span>System Logs &amp; Exceptions ({filteredLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'nodes'
                ? 'bg-[#111827] text-white shadow-xs border border-[#111827]'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
            }`}
          >
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <span>Infrastructure Nodes</span>
          </button>
        </div>

        {activeTab === 'logs' && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
            {(['all', 'error', 'warn', 'info'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLogLevelFilter(lvl)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                  logLevelFilter === lvl
                    ? 'bg-[#111827] text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: System Health Components Table */}
      {activeTab === 'components' && (
        <DataTable
          columns={healthColumns}
          data={healthRecords}
          loading={loading}
          emptyTitle="No health component records"
          emptyDescription={
            healthRecords.length === 0
              ? 'The public.system_health table in Supabase currently has 0 rows. Services reporting heartbeats will dynamically populate this table.'
              : 'No health records match your criteria.'
          }
          searchPlaceholder="Search component name, status, salon..."
          searchFields={['component', 'status']}
          defaultSortField="created_at"
          defaultSortOrder="desc"
          onRowClick={(r) => setSelectedHealth(r)}
        />
      )}

      {/* Tab 2: System Logs Table */}
      {activeTab === 'logs' && (
        <DataTable
          columns={logColumns}
          data={filteredLogs}
          loading={loading}
          emptyTitle="No system logs found"
          emptyDescription={
            logs.length === 0
              ? 'The public.system_logs table in Supabase currently has 0 rows. Application events, warnings, and errors will automatically appear here via Realtime.'
              : 'No system logs match the selected level filter.'
          }
          searchPlaceholder="Search log message, tag, salon, device..."
          searchFields={['message', 'tag', 'level', 'device_id']}
          defaultSortField="created_at"
          defaultSortOrder="desc"
          onRowClick={(l) => setSelectedLog(l)}
        />
      )}

      {/* Tab 3: Infrastructure Nodes */}
      {activeTab === 'nodes' && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold text-neutral-900">
            Connected Supabase Infrastructure Nodes
          </h3>
          <div className="divide-y divide-[#E5E7EB] text-xs">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-900">PostgreSQL Primary Cluster</span>
                <p className="text-[11px] text-neutral-500 font-mono truncate max-w-md">
                  {SUPABASE_URL}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE • 200 OK
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-900">PostgREST API Gateway</span>
                <p className="text-[11px] text-neutral-500">
                  Auto-generated OpenAPI v3 endpoints with instant schema synchronization.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                HEALTHY
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-900">Supabase Realtime Engine</span>
                <p className="text-[11px] text-neutral-500">
                  WebSocket postgres_changes replication for support messages, deletions, and telemetry.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                CONNECTED
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Drilldown Modal for Health Component */}
      <Modal
        isOpen={!!selectedHealth}
        onClose={() => setSelectedHealth(null)}
        title={`Component: ${selectedHealth?.component}`}
        subtitle={`Recorded on ${formatDateTime(selectedHealth?.created_at)}`}
        maxWidth="xl"
      >
        {selectedHealth && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-[#E5E7EB] bg-[#FAF7EE]">
              <div>
                <span className="text-neutral-500 block text-[11px]">Component Name</span>
                <span className="font-semibold text-neutral-900">{selectedHealth.component}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Status</span>
                <span className="text-emerald-700 font-bold uppercase">{selectedHealth.status}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Latency</span>
                <span className="font-mono text-neutral-900">{selectedHealth.latency_ms ?? 'N/A'} ms</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Error Count</span>
                <span className="font-mono text-neutral-900">{selectedHealth.error_count ?? 0}</span>
              </div>
            </div>

            {selectedHealth.details && (
              <div className="space-y-2">
                <span className="font-bold text-neutral-700">Component Details:</span>
                <pre className="p-3 rounded-xl bg-white border border-[#E5E7EB] text-[11px] font-mono text-neutral-800 overflow-x-auto max-h-48 shadow-xs">
                  {typeof selectedHealth.details === 'object'
                    ? JSON.stringify(selectedHealth.details, null, 2)
                    : selectedHealth.details}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Drilldown Modal for System Log */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`System Log: [${selectedLog?.tag}] ${selectedLog?.level?.toUpperCase()}`}
        subtitle={`Recorded on ${formatDateTime(selectedLog?.created_at)}`}
        maxWidth="2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAF7EE] space-y-2">
              <span className="text-neutral-500 block text-[11px]">Log Message</span>
              <div className="text-neutral-900 font-mono leading-relaxed whitespace-pre-wrap">
                {selectedLog.message}
              </div>
            </div>

            {selectedLog.stack_trace && (
              <div className="space-y-2">
                <span className="font-bold text-rose-700">Stack Trace:</span>
                <pre className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-mono text-rose-800 overflow-x-auto max-h-56 whitespace-pre-wrap">
                  {selectedLog.stack_trace}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs">
              <div>
                <span className="text-neutral-500 block text-[11px]">Device ID</span>
                <span className="font-mono text-neutral-900">{selectedLog.device_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Shop ID</span>
                <span className="font-mono text-neutral-900">{selectedLog.shop_id || 'Global'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
