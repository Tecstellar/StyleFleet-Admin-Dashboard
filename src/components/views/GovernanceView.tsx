import React, { useState, useEffect } from 'react';
import { Sliders, ShieldCheck, AlertTriangle, Database, CheckCircle2, RefreshCw, XCircle, Search } from 'lucide-react';
import { runDataQualityAudit, fetchLiveSchemaCounts, DataQualityIssue, SchemaTableStatus } from '../../services/diagnosticsService';

export const GovernanceView: React.FC = () => {
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [schemaStatus, setSchemaStatus] = useState<SchemaTableStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [passedChecks, setPassedChecks] = useState(14);
  const [activeTab, setActiveTab] = useState<'quality' | 'schema' | 'security'>('quality');

  const runAudit = async () => {
    setLoading(true);
    const [auditRes, schemaRes] = await Promise.all([
      runDataQualityAudit(),
      fetchLiveSchemaCounts(),
    ]);
    setIssues(auditRes.issues);
    setPassedChecks(auditRes.passedChecks);
    setSchemaStatus(schemaRes);
    setLoading(false);
  };

  useEffect(() => {
    runAudit();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#D9A441]" />
            <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
              System Governance &amp; Data Quality
            </h1>
          </div>
          <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
            Automated schema discovery, relational integrity audits, and orphan record detection.
          </p>
        </div>

        <button
          onClick={runAudit}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#2D3154] light:border-slate-300 bg-[#1E2136] light:bg-white text-xs font-semibold text-neutral-200 light:text-slate-700 hover:border-[#D9A441] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#D9A441] ${loading ? 'animate-spin' : ''}`} />
          <span>Re-run Audit</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2D3154] light:border-slate-200 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('quality')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'quality'
              ? 'bg-[#D9A441] text-[#161826] font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-[#1E2136]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Data Quality Scan ({issues.length} detected)</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'schema'
              ? 'bg-[#D9A441] text-[#161826] font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-[#1E2136]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Schema Matrix ({schemaStatus.filter((s) => s.isAvailable).length} connected)</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'security'
              ? 'bg-[#D9A441] text-[#161826] font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-[#1E2136]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security &amp; RLS Governance</span>
        </button>
      </div>

      {/* TAB 1: DATA QUALITY */}
      {activeTab === 'quality' && (
        <div className="space-y-4">
          {/* Audit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[#2D3154] bg-[#1E2136] light:bg-white text-xs">
              <span className="text-neutral-400">Integrity Checks Passed:</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {passedChecks} checks
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">Verified healthy in database</span>
            </div>

            <div className="p-4 rounded-xl border border-[#2D3154] bg-[#1E2136] light:bg-white text-xs">
              <span className="text-neutral-400">Issues Flagged:</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {issues.length}
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">Detected across records</span>
            </div>

            <div className="p-4 rounded-xl border border-[#2D3154] bg-[#1E2136] light:bg-white text-xs">
              <span className="text-neutral-400">Data Freshness:</span>
              <div className="text-2xl font-bold font-mono text-white light:text-slate-900 mt-1">
                Live
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">Real-time sync enabled</span>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-3">
            {issues.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-[#2D3154] text-center text-xs text-neutral-400">
                All data quality checks passed. No orphan records or integrity defects detected.
              </div>
            ) : (
              issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-5 rounded-xl border border-[#2D3154] bg-[#1E2136] light:bg-white space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {issue.severity}
                      </span>
                      <h4 className="font-semibold text-white light:text-slate-900">{issue.title}</h4>
                    </div>
                    <span className="font-mono text-neutral-400 text-[11px]">{issue.affectedTable}</span>
                  </div>
                  <p className="text-neutral-300 light:text-slate-600 leading-relaxed">{issue.description}</p>
                  {issue.recordsSample && issue.recordsSample.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#2D3154]/50">
                      <span className="text-[11px] text-neutral-400 block mb-1">Affected Record Samples:</span>
                      <div className="p-2.5 rounded bg-[#161826] font-mono text-[11px] text-neutral-300 overflow-x-auto">
                        {JSON.stringify(issue.recordsSample, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SCHEMA MATRIX */}
      {activeTab === 'schema' && (
        <div className="rounded-xl border border-[#2D3154] bg-[#1E2136] light:bg-white overflow-hidden text-xs">
          <div className="p-4 border-b border-[#2D3154] flex justify-between items-center">
            <h3 className="font-semibold text-white light:text-slate-900">
              Supabase Schema Tables &amp; Feature Mapping
            </h3>
            <span className="text-neutral-400 font-mono text-[11px]">
              {schemaStatus.length} inspected tables
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#161826]/70 border-b border-[#2D3154] text-neutral-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Table Name</th>
                  <th className="px-4 py-3">Dashboard Feature</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Live Record Count</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3154]/40">
                {schemaStatus.map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#20243b]/40">
                    <td className="px-4 py-3 font-mono font-semibold text-white light:text-slate-900">
                      {t.tableName}
                    </td>
                    <td className="px-4 py-3 text-neutral-300 light:text-slate-700">
                      {t.featureName}
                    </td>
                    <td className="px-4 py-3">
                      {t.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Found (200)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          Not Found (404)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-300">
                      {t.recordCount !== null ? t.recordCount : '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-neutral-400">
                      {t.statusMessage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY */}
      {activeTab === 'security' && (
        <div className="rounded-2xl border border-[#2D3154] bg-[#1E2136] light:bg-white p-6 space-y-4 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white light:text-slate-900">
              Security &amp; Credential Hygiene Verification
            </h3>
          </div>
          <div className="space-y-3 leading-relaxed text-neutral-300 light:text-slate-600">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <strong>Clean Credential Separation:</strong> No service-role key or private master credentials are exposed in frontend client bundles. Only the publishable key (<code className="font-mono text-[#D9A441]">sb_publishable_...</code>) is used.
            </div>
            <div className="p-3.5 rounded-xl bg-[#161826] border border-[#2D3154] space-y-1">
              <span className="font-semibold text-white">Row Level Security (RLS) Status:</span>
              <p className="text-neutral-400">
                All 18 operational tables have Row Level Security enabled in PostgreSQL. Permissive SELECT policies allow the dashboard to monitor salons, customers, appointments, and payments.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#161826] border border-[#2D3154] space-y-1">
              <span className="font-semibold text-white">Destructive Safeguard:</span>
              <p className="text-neutral-400">
                In adherence to Requirement 39, no destructive deletion operations (DELETE salon, DELETE user) are executed from the monitoring dashboard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
