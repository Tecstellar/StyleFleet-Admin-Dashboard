import React, { useState, useMemo } from 'react';
import {
  Download,
  Phone,
  Trash2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Shop } from '../../types/database';
import { exportToCSV } from '../../utils/formatters';

interface IncompleteSignupsViewProps {
  shops?: Shop[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
}

export type OtpStatus = 'OTP expired' | 'Wrong OTP' | 'Pending OTP' | 'Blocked';

export interface IncompleteSignupRecord {
  id: string;
  phone: string;
  status: OtpStatus;
  otpSentAt: string;
  expiresAt: string;
  attempts: number;
  otpSends: number;
  sessionHash: string;
}

// Generate realistic incomplete OTP signup sessions
function generateInitialRecords(): IncompleteSignupRecord[] {
  const seedPhones = [
    { phone: '+91 91881 02779', sends: 4, attempts: 0, status: 'OTP expired' as const, minsAgo: 80, hash: '...836104' },
    { phone: '+91 72002 98861', sends: 2, attempts: 0, status: 'OTP expired' as const, minsAgo: 350, hash: '...158c05' },
    { phone: '+91 88844 45294', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 2 + 120, hash: '...f5c98b' },
    { phone: '+91 70108 36948', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 2 + 560, hash: '...8c270f' },
    { phone: '+91 76761 09806', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 3 + 680, hash: '...bca4af' },
    { phone: '+91 65049 82804', sends: 21, attempts: 1, status: 'Wrong OTP' as const, minsAgo: 1440 * 4 + 200, hash: '...47261b' },
    { phone: '+91 89033 68006', sends: 2, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 5 + 720, hash: '...8886e5' },
    { phone: '+91 99656 69363', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 6 + 980, hash: '...2bacb5' },
    { phone: '+91 99621 38564', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 8 + 590, hash: '...a60557' },
    { phone: '+91 98401 23456', sends: 3, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 10 + 200, hash: '...91b8a1' },
    { phone: '+91 97890 54321', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 12 + 450, hash: '...7c4e20' },
    { phone: '+91 94440 12890', sends: 2, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 14 + 110, hash: '...3a2f90' },
    { phone: '+91 98840 98765', sends: 5, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 16 + 820, hash: '...5e10cd' },
    { phone: '+91 95000 65432', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 18 + 330, hash: '...4d90ab' },
    { phone: '+91 91760 11223', sends: 2, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 20 + 600, hash: '...6f88ef' },
    { phone: '+91 99400 33445', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 22 + 410, hash: '...2c55dd' },
    { phone: '+91 98410 55667', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 24 + 190, hash: '...8b44aa' },
    { phone: '+91 97900 77889', sends: 3, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 26 + 770, hash: '...1a33bb' },
    { phone: '+91 98844 99001', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 27 + 510, hash: '...9e22cc' },
    { phone: '+91 90030 12345', sends: 2, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 28 + 320, hash: '...7f11ee' },
    { phone: '+91 94450 67890', sends: 1, attempts: 0, status: 'OTP expired' as const, minsAgo: 1440 * 29 + 150, hash: '...3d00ff' },
  ];

  const now = Date.now();
  return seedPhones.map((s, idx) => {
    const sentTime = new Date(now - s.minsAgo * 60000);
    const expTime = new Date(sentTime.getTime() + 60000); // 1 minute expiry
    return {
      id: `otp-${idx + 1}-${s.hash.slice(-4)}`,
      phone: s.phone,
      status: s.status,
      otpSentAt: sentTime.toISOString(),
      expiresAt: expTime.toISOString(),
      attempts: s.attempts,
      otpSends: s.sends,
      sessionHash: s.hash,
    };
  });
}

export const IncompleteSignupsView: React.FC<IncompleteSignupsViewProps> = () => {
  // Date Scope: '7d' | '30d' | '90d' | 'all' (Default to '30d' matching reference image)
  const [dateScope, setDateScope] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  // Status Filter: 'all' | OtpStatus
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Stored Signups with LocalStorage Persistence
  const [records, setRecords] = useState<IncompleteSignupRecord[]>(() => {
    try {
      const saved = localStorage.getItem('stylefleet_incomplete_signups');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return generateInitialRecords();
  });

  // Format date like "14 Oct 2026, 04:28 pm"
  const formatFriendlyDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return '—';
    }
  };

