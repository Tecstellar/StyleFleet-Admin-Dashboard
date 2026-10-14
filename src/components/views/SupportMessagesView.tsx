import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Shield,
  AlertCircle,
  Copy,
  Check,
  CornerDownRight,
  Store,
  Phone,
  MessageCircle,
  RefreshCw,
  Calendar,
  Filter,
} from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { submitSupportMessageAnswer, updateSupportMessageStatus } from '../../services/supportService';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime } from '../../utils/dateUtils';
import { SupportMessage, SupportMessageAnswer } from '../../types/database';

interface SupportMessagesViewProps {
  messages: SupportMessage[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const SupportMessagesView: React.FC<SupportMessagesViewProps> = ({
  messages,
  loading = false,
  onRefresh,
}) => {
  const { dateRange } = useDateFilter();
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [applyDateFilter, setApplyDateFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Answer Form State
  const [answerText, setAnswerText] = useState('');
  const [adminName, setAdminName] = useState('StyleFleet HQ Command');
  const [responseStatus, setResponseStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('resolved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRlsBlocked, setIsRlsBlocked] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const counts = useMemo(() => {
    const base = applyDateFilter ? filterByDateRange(messages, 'created_at', dateRange) : messages;
    return {
      all: base.length,
      open: base.filter((m) => m.status === 'open').length,
      in_progress: base.filter((m) => m.status === 'in_progress').length,
      resolved: base.filter((m) => m.status === 'resolved').length,
      closed: base.filter((m) => m.status === 'closed').length,
      totalAllTime: messages.length,
      dateFilteredCount: filterByDateRange(messages, 'created_at', dateRange).length,
    };
  }, [messages, applyDateFilter, dateRange]);

  const filteredMessages = useMemo(() => {
    let result = applyDateFilter ? filterByDateRange(messages, 'created_at', dateRange) : [...messages];
    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }
    return result;
  }, [messages, applyDateFilter, dateRange, statusFilter]);

  const handleOpenModal = (m: SupportMessage) => {
    setSelectedMessage(m);
    setAnswerText('');
    setSubmitError(null);
    setIsRlsBlocked(false);
    setResponseStatus(m.status === 'open' ? 'in_progress' : m.status);
  };

  const handleSendAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !answerText.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setIsRlsBlocked(false);

    const res = await submitSupportMessageAnswer({
      message_id: selectedMessage.id,
      shop_id: selectedMessage.shop_id,
      answer: answerText,
      admin_name: adminName,
      newStatus: responseStatus,
    });

    setIsSubmitting(false);

    if (res.data) {
      // Append answer locally
      const updatedAnswers = [...(selectedMessage.answers || []), res.data];
      setSelectedMessage({
        ...selectedMessage,
        status: responseStatus,
        answers: updatedAnswers,
      });
      setAnswerText('');
      onRefresh?.();
    } else {
      setSubmitError(res.error || 'Failed to record answer in Supabase');
      if (res.isRlsBlocked) {
        setIsRlsBlocked(true);
      }
    }
  };

  const handleStatusChangeOnly = async (newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    if (!selectedMessage) return;
    const res = await updateSupportMessageStatus(selectedMessage.id, newStatus);
    if (res.success) {
      setSelectedMessage((prev) => (prev ? { ...prev, status: newStatus } : null));
      onRefresh?.();
    } else {
      alert(`Error updating ticket status: ${res.error}`);
    }
  };

  const copySqlSnippet = () => {
    const sql = `CREATE POLICY "allow_support_message_answers_all" ON public.support_message_answers FOR ALL USING (true) WITH CHECK (true);`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const columns: Column<SupportMessage>[] = [
    {
      key: 'id',
      header: 'Ticket ID',
      render: (m) => (
        <span className="font-mono text-xs text-neutral-900 font-semibold">
          #{m.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'salon',
      header: 'Salon / Sender',
      render: (m) => {
        const phoneDigits = m.contact_info ? m.contact_info.replace(/\D/g, '').slice(-10) : '';
        return (
          <div>
            <div className="font-semibold text-neutral-900 text-xs">
              {m.shop?.name || m.shop_name || 'Direct Mobile App User'}
            </div>
            {m.contact_info && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-neutral-500 font-mono">{m.contact_info}</span>
                {phoneDigits && (
                  <a
                    href={`https://wa.me/91${phoneDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                    title="Direct WhatsApp Chat"
                  >
                    <MessageCircle className="w-2.5 h-2.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'message',
      header: 'Message Content',
      render: (m) => (
        <div className="text-neutral-800 text-xs truncate max-w-sm font-medium">
          {m.message}
        </div>
      ),
    },
    {
      key: 'answers',
      header: 'Replies',
      render: (m) => {
        const count = m.answers?.length || 0;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${
              count > 0
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-neutral-100 text-neutral-500 border-neutral-200'
            }`}
          >
            {count} {count === 1 ? 'reply' : 'replies'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => <StatusBadge status={m.status} />,
    },
    {
      key: 'created_at',
      header: 'Submitted',
      render: (m) => (
        <span className="font-mono text-xs text-neutral-500">
          {formatDateTime(m.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (m) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenModal(m);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-neutral-200 bg-white text-neutral-800 hover:border-black hover:text-black shadow-2xs transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-neutral-800" />
          <span>Reply &amp; Manage</span>
        </button>
      ),
      sortable: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                  Support Messages &amp; Help Desk
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 font-mono">
                  {counts.totalAllTime} Total
                </span>
                {counts.open > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 font-mono animate-pulse">
                    {counts.open} Open
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Realtime salon communications and client support inquiries.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Date Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter Toggle Mode */}
          <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-medium">
            <button
              onClick={() => setApplyDateFilter(false)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                !applyDateFilter
                  ? 'bg-white text-neutral-900 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Time ({counts.totalAllTime})
            </button>
            <button
              onClick={() => setApplyDateFilter(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                applyDateFilter
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{dateRange.label} ({counts.dateFilteredCount})</span>
            </button>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold cursor-pointer shadow-2xs transition-all disabled:opacity-50"
              title="Refresh support tickets from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin text-blue-600' : 'text-neutral-500'}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs by Ticket Status */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs overflow-x-auto">
        {(
          [
            { id: 'all', label: 'All', count: counts.all },
            { id: 'open', label: 'Open', count: counts.open },
            { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
            { id: 'resolved', label: 'Resolved', count: counts.resolved },
            { id: 'closed', label: 'Closed', count: counts.closed },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-[#111827] text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-neutral-200/80 text-neutral-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Date Filter Notice when active period has 0 matches */}
      {applyDateFilter && filteredMessages.length === 0 && messages.length > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              0 tickets submitted within the active date range ({dateRange.label}). There are {messages.length} tickets recorded across all time.
            </span>
          </div>
          <button
            onClick={() => setApplyDateFilter(false)}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            View All Time ({messages.length})
          </button>
        </div>
      )}

      {/* Supabase RLS Notice Banner */}
      {messages.length === 0 && !loading && (
        <div className="p-4 rounded-2xl border border-neutral-200 border-l-4 border-l-black bg-neutral-50 text-xs text-neutral-800 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <AlertCircle className="w-4 h-4 text-neutral-900 shrink-0" />
              <span>Row Level Security (RLS) Notice — Why Supabase rows might be hidden</span>
            </div>
            <button
              onClick={() => {
                const sql = `-- Allow read and write for support messages and replies:
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_support_messages_all" ON public.support_messages;
CREATE POLICY "allow_support_messages_all" ON public.support_messages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.support_message_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_support_message_answers_all" ON public.support_message_answers;
CREATE POLICY "allow_support_message_answers_all" ON public.support_message_answers FOR ALL USING (true) WITH CHECK (true);`;
                navigator.clipboard.writeText(sql);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2500);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black hover:bg-neutral-800 text-white font-semibold transition-colors text-xs shrink-0 cursor-pointer shadow-xs"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL Copied!' : 'Copy Supabase SQL Fix'}</span>
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-600">
            If you have existing tickets in your Supabase Table Editor that do not appear here, Postgres Row-Level Security is currently restricting access. Run this script in your Supabase SQL Editor to enable full access:
          </p>
          <pre className="p-3 rounded-xl bg-white border border-neutral-300 font-mono text-[10.5px] text-neutral-900 overflow-x-auto leading-relaxed">
{`-- Allow read and write for support messages and replies:
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_support_messages_all" ON public.support_messages;
CREATE POLICY "allow_support_messages_all" ON public.support_messages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.support_message_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_support_message_answers_all" ON public.support_message_answers;
CREATE POLICY "allow_support_message_answers_all" ON public.support_message_answers FOR ALL USING (true) WITH CHECK (true);`}
          </pre>
        </div>
      )}

      {/* Messages Table */}
      <DataTable
        columns={columns}
        data={filteredMessages}
        loading={loading}
        emptyTitle="No support messages found"
        emptyDescription={
          messages.length === 0
            ? 'The support inbox is currently clear with 0 pending tickets.'
            : 'No support messages match the selected status filter.'
        }
        searchPlaceholder="Search message content, salon, phone, ticket ID..."
        searchFields={['message', 'contact_info', 'id', 'shop_name']}
        defaultSortField="created_at"
        defaultSortOrder="desc"
        onRowClick={(m) => handleOpenModal(m)}
      />

      {/* Thread & Reply Modal */}
      <Modal
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        title={`Support Ticket #${selectedMessage?.id.slice(0, 8)}`}
        subtitle={`Submitted on ${formatDateTime(selectedMessage?.created_at)}`}
        maxWidth="2xl"
      >
        {selectedMessage && (
          <div className="space-y-6">
            {/* Ticket Metadata Bar */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-neutral-800" />
                <span className="font-semibold text-neutral-900">
                  {selectedMessage.shop?.name || 'Direct Mobile User'}
                </span>
                {selectedMessage.contact_info && (
                  <span className="font-mono text-neutral-500">({selectedMessage.contact_info})</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Status:</span>
                <StatusBadge status={selectedMessage.status} />
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Ticket Conversation Thread
              </h4>

              {/* 1. Client Question Bubble */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-white text-xs space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                  <div className="flex items-center gap-1.5 font-medium text-neutral-900">
                    <User className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Salon Inquiry</span>
                  </div>
                  <span className="font-mono">{formatDateTime(selectedMessage.created_at)}</span>
                </div>
                <div className="text-neutral-700 text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>

              {/* 2. Admin Replies from support_message_answers */}
              {selectedMessage.answers && selectedMessage.answers.length > 0 ? (
                selectedMessage.answers.map((ans) => (
                  <div
                    key={ans.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-100 text-xs space-y-2 ml-4 sm:ml-8 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                        <Shield className="w-3.5 h-3.5 text-black" />
                        <span>{ans.admin_name || 'Super Admin'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-500">{formatDateTime(ans.created_at)}</span>
                        {ans.is_read ? (
                          <span className="text-[10px] text-neutral-700 font-mono font-medium">Read by Salon</span>
                        ) : (
                          <span className="text-[10px] text-neutral-500 font-mono">Delivered</span>
                        )}
                      </div>
                    </div>
                    <div className="text-neutral-900 text-sm whitespace-pre-wrap leading-relaxed">
                      {ans.answer}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-neutral-200 text-center text-xs text-neutral-500 bg-white">
                  No replies recorded yet.
                </div>
              )}
            </div>

            {/* Error Notification if RLS Policy Blocks Insert */}
            {isRlsBlocked && (
              <div className="p-4 rounded-xl border border-neutral-300 bg-neutral-50 text-xs text-neutral-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-neutral-900">
                  <AlertCircle className="w-4 h-4 text-neutral-800" />
                  <span>Row Level Security (RLS) Policy Required</span>
                </div>
                <p className="leading-relaxed text-[11px] text-neutral-600">
                  Supabase returned error 42501 (violates row-level security policy for table <code className="font-mono text-neutral-900 font-semibold">support_message_answers</code>). To allow the admin dashboard to store answers, run this SQL policy in your Supabase SQL editor:
                </p>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-white border border-neutral-300 font-mono text-[11px] text-neutral-900">
                  <span className="truncate">CREATE POLICY "allow_support_message_answers_all" ON public.support_message_answers FOR ALL USING (true) WITH CHECK (true);</span>
                  <button
                    onClick={copySqlSnippet}
                    type="button"
                    className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 shrink-0"
                    title="Copy SQL snippet"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {submitError && !isRlsBlocked && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700">
                {submitError}
              </div>
            )}

            {/* 3. Reply Composer Form */}
            <form onSubmit={handleSendAnswer} className="space-y-4 pt-3 border-t border-neutral-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-neutral-900" />
                  <span>Compose Admin Reply</span>
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-500">Mark Ticket As:</span>
                  <select
                    value={responseStatus}
                    onChange={(e) => setResponseStatus(e.target.value as any)}
                    className="py-1 px-2.5 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="open">Open</option>
                  </select>
                </div>
              </div>

              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your official response to this salon inquiry..."
                rows={4}
                required
                className="w-full p-3 text-xs rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors leading-relaxed shadow-xs"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>Responding as:</span>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="py-1 px-2 rounded-lg border border-neutral-200 bg-white text-xs font-medium text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !answerText.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-neutral-800 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'Saving to Supabase...' : 'Send Answer & Store'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
