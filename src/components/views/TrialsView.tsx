import React from 'react';
import { Sparkles, Calendar, Clock, Database, AlertCircle } from 'lucide-react';
import { UnavailableBanner } from '../common/UnavailableBanner';

export const TrialsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#D9A441]" />
          <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
            Trial &amp; Subscription Monitoring
          </h1>
        </div>
        <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
          Tracking trial period starts, expirations, and conversion rates.
        </p>
      </div>

      <UnavailableBanner
        title="Data unavailable — required source field/table not found."
        sourceTable="public.trials / public.subscriptions"
        message="Trial subscription tracking is not configured in the connected Supabase database. Per Rule 1, no mock trial periods or synthetic conversion rates will be fabricated."
        details="Table 'public.trials' returned 404 (PGRST205) from Supabase REST API."
      />

      <div className="rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-6 space-y-3 shadow-sm">
        <h3 className="text-sm font-semibold text-white light:text-slate-900">
          Required Trial Schema Specification
        </h3>
        <p className="text-xs text-neutral-300 light:text-slate-600 leading-relaxed">
          To monitor trial durations and conversion funnels, add the following fields or a dedicated table:
        </p>
        <div className="p-4 rounded-xl bg-[#161826] border border-[#2D3154] text-xs font-mono text-neutral-300 space-y-1">
          <div><span className="text-[#D9A441]">ALTER TABLE</span> public.shops <span className="text-[#D9A441]">ADD COLUMN IF NOT EXISTS</span> trial_starts_at TIMESTAMPTZ;</div>
          <div><span className="text-[#D9A441]">ALTER TABLE</span> public.shops <span className="text-[#D9A441]">ADD COLUMN IF NOT EXISTS</span> trial_ends_at TIMESTAMPTZ;</div>
          <div><span className="text-[#D9A441]">ALTER TABLE</span> public.shops <span className="text-[#D9A441]">ADD COLUMN IF NOT EXISTS</span> subscription_status TEXT DEFAULT 'trial';</div>
        </div>
      </div>
    </div>
  );
};
