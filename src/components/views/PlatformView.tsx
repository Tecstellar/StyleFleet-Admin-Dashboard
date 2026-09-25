import React from 'react';
import { Smartphone, Apple, CheckCircle2, AlertCircle } from 'lucide-react';
import { UnavailableBanner } from '../common/UnavailableBanner';

export const PlatformView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-[#D9A441]" />
          <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
            Platform &amp; Device Ecosystem
          </h1>
        </div>
        <p className="text-xs text-neutral-400 light:text-slate-500 mt-0.5">
          Real-time operating system breakdown, hardware fragmentation, and device support.
        </p>
      </div>

      <UnavailableBanner
        title="Data unavailable — required source field/table not found."
        sourceTable="public.devices / public.telemetry"
        message="Device installation metrics and platform telemetry are not currently stored in the Supabase schema."
        details="Tables 'public.devices' and 'public.telemetry' were not found in the public database schema."
      />

      {/* Target Platforms from verified codebase */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              🤖
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white light:text-slate-900">
                Android Ecosystem
              </h3>
              <p className="text-xs text-neutral-400 light:text-slate-500">
                Primary production mobile app
              </p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-neutral-300 light:text-slate-700">
            <div className="flex justify-between">
              <span className="text-neutral-400">Framework:</span>
              <span className="font-mono">React Native / Expo SDK 52</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Architecture:</span>
              <span className="font-mono">Android Gradle / Kotlin</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">SMS Verification:</span>
              <span className="font-mono">2Factor SMS Integration</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-[#2D3154] light:border-slate-200 bg-[#1E2136] light:bg-white space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white light:text-slate-900">
                iOS Ecosystem
              </h3>
              <p className="text-xs text-neutral-400 light:text-slate-500">
                Apple iPhone &amp; iPad client
              </p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-neutral-300 light:text-slate-700">
            <div className="flex justify-between">
              <span className="text-neutral-400">Framework:</span>
              <span className="font-mono">React Native / Xcode Workspace</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Target OS:</span>
              <span className="font-mono">iOS 16.0+</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Biometrics:</span>
              <span className="font-mono">Face ID / Touch ID Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
