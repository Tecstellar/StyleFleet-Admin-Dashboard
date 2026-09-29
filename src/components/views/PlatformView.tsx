import React from 'react';
import { Smartphone, Apple, CheckCircle2, AlertCircle } from 'lucide-react';
import { UnavailableBanner } from '../common/UnavailableBanner';

export const PlatformView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-[#D4AF37]" />
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Platform &amp; Device Ecosystem
          </h1>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
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
        <div className="p-5 rounded-2xl border border-[#E5E7EB] bg-white space-y-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold text-sm">
              🤖
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Android Ecosystem
              </h3>
              <p className="text-xs text-neutral-500">
                Primary production mobile app
              </p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-neutral-700">
            <div className="flex justify-between">
              <span className="text-neutral-500">Framework:</span>
              <span className="font-mono text-neutral-900">React Native / Expo SDK 52</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Architecture:</span>
              <span className="font-mono text-neutral-900">Android Gradle / Kotlin</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">SMS Verification:</span>
              <span className="font-mono text-neutral-900">2Factor SMS Integration</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-[#E5E7EB] bg-white space-y-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FAF7EE] text-[#B8860B] border border-[#E8DEC4] flex items-center justify-center font-bold text-sm">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                iOS Ecosystem
              </h3>
              <p className="text-xs text-neutral-500">
                Apple iPhone &amp; iPad client
              </p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-neutral-700">
            <div className="flex justify-between">
              <span className="text-neutral-500">Framework:</span>
              <span className="font-mono text-neutral-900">React Native / Xcode Workspace</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Target OS:</span>
              <span className="font-mono text-neutral-900">iOS 16.0+</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Biometrics:</span>
              <span className="font-mono text-neutral-900">Face ID / Touch ID Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
