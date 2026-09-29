import React from 'react';
import { GitBranch, Smartphone, Info, Layers, CheckCircle } from 'lucide-react';
import { UnavailableBanner } from '../common/UnavailableBanner';

export const AppVersionsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[#D4AF37]" />
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            App Version Fleet Management
          </h1>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
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
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-semibold text-neutral-900">
          Detected StyleFleet Client Applications in Workspace
        </h3>
        <p className="text-xs text-neutral-600 leading-relaxed">
          The following client applications were identified from local workspace source code:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-900">StyleFleet Android</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Client
              </span>
            </div>
            <div className="text-neutral-500 text-[11px] font-mono">
              Target: Android 14+ / React Native 0.76 / Expo SDK 52
            </div>
            <div className="text-neutral-500 text-[11px]">
              Client: <span className="font-mono text-neutral-900">StyleFleet Android</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAF7EE] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-900">StyleFleet iOS</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white text-[#B8860B] border border-[#E8DEC4]">
                In Repository
              </span>
            </div>
            <div className="text-neutral-600 text-[11px] font-mono">
              Target: iOS 16+ / Xcode 16 Workspace
            </div>
            <div className="text-neutral-600 text-[11px]">
              Directory: <span className="font-mono text-neutral-900">stylefleet-ios</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
