import React, { useState } from 'react';
import {
  Clock,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Calendar,
  Sparkles,
  Zap,
} from 'lucide-react';
import { KPICard } from '../common/KPICard';
import { StatusBadge } from '../common/StatusBadge';
import { Shop } from '../../types/database';

interface ScheduledPushViewProps {
  shops: Shop[];
}

interface ScheduledRule {
  id: string;
  name: string;
  triggerEvent: string;
  scheduleTime: string;
  targetAudience: string;
  status: 'active' | 'paused';
  messageTemplate: string;
}

export const ScheduledPushView: React.FC<ScheduledPushViewProps> = ({ shops }) => {
  const [rules, setRules] = useState<ScheduledRule[]>([
    {
      id: 'rule-1',
      name: 'Quota Alert: 80% Milestone Notice',
      triggerEvent: 'Salon completes 80 of 100 free sales',
      scheduleTime: 'Instant Event Trigger',
      targetAudience: 'Free Tier Salons reaching 80 bills',
      status: 'active',
      messageTemplate: 'You have completed 80 sales on your StyleFleet free tier! Only 20 free sales left before Pro upgrade is required.',
    },
    {
      id: 'rule-2',
      name: 'Daily Register Closing Summary',
      triggerEvent: 'Daily Store Closing Schedule',
      scheduleTime: 'Every day at 09:30 PM',
      targetAudience: 'All Active Salons',
      status: 'active',
      messageTemplate: 'Your daily sales report is ready. Tap to view your total bills and revenue for today.',
    },
    {
      id: 'rule-3',
      name: 'Subscription Plan Expiry Reminder',
      triggerEvent: '3 Days Before Pro Subscription Ends',
      scheduleTime: '09:00 AM (T-3 Days)',
      targetAudience: 'Pro Subscribed Salons',
      status: 'active',
      messageTemplate: 'Your StyleFleet Pro subscription renews soon. Maintain uninterrupted access to all salon features.',
    },
    {
      id: 'rule-4',
      name: 'Weekly Appointment Summary',
      triggerEvent: 'Weekly Performance Digest',
      scheduleTime: 'Every Monday at 08:00 AM',
      targetAudience: 'All Active Salons',
      status: 'paused',
      messageTemplate: 'Here is your weekly upcoming appointments breakdown for your styling team.',
    },
  ]);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r))
    );
  };

  const activeCount = rules.filter((r) => r.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.08em] text-[#3B82F6] uppercase font-mono">
              AUTOMATION ENGINE
            </span>
            <span className="text-neutral-300">•</span>
            <span className="text-[11px] text-neutral-500 font-medium">Scheduled & Event-Triggered Notifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">
            Scheduled Push
          </h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Active Automations"
          value={activeCount}
          subtitle={`Out of ${rules.length} configured rules`}
          icon={Zap}
          tone="revenue"
        />
        <KPICard
          title="Monitored Salons"
          value={shops.length}
          subtitle="Partner accounts"
          icon={Bell}
          tone="usage"
        />
        <KPICard
          title="100 Free Quota Rule"
          value="Enabled"
          subtitle="Fires on 80/100 sales"
          icon={Sparkles}
          tone="brand"
        />
        <KPICard
          title="Delivery Channel"
          value="Push & Banner"
          subtitle="Real-time web & mobile"
          icon={Clock}
          tone="trial"
        />
      </div>

      {/* Scheduled Rules Table */}
      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">Scheduled Trigger Rules</h3>
          <span className="text-xs text-neutral-500 font-medium">Auto Execution</span>
        </div>

        <div className="divide-y divide-neutral-100">
          {rules.map((r) => (
            <div key={r.id} className="p-4 sm:p-5 hover:bg-neutral-50/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-neutral-900">{r.name}</h4>
                    <StatusBadge
                      status={r.status === 'active' ? 'active' : 'pending'}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {r.scheduleTime}
                    </span>
                    <span>•</span>
                    <span>Audience: <strong>{r.targetAudience}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => toggleRule(r.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    r.status === 'active'
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  {r.status === 'active' ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Enable</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/70 text-xs text-neutral-700 font-mono mt-3">
                "{r.messageTemplate}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
