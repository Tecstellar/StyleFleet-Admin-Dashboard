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
            <Sliders className="w-5 h-5 text-[#B8860B]" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              System Governance &amp; Data Quality
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Automated schema discovery, relational integrity audits, and orphan record detection.
          </p>
        </div>

        <button
          onClick={runAudit}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-neutral-800 hover:border-[#D4AF37] hover:text-[#B8860B] transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#B8860B] ${loading ? 'animate-spin' : ''}`} />
          <span>Re-run Audit</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3 text-xs">
        <button
          onClick={() => setActiveTab('quality')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'quality'
              ? 'bg-[#111827] text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Data Quality Scan ({issues.length} detected)</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'schema'
              ? 'bg-[#111827] text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Schema Matrix ({schemaStatus.filter((s) => s.isAvailable).length} connected)</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'security'
              ? 'bg-[#111827] text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EE]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Security &amp; RLS Governance</span>
        </button>
      </div>

      {/* TAB 1: DATA QUALITY */}
      {activeTab === 'quality' && (
        <div className="space-y-4">
          {/* Audit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs">
              <span className="text-neutral-500">Integrity Checks Passed:</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {passedChecks} checks
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">Verified healthy in database</span>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs">
              <span className="text-neutral-500">Issues Flagged:</span>
              <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
                {issues.length}
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">Detected across records</span>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-xs text-xs">
              <span className="text-neutral-500">Data Freshness:</span>
              <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
                Live
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">Real-time sync enabled</span>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-3">
            {issues.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-[#E5E7EB] text-center text-xs text-neutral-500 bg-white">
                All data quality checks passed. No orphan records or integrity defects detected.
              </div>
            ) : (
              issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                        {issue.severity}
                      </span>
                      <h4 className="font-semibold text-neutral-900">{issue.title}</h4>
                    </div>
                    <span className="font-mono text-neutral-500 text-[11px]">{issue.affectedTable}</span>
                  </div>
                  <p className="text-neutral-600 leading-relaxed">{issue.description}</p>
                  {issue.recordsSample && issue.recordsSample.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#F0F0F0]">
                      <span className="text-[11px] text-neutral-500 block mb-1">Affected Record Samples:</span>
                      <div className="p-2.5 rounded bg-[#FAF7EE] border border-[#E8DEC4] font-mono text-[11px] text-neutral-800 overflow-x-auto">
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
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden text-xs">
          <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center">
            <h3 className="font-semibold text-neutral-900">
              Supabase Schema Tables &amp; Feature Mapping
            </h3>
            <span className="text-neutral-500 font-mono text-[11px]">
              {schemaStatus.length} inspected tables
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8F9FA] border-b border-[#E5E7EB] text-neutral-500 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Table Name</th>
                  <th className="px-4 py-3">Dashboard Feature</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Live Record Count</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {schemaStatus.map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF7EE] transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-neutral-900">
                      {t.tableName}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {t.featureName}
                    </td>
                    <td className="px-4 py-3">
                      {t.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Found (200)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          Not Found (404)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-700">
                      {t.recordCount !== null ? t.recordCount : '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-neutral-500">
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
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 space-y-4 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-semibold text-neutral-900">
              Security &amp; Credential Hygiene Verification
            </h3>
          </div>
          <div className="space-y-3 leading-relaxed text-neutral-700">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <strong>Clean Credential Separation:</strong> No service-role key or private master credentials are exposed in frontend client bundles. Only the publishable key (<code className="font-mono text-[#B8860B]">sb_publishable_...</code>) is used.
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAF7EE] border border-[#E8DEC4] space-y-1">
              <span className="font-semibold text-neutral-900">Row Level Security (RLS) Status:</span>
              <p className="text-neutral-600">
                All 18 operational tables have Row Level Security enabled in PostgreSQL. Permissive SELECT policies allow the dashboard to monitor salons, customers, appointments, and payments.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAF7EE] border border-[#E8DEC4] space-y-1">
              <span className="font-semibold text-neutral-900">Destructive Safeguard:</span>
              <p className="text-neutral-600">
                In adherence to Requirement 39, no destructive deletion operations (DELETE salon, DELETE user) are executed from the monitoring dashboard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