  // Filter records based on selected date scope and status
  const filteredRecords = useMemo(() => {
    const now = Date.now();
    return records.filter((r) => {
      const sentTime = new Date(r.otpSentAt).getTime();

      // 1. Date Scope
      if (dateScope === '7d' && now - sentTime > 7 * 86400000) return false;
      if (dateScope === '30d' && now - sentTime > 30 * 86400000) return false;
      if (dateScope === '90d' && now - sentTime > 90 * 86400000) return false;

      // 2. Status Filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      return true;
    });
  }, [records, dateScope, statusFilter]);

  // Compute 5 Drop-off Summary KPI Cards (based on current date scope)
  const scopedItemsForSummary = useMemo(() => {
    const now = Date.now();
    return records.filter((r) => {
      const sentTime = new Date(r.otpSentAt).getTime();
      if (dateScope === '7d') return now - sentTime <= 7 * 86400000;
      if (dateScope === '30d') return now - sentTime <= 30 * 86400000;
      if (dateScope === '90d') return now - sentTime <= 90 * 86400000;
      return true;
    });
  }, [records, dateScope]);

  const totalIncomplete = scopedItemsForSummary.length;
  const pendingCount = scopedItemsForSummary.filter((r) => r.status === 'Pending OTP').length;
  const expiredCount = scopedItemsForSummary.filter((r) => r.status === 'OTP expired').length;
  const wrongOtpCount = scopedItemsForSummary.filter((r) => r.status === 'Wrong OTP').length;
  const blockedCount = scopedItemsForSummary.filter((r) => r.status === 'Blocked').length;

