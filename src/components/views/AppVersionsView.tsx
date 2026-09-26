import React from 'react';
import { GitBranch, Smartphone, Info, Layers, CheckCircle } from 'lucide-react';
import { UnavailableBanner } from '../common/UnavailableBanner';

export const AppVersionsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[#D9A441]" />
          <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
            App Version Fleet Management
          </h1>
        </div>
        <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
          Monitoring StyleFleet client version adoption, deprecation statuses, and rollout metrics.
        </p>
      </div>

      <UnavailableBanner
        title="Data unavailable — required source field/table not found."
        sourceTable="public.app_versions"
        message="App version tracking table (public.app_versions) is not currently configured in the Supabase schema."
        details="Table 'public.app_versions' returned HTTP 404 from Supabase REST API."
      />

      {/* Discovered Client Build Specification */}
      <div className="rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-white light:text-slate-900">
          Detected StyleFleet Client Applications in Workspace
        </h3>
        <p className="text-xs text-neutral-300 light:text-slate-600 leading-relaxed">
          The following client applications were identified from local workspace source code:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[#2D3154] bg-[#161826]/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">StyleFleet Android</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Active Client
              </span>
            </div>
            <div className="text-neutral-400 text-[11px] font-mono">
              Target: Android 14+ / React Native 0.76 / Expo SDK 52
            </div>
            <div className="text-neutral-400 text-[11px]">
              Client: <span className="font-mono text-white">StyleFleet Android</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#2D3154] bg-[#161826]/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">StyleFleet iOS</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
                In Repository
              </span>
            </div>
            <div className="text-neutral-400 text-[11px] font-mono">
              Target: iOS 16+ / Xcode 16 Workspace
            </div>
            <div className="text-neutral-400 text-[11px]">
              Directory: <span className="font-mono text-white">stylefleet-ios</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
