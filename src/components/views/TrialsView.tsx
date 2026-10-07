import React from 'react';
import { Sparkles } from 'lucide-react';
import { UnavailableBanner } from '../common/UnavailableBanner';

export const TrialsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-neutral-900" />
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Trial &amp; Subscription Monitoring
          </h1>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
          Tracking trial period starts, expirations, and conversion rates.
        </p>
      </div>

      <UnavailableBanner
        title="Data unavailable — required source field/table not found."
        sourceTable="public.trials / public.subscriptions"
        message="Trial subscription tracking is not configured in the connected Supabase database. Per Rule 1, no mock trial periods or synthetic conversion rates will be fabricated."
        details="Table 'public.trials' returned 404 (PGRST205) from Supabase REST API."
      />

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3 shadow-xs">
        <h3 className="text-sm font-semibold text-neutral-900">
          Required Trial Schema Specification
        </h3>
        <p className="text-xs text-neutral-600 leading-relaxed">
          To monitor trial durations and conversion funnels, add the following fields or a dedicated table:
        </p>
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-200 space-y-1">
          <div><span className="text-white font-bold">ALTER TABLE</span> public.shops <span className="text-white font-bold">ADD COLUMN IF NOT EXISTS</span> trial_starts_at TIMESTAMPTZ;</div>
          <div><span className="text-white font-bold">ALTER TABLE</span> public.shops <span className="text-white font-bold">ADD COLUMN IF NOT EXISTS</span> trial_ends_at TIMESTAMPTZ;</div>
          <div><span className="text-white font-bold">ALTER TABLE</span> public.shops <span className="text-white font-bold">ADD COLUMN IF NOT EXISTS</span> subscription_status TEXT DEFAULT 'trial';</div>
        </div>
      </div>
    </div>
  );
};
