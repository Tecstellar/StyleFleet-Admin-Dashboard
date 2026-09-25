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

  // Answer Form State
  const [answerText, setAnswerText] = useState('');
  const [adminName, setAdminName] = useState('StyleFleet HQ Command');
  const [responseStatus, setResponseStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('resolved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRlsBlocked, setIsRlsBlocked] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const filteredMessages = useMemo(() => {
    let result = filterByDateRange(messages, 'created_at', dateRange);
    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }
    return result;
  }, [messages, dateRange, statusFilter]);

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
        <span className="font-mono text-xs text-[#D9A441] font-semibold">
          #{m.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'salon',
      header: 'Salon / Sender',
      render: (m) => (
        <div>
          <div className="font-semibold text-white light:text-slate-900">
            {m.shop?.name || 'Direct Mobile App User'}
          </div>
          {m.contact_info && (
            <div className="text-[11px] text-neutral-400 light:text-slate-500 font-mono">{m.contact_info}</div>
          )}
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message Content',
      render: (m) => (
        <div className="text-neutral-300 light:text-slate-700 truncate max-w-sm">
          {m.message}
        </div>
      ),
    },
    {
      key: 'answers',
      header: 'Answers',
      render: (m) => {
        const count = m.answers?.length || 0;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${
              count > 0
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-[#2D3154]/50 text-neutral-400 border-[#2D3154]'
            }`}
          >
            {count} reply{count === 1 ? '' : 'ies'}
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
        <span className="font-mono text-xs text-neutral-400">
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
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-[#D4AF37]/50 bg-[#161826] light:bg-slate-50 text-[#D9A441] hover:bg-[#D9A441] hover:text-[#161826] transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Reply &amp; Manage</span>
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
            <MessageSquare className="w-5 h-5 text-[#D9A441]" />
            <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
              Support Messages &amp; Help Desk
            </h1>
          </div>
          <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
            Realtime salon communications. Replies are recorded into Supabase table <code className="text-[#D9A441] font-mono">public.support_message_answers</code>.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#161826] border border-[#2D3154] text-xs">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#161826] font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Supabase RLS Notice Banner */}
      {messages.length === 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
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
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold border border-amber-500/40 transition-colors text-xs shrink-0"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL Copied!' : 'Copy Supabase SQL Fix'}</span>
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-200/90">
            If you have existing tickets in your Supabase Table Editor that do not appear here, Postgres Row-Level Security is currently restricting access. Run this script in your Supabase SQL Editor to enable full access:
          </p>
          <pre className="p-3 rounded-xl bg-[#161826] border border-amber-500/30 font-mono text-[10.5px] text-[#D9A441] overflow-x-auto leading-relaxed">
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
            : 'No support messages match the selected status filter or date range.'
        }
        searchPlaceholder="Search message content, sender, ticket ID..."
        searchFields={['message', 'contact_info', 'id']}
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
            <div className="p-4 rounded-xl border border-[#2D3154] light:border-slate-200 bg-[#161826]/70 light:bg-slate-50 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#D9A441]" />
                <span className="font-semibold text-white light:text-slate-900">
                  {selectedMessage.shop?.name || 'Direct Mobile User'}
                </span>
                {selectedMessage.contact_info && (
                  <span className="font-mono text-neutral-400">({selectedMessage.contact_info})</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Status:</span>
                <StatusBadge status={selectedMessage.status} />
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 light:text-slate-500">
                Ticket Conversation Thread
              </h4>

              {/* 1. Client Question Bubble */}
              <div className="p-4 rounded-xl border border-[#2D3154] bg-[#161826] text-xs space-y-2">
                <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                  <div className="flex items-center gap-1.5 font-medium text-white light:text-slate-900">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Salon Inquiry</span>
                  </div>
                  <span className="font-mono">{formatDateTime(selectedMessage.created_at)}</span>
                </div>
                <div className="text-neutral-200 light:text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>

              {/* 2. Admin Replies from support_message_answers */}
              {selectedMessage.answers && selectedMessage.answers.length > 0 ? (
                selectedMessage.answers.map((ans) => (
                  <div
                    key={ans.id}
                    className="p-4 rounded-xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#1E2136] to-[#1E2136]/60 light:from-[#FCF9EE] light:to-white text-xs space-y-2 ml-4 sm:ml-8 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold text-[#D9A441]">
                        <Shield className="w-3.5 h-3.5" />
                        <span>{ans.admin_name || 'Super Admin'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-400">{formatDateTime(ans.created_at)}</span>
                        {ans.is_read ? (
                          <span className="text-[10px] text-emerald-400 font-mono">Read by Salon</span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">Delivered</span>
                        )}
                      </div>
                    </div>
                    <div className="text-white light:text-slate-900 text-sm whitespace-pre-wrap leading-relaxed">
                      {ans.answer}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-[#2D3154] text-center text-xs text-neutral-400">
                  No replies recorded in <code className="text-[#D9A441] font-mono">public.support_message_answers</code> yet.
                </div>
              )}
            </div>

            {/* Error Notification if RLS Policy Blocks Insert */}
            {isRlsBlocked && (
              <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Row Level Security (RLS) Policy Required</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Supabase returned error 42501 (violates row-level security policy for table <code className="font-mono text-amber-300">support_message_answers</code>). To allow the admin dashboard to store answers, run this SQL policy in your Supabase SQL editor:
                </p>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-[#161826] border border-amber-500/30 font-mono text-[11px] text-[#D9A441]">
                  <span className="truncate">CREATE POLICY "allow_support_message_answers_all" ON public.support_message_answers FOR ALL USING (true) WITH CHECK (true);</span>
                  <button
                    onClick={copySqlSnippet}
                    type="button"
                    className="p-1 rounded bg-[#2D3154] hover:bg-[#393E6B] text-white shrink-0"
                    title="Copy SQL snippet"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {submitError && !isRlsBlocked && (
              <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-300">
                {submitError}
              </div>
            )}

            {/* 3. Reply Composer Form */}
            <form onSubmit={handleSendAnswer} className="space-y-4 pt-3 border-t border-[#2D3154]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-white light:text-slate-900 flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-[#D9A441]" />
                  <span>Compose Admin Reply</span>
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-400">Mark Ticket As:</span>
                  <select
                    value={responseStatus}
                    onChange={(e) => setResponseStatus(e.target.value as any)}
                    className="py-1 px-2.5 rounded-lg border border-[#2D3154] bg-[#161826] text-xs font-semibold text-white focus:outline-none focus:border-[#D9A441]"
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
                className="w-full p-3 text-xs rounded-xl border border-[#2D3154] light:border-slate-300 bg-[#161826] light:bg-white text-white light:text-slate-900 placeholder:text-neutral-500 focus:outline-none focus:border-[#D9A441] transition-colors leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span>Responding as:</span>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="py-1 px-2 rounded-lg border border-[#2D3154] bg-[#161826] text-xs font-medium text-white focus:outline-none focus:border-[#D9A441]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !answerText.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#161826] hover:brightness-110 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