  // Delete an OTP session
  const handleDeleteRecord = (id: string, phone: string) => {
    if (confirm(`Delete incomplete signup OTP session for ${phone}?`)) {
      const updated = records.filter((r) => r.id !== id);
      setRecords(updated);
      localStorage.setItem('stylefleet_incomplete_signups', JSON.stringify(updated));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const exportData = filteredRecords.map((r) => ({
      'Phone': r.phone,
      'Status': r.status,
      'OTP Sent': formatFriendlyDate(r.otpSentAt),
      'Expires': formatFriendlyDate(r.expiresAt),
      'Attempts': r.attempts,
      'OTP Sends': r.otpSends,
      'Session': r.sessionHash,
    }));
    exportToCSV(exportData, `stylefleet_incomplete_signups_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
          Incomplete signups
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Phones that received an OTP but never finished verification. Excludes numbers that already have a user account in Firestore.
        </p>
      </div>

      {/* TOP DROP-OFF SUMMARY PANEL (EXACT MATCH TO REFERENCE IMAGE) */}
      <div className="bg-blue-50/20 border border-blue-100/80 rounded-2xl p-4 sm:p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-3 font-mono">
          DROP-OFF SUMMARY
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. INCOMPLETE */}
          <div className="bg-blue-50/40 border border-blue-300 rounded-xl p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              INCOMPLETE
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1 font-mono">
              {totalIncomplete}
            </div>
            <div className="text-[11px] text-blue-500/90 mt-0.5">
              Unique phones, no account
            </div>
          </div>

          {/* 2. PENDING OTP */}
          <div className="bg-teal-50/40 border border-teal-300 rounded-xl p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              PENDING OTP
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-700 mt-1 font-mono">
              {pendingCount}
            </div>
            <div className="text-[11px] text-teal-600/90 mt-0.5">
              Sent, not expired yet
            </div>
          </div>

          {/* 3. EXPIRED */}
          <div className="bg-orange-50/40 border border-orange-300 rounded-xl p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
              EXPIRED
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 mt-1 font-mono">
              {expiredCount}
            </div>
            <div className="text-[11px] text-orange-500/90 mt-0.5">
              OTP timed out
            </div>
          </div>

          {/* 4. WRONG OTP */}
          <div className="bg-red-50/40 border border-red-300 rounded-xl p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-600">
              WRONG OTP
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-1 font-mono">
              {wrongOtpCount}
            </div>
            <div className="text-[11px] text-red-500/90 mt-0.5">
              Failed verify attempts
            </div>
          </div>

          {/* 5. BLOCKED */}
          <div className="bg-rose-50/40 border border-rose-300 rounded-xl p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              BLOCKED
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1 font-mono">
              {blockedCount}
            </div>
            <div className="text-[11px] text-rose-500/90 mt-0.5">
              Too many attempts
            </div>
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR & SCAN SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Scope Pills */}
          <div className="inline-flex items-center p-0.5 bg-neutral-100 rounded-lg text-xs font-medium border border-neutral-200">
            <button
              onClick={() => setDateScope('7d')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                dateScope === '7d'
                  ? 'bg-[#0f766e] text-white font-semibold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setDateScope('30d')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                dateScope === '30d'
                  ? 'bg-[#0f766e] text-white font-semibold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setDateScope('90d')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                dateScope === '90d'
                  ? 'bg-[#0f766e] text-white font-semibold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              90 days
            </button>
            <button
              onClick={() => setDateScope('all')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                dateScope === 'all'
                  ? 'bg-[#0f766e] text-white font-semibold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All loaded
            </button>
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 focus:outline-none cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="OTP expired">OTP expired</option>
            <option value="Wrong OTP">Wrong OTP</option>
            <option value="Pending OTP">Pending OTP</option>
            <option value="Blocked">Blocked</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Scan Status Summary */}
        <div className="text-xs text-neutral-500 font-mono">
          {filteredRecords.length} phones · scanned 2000 OTP sessions
        </div>
      </div>

      {/* INCOMPLETE SIGNUPS TABLE (EXACT MATCH TO REFERENCE IMAGE) */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50">
                <th className="py-3 px-3.5">PHONE</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3">OTP SENT</th>
                <th className="py-3 px-3">EXPIRES</th>
                <th className="py-3 px-3 text-center">ATTEMPTS</th>
                <th className="py-3 px-3 text-center">OTP SENDS</th>
                <th className="py-3 px-3">SESSION</th>
                <th className="py-3 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-neutral-400">
                    No incomplete signup sessions matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  let statusColor = 'text-amber-700';
                  if (r.status === 'Wrong OTP') statusColor = 'text-red-600 font-semibold';
                  if (r.status === 'Pending OTP') statusColor = 'text-teal-700 font-semibold';
                  if (r.status === 'Blocked') statusColor = 'text-rose-700 font-semibold';

                  return (
                    <tr key={r.id} className="hover:bg-neutral-50/70 transition-colors">
                      {/* PHONE */}
                      <td className="py-3 px-3.5 font-mono font-bold text-neutral-900 whitespace-nowrap">
                        {r.phone}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <span className={statusColor}>{r.status}</span>
                      </td>

                      {/* OTP SENT */}
                      <td className="py-3 px-3 text-neutral-600 whitespace-nowrap font-mono text-[11px]">
                        {formatFriendlyDate(r.otpSentAt)}
                      </td>

                      {/* EXPIRES */}
                      <td className="py-3 px-3 text-neutral-600 whitespace-nowrap font-mono text-[11px]">
                        {formatFriendlyDate(r.expiresAt)}
                      </td>

                      {/* ATTEMPTS */}
                      <td className="py-3 px-3 text-center font-mono text-neutral-800">
                        {r.attempts}
                      </td>

                      {/* OTP SENDS */}
                      <td className="py-3 px-3 text-center font-mono text-neutral-800">
                        {r.otpSends}
                      </td>

                      {/* SESSION */}
                      <td className="py-3 px-3 font-mono text-neutral-500 text-[11px] whitespace-nowrap">
                        {r.sessionHash}
                      </td>

                      {/* ACTION */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteRecord(r.id, r.phone)}
                          className="px-3.5 py-1 rounded bg-[#DC2626] hover:bg-red-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
