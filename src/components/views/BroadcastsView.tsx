import React, { useState } from 'react';
import {
  Megaphone,
  Send,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Radio,
  Plus,
} from 'lucide-react';
import { KPICard } from '../common/KPICard';
import { StatusBadge } from '../common/StatusBadge';
import { Shop } from '../../types/database';

interface BroadcastsViewProps {
  shops: Shop[];
}

interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  target: string;
  recipientsCount: number;
  sentAt: string;
  status: 'sent' | 'scheduled' | 'draft';
  channel: 'WhatsApp' | 'In-App Banner' | 'Push Notification';
}

export const BroadcastsView: React.FC<BroadcastsViewProps> = ({ shops }) => {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([
    {
      id: 'b-1',
      title: 'Upgrade Reminder: 100 Free Sales Quota',
      message: 'Attention Salon Partners: Free tier covers up to 100 sales invoices. Upgrade to Pro (₹1,499 / 3M) for unlimited billing.',
      target: 'Salons with >80 sales',
      recipientsCount: shops.length,
      sentAt: '2026-10-05 10:30 AM',
      status: 'sent',
      channel: 'In-App Banner',
    },
    {
      id: 'b-2',
      title: 'New Feature Announcement: Daily Closing Summary',
      message: 'Generate your daily salon revenue summary with one tap under Daily Sales Metrics.',
      target: 'All Active Salons',
      recipientsCount: shops.length,
      sentAt: '2026-10-02 04:15 PM',
      status: 'sent',
      channel: 'WhatsApp',
    },
  ]);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newChannel, setNewChannel] = useState<'In-App Banner' | 'WhatsApp' | 'Push Notification'>('In-App Banner');

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    const newBroadcast: BroadcastItem = {
      id: `b-${Date.now()}`,
      title: newTitle,
      message: newMessage,
      target: 'All Active Salons',
      recipientsCount: shops.length,
      sentAt: 'Just now',
      status: 'sent',
      channel: newChannel,
    };

    setBroadcasts([newBroadcast, ...broadcasts]);
    setNewTitle('');
    setNewMessage('');
    setIsComposerOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.08em] text-[#0d9488] uppercase font-mono">
              ENGAGEMENT PLATFORM
            </span>
            <span className="text-neutral-300">•</span>
            <span className="text-[11px] text-neutral-500 font-medium">Salon Network Broadcasts</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">
            Broadcasts
          </h1>
        </div>

        <button
          onClick={() => setIsComposerOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Broadcast</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Total Broadcasts"
          value={broadcasts.length}
          subtitle="Sent campaigns"
          icon={Megaphone}
          tone="brand"
        />
        <KPICard
          title="Audience Reach"
          value={`${shops.length} Salons`}
          subtitle="Registered partner network"
          icon={Users}
          tone="usage"
        />
        <KPICard
          title="Delivery Success"
          value="99.4%"
          subtitle="Across active sessions"
          icon={CheckCircle2}
          tone="revenue"
        />
        <KPICard
          title="Active Channels"
          value="3"
          subtitle="Banner, WhatsApp, Push"
          icon={Radio}
          tone="trial"
        />
      </div>

      {/* Broadcast Composer Modal */}
      {isComposerOpen && (
        <div className="panel p-5 border-teal-200 bg-teal-50/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#0d9488]" />
              Compose Platform Broadcast
            </h3>
            <button
              onClick={() => setIsComposerOpen(false)}
              className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Campaign Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Quota Notice: Free Tier Expiring Soon"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Message Content
              </label>
              <textarea
                required
                rows={3}
                placeholder="Type your message to salon owners..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-600">Channel:</label>
                {(['In-App Banner', 'WhatsApp', 'Push Notification'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setNewChannel(ch)}
                    className={`px-2.5 py-1 text-xs rounded-md border font-medium cursor-pointer ${
                      newChannel === ch
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Broadcast</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Broadcast History List */}
      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">Broadcast Campaigns History</h3>
          <span className="text-xs text-neutral-500 font-medium">IronDrobe Engagement</span>
        </div>

        <div className="divide-y divide-neutral-100">
          {broadcasts.map((b) => (
            <div key={b.id} className="p-4 hover:bg-neutral-50/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900 text-sm">{b.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    {b.channel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Clock className="w-3 h-3" />
                  <span>{b.sentAt}</span>
                </div>
              </div>
              <p className="text-xs text-neutral-600 mb-2 leading-relaxed">{b.message}</p>
              <div className="flex items-center gap-4 text-[11px] text-neutral-500">
                <span>Audience: <strong>{b.target}</strong></span>
                <span>•</span>
                <span>Reach: <strong>{b.recipientsCount} salons</strong></span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold">Delivered</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
